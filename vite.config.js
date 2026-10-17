import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

function apiDevServerPlugin() {
  return {
    name: 'api-dev-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/chat')) {
          try {
            const { handleChatRequest } = await import('./api/chat-handler.js');
            await handleChatRequest(req, res);
          } catch (err) {
            console.error('API dev server error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
          }
          return;
        }

        if (req.url && req.url.startsWith('/api/tts')) {
          try {
            const { handleTtsRequest } = await import('./api/tts-handler.js');
            await handleTtsRequest(req, res);
          } catch (err) {
            console.error('TTS dev server error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ ok: false, error: 'Internal Server Error' }));
          }
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load server-side environment variables from .env or .env.local without exposing to client bundle
  const env = loadEnv(mode, process.cwd(), '');
  if (env.GROQ_API_KEY) process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  if (env.GROQ_MODEL) process.env.GROQ_MODEL = env.GROQ_MODEL;
  if (env.GEMINI_API_KEY) process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  if (env.GEMINI_MODEL) process.env.GEMINI_MODEL = env.GEMINI_MODEL;
  if (env.OPENAI_API_KEY) process.env.OPENAI_API_KEY = env.OPENAI_API_KEY;
  if (env.OPENAI_MODEL) process.env.OPENAI_MODEL = env.OPENAI_MODEL;
  if (env.OPENAI_BASE_URL) process.env.OPENAI_BASE_URL = env.OPENAI_BASE_URL;
  if (env.ELEVENLABS_API_KEY) process.env.ELEVENLABS_API_KEY = env.ELEVENLABS_API_KEY;
  if (env.ELEVENLABS_VOICE_ID) process.env.ELEVENLABS_VOICE_ID = env.ELEVENLABS_VOICE_ID;
  if (env.ELEVENLABS_MODEL_ID) process.env.ELEVENLABS_MODEL_ID = env.ELEVENLABS_MODEL_ID;

  return {
    plugins: [react(), apiDevServerPlugin()],
    resolve: {
      dedupe: ['three']
    }
  };
});
