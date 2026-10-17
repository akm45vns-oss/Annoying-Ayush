# Annoying Ayush 💗

A romantic, playful, mobile-first 3D web game inspired by interactive pet gameplay, featuring a stylized 3D chibi cartoon version of Ayush created as a private gift for his girlfriend.

---

## 🌟 Milestone Features

- **Milestone 1**: 3D character foundation, Three.js / React Three Fiber scene, cozy studio podium, soft lighting, and contact shadows.
- **Milestone 2**: Multi-zone touch reactions (head, cheeks, nose, body, longpress hug), 9 animation states, dynamic bounce physics, and annoyance scaling.
- **Milestone 3**: Web Audio API high-pitch voice recording, audio pitch-shifting, funny chipmunk playback, and real-time amplitude lip-sync mouth movements.
- **Milestone 4**: Romantic personality, 15 categorized dialogue pools, kiss/hug/blush/cuddle interactions, secret 5-tap heart unlock, combo sequence detection, and 100% private local settings.
- **Milestone 5**: **AI Chat & Personality System**:
  - Full conversational chat with Ayush's playful, teasing, and romantic personality.
  - Server-side AI provider adapter (Google Gemini / OpenAI).
  - Smart offline/pre-programmed fallback with category matching.
  - Automatic 3D character lip-sync speech animation and speech bubble excerpts.
  - Bounded conversation context and 100% client-side chat persistence.

---

## 🤖 AI Chat Configuration (Milestone 5)

All AI requests are handled securely through a server-side endpoint (`/api/chat`). **API keys are NEVER exposed in frontend code, browser bundles, or Git.**

### 1. Local Development Setup

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and add your preferred provider key:

   **Option A: Groq Cloud (Recommended — 100% Free Tier, No Card Needed)**
   ```env
   # Get a free key in 30 seconds at: https://console.groq.com/keys
   GROQ_API_KEY=gsk_your_groq_api_key_here
   # Optional model (defaults to llama-3.3-70b-versatile, or llama-3.1-8b-instant):
   # GROQ_MODEL=llama-3.3-70b-versatile
   ```

   **Option B: Google Gemini API (100% Free Tier via Google AI Studio)**
   ```env
   # Get a free key at: https://aistudio.google.com/
   GEMINI_API_KEY=AIzaSy...your_gemini_api_key_here
   # Optional model override (defaults to gemini-1.5-flash):
   # GEMINI_MODEL=gemini-1.5-flash
   ```

   **Option C: OpenRouter (Free Models Available)**
   ```env
   # Get a free key at: https://openrouter.ai/keys
   OPENAI_API_KEY=sk-or-v1-your_openrouter_key_here
   OPENAI_BASE_URL=https://openrouter.ai/api/v1
   OPENAI_MODEL=meta-llama/llama-3.3-70b-instruct:free
   ```

   **Option D: OpenAI API (Paid / Pay-as-you-go)**
   ```env
   OPENAI_API_KEY=sk-...your_openai_api_key_here
   # Optional model override (defaults to gpt-4o-mini):
   # OPENAI_MODEL=gpt-4o-mini
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```
   The Vite dev server includes a built-in API middleware so `/api/chat` works out of the box locally!

### 2. Vercel Deployment Setup

1. Push the code to GitHub and connect your repository on [Vercel](https://vercel.com).
2. In your Vercel project dashboard, navigate to **Settings > Environment Variables**.
3. Add your key:
   - Key: `GEMINI_API_KEY` (or `OPENAI_API_KEY`)
   - Value: `your_secret_api_key`
   - Environments: Production, Preview, Development
4. Deploy! Vercel automatically deploys `api/chat.js` as a secure Node.js serverless function.

### 3. Smart Offline / Pre-Programmed Fallback

If no API key is configured or the network is unavailable:
- The game automatically switches to **Smart Pre-programmed Mode**.
- Ayush uses contextual keyword matching (for greetings, "I miss you", "you're annoying", love notes, hugs, bad days) to deliver warm, charming responses.
- The UI clearly labels pre-programmed messages with a `Pre-programmed` badge and provides a **Retry** button if an API request fails.
- The 3D character animations, voice recorder, and game interactions continue to function smoothly.

---

## 🔒 Security & Privacy

- **Zero Client-Side Secrets**: No `VITE_` prefixed variables are used for secret keys. Bundled assets contain no credentials.
- **Payload Validation**: Incoming messages are strictly validated (max 500 characters, max 8 history turns).
- **Rate Limiting**: Built-in in-memory rate limiting protects against request flooding (20 requests/minute per client).
- **Request Timeouts**: Upstream AI requests abort automatically after 12 seconds to prevent hanging connections.
- **Safe Error Messages**: Internal errors, stack traces, and prompts are never returned to the browser.
- **Client-Side Storage**: Chat history and relationship settings remain 100% local on the user's browser in `localStorage`.

---

## 🛠️ Development & Build Commands

```bash
# Run local dev server (http://localhost:5173/)
npm run dev

# Run Oxlint (linter check)
npm run lint

# Production bundle build
npm run build
```
