require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { AccessToken } = require("livekit-server-sdk");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/get-token", async (req, res) => {
  const { identity, room } = req.query;
  const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity },
  );
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
  });
  const jwt = await at.toJwt();
  res.json({ token: jwt });
});
app.post("/ai-response", async (req, res) => {
  try {
    const { text } = req.body;
    console.log("Usuario dijo:", text);
    const deepseek = await axios.post(
      "https://api.deepseek.com/chat/completions",
      {
        model: "deepseek-chat",
        max_tokens: 80, 
        temperature: 0.5,
        messages: [
          {
            role: "system",
            content: `
        Eres un agente profesional de call center.
        Responde de forma corta, clara y directa.
        Máximo 2 oraciones.
        No des explicaciones largas.
        `,
          },
          { role: "user", content: text },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    const respuesta = deepseek.data.choices[0].message.content;
    console.log("IA responde:", respuesta);
    const tts = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
      {
        text: respuesta,
        model_id: "eleven_multilingual_v2",
      },
      {
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      },
    );
    res.set("Content-Type", "audio/mpeg");
    res.send(tts.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Error procesando IA" });
  }
});

app.listen(3001, () => console.log("🚀 Backend en http://localhost:3001"));
