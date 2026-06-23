require("dotenv").config();

const {
    default: makeWASocket,
    useMultiFileAuthState
} = require("@whiskeysockets/baileys");

const { GoogleGenAI } = require("@google/genai");

const {
    addChat,
    getChat
} = require("./memory");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function startBot() {

    const { state, saveCreds } =
        await useMultiFileAuthState("./session");

    const sock = makeWASocket({
        auth: state
    });

    if (!sock.authState.creds.registered) {

        const code =
            await sock.requestPairingCode(
                process.env.PHONE_NUMBER
            );

        console.log("\n");
        console.log("PAIRING CODE:");
        console.log(code);
        console.log("\n");
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on(
        "messages.upsert",
        async ({ messages }) => {

            try {

                const msg = messages[0];

                if (!msg.message) return;

                const jid =
                    msg.key.remoteJid;

                const text =
                    msg.message.conversation ||
                    msg.message.extendedTextMessage?.text;

                if (!text) return;

                const history =
                    getChat(jid);

                let prompt =
                    "Kamu adalah AI assistant yang ramah.\n\n";

                history.forEach(item => {
                    prompt +=
                        `${item.role}: ${item.text}\n`;
                });

                prompt +=
                    `user: ${text}\nassistant:`;

                const result =
                    await ai.models.generateContent({
                        model: "gemini-2.5-flash",
                        contents: prompt
                    });

                const reply =
                    result.text ||
                    "Maaf, aku tidak bisa menjawab.";

                addChat(
                    jid,
                    "user",
                    text
                );

                addChat(
                    jid,
                    "assistant",
                    reply
                );

                await sock.sendMessage(
                    jid,
                    {
                        text: reply
                    }
                );

            } catch (err) {

                console.log(err);

            }

        });

}

startBot();
