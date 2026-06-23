import {
  makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  Browsers
} from "@whiskeysockets/baileys"

import { Boom } from "@hapi/boom"
import { GoogleGenAI } from "@google/genai"
import dotenv from "dotenv"

dotenv.config()

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY belum diisi")
}

if (!process.env.OWNER_NUMBER) {
  throw new Error("OWNER_NUMBER belum diisi")
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
})

async function startBot() {

  const { state, saveCreds } =
    await useMultiFileAuthState("./session")

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.macOS("Gemini Bot")
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", async (update) => {

    const {
      connection,
      lastDisconnect
    } = update

    if (
      connection === "connecting" &&
      !sock.authState.creds.registered
    ) {

      try {

        const code =
          await sock.requestPairingCode(
            process.env.OWNER_NUMBER
          )

        console.log("")
        console.log("PAIRING CODE:")
        console.log(code)
        console.log("")

      } catch (e) {
        console.log("Pairing Error:", e)
      }
    }

    if (connection === "open") {
      console.log("✅ WhatsApp Connected")
    }

    if (connection === "close") {

      const shouldReconnect =
        (lastDisconnect?.error instanceof Boom
          ? lastDisconnect.error.output.statusCode
          : 0) !== DisconnectReason.loggedOut

      console.log(
        "Connection Closed:",
        lastDisconnect?.error
      )

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

      await sock.sendPresenceUpdate(
        "composing",
        jid
      )

      const result =
        await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: text
        })

      const reply =
        result.text ||
        "Maaf, saya tidak dapat menjawab."

      await sock.sendMessage(jid, {
        text: reply
      })

    } catch (err) {
      console.error(err)
    }

  })
}

startBot()
