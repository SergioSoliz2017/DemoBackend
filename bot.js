require("dotenv").config();
const { Room, LocalAudioTrack } = require("@livekit/rtc-node");
const axios = require("axios");

async function startBot() {
  const res = await axios.get("http://localhost:3001/get-token", {
    params: { identity: "AI-BOT", room: "callcenter-room" },
  });
  console.log("Bot conectado a sala");
  setTimeout(async () => {
    const respuesta = "Hola, soy tu asistente virtual.";
    const tts = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
      {
        text: respuesta,
        model_id: "eleven_multilingual_v2",
      },
      {
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
        },
        responseType: "arraybuffer",
      },
    );

    console.log("Audio generado (pero aún no se publica correctamente)");
  }, 5000);
  const room = new Room();
  await room.connect(process.env.LIVEKIT_URL, res.data.token);
  console.log("Bot conectado a sala");
  room.on("trackSubscribed", async (track, publication, participant) => {
    if (track.kind === "audio" && participant.identity !== "AI-BOT") {
      console.log("Recibiendo audio del usuario");
      const textoUsuario = "Mensaje simulado desde audio";
      const deepseek = await axios.post(
        "https://api.deepseek.com/chat/completions",
        {
          model: "deepseek-chat",
          messages: [
            { role: "system", content: "Eres un agente de call center." },
            { role: "user", content: textoUsuario },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
          },
        },
      );

      const respuesta = deepseek.data.choices[0].message.content;
      const tts = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
        {
          text: respuesta,
          model_id: "eleven_multilingual_v2",
        },
        {
          headers: {
            "xi-api-key": process.env.ELEVEN_API_KEY,
          },
          responseType: "arraybuffer",
        },
      );
      const audioBuffer = Buffer.from(tts.data);
      const trackAudio = new LocalAudioTrack(audioBuffer);
      await room.localParticipant.publishTrack(trackAudio);
    }
  });
}

startBot();
