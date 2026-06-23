import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  Browsers
} from "@whiskeysockets/baileys"

import { Boom } from "@hapi/boom"
import { GoogleGenAI } from "@google/genai"
import dotenv from "dotenv"

dotenv.config()

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
})

async function startBot() {

  const { state, saveCreds } =
    await useMultiFileAuthState("./session")

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.ubuntu("Railway"),
    printQRInTerminal: false
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async (update) => {

    const { connection, lastDisconnect, qr } = update

    if (
      !sock.authState.creds.registered &&
      (connection === "connecting" || qr)
    ) {

      const code = await sock.requestPairingCode(
        process.env.OWNER_NUMBER
      )

      console.log("")
      console.log("PAIRING CODE:")
      console.log(code)
      console.log("")
    }

    if (connection === "open") {
      console.log("Bot Connected")
    }

    if (connection === "close") {

      const shouldReconnect =
        (lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : 0) !== DisconnectReason.loggedOut

      if (shouldReconnect) {
        startBot()
      }
    }
  })

  sock.ev.on("messages.upsert", async ({ messages }) => {

    try {

      const msg = messages[0]

      if (!msg.message) return
      if (msg.key.fromMe) return

      const jid = msg.key.remoteJid

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text

      if (!text) return

      const result =
        await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: text
        })

      const reply = result.text

      await sock.sendMessage(jid, {
        text: reply
      })

    } catch (err) {
      console.log(err)
    }

  })
}

startBot()
