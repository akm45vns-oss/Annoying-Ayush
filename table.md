| # | Severity | Finding | Where | Status |
| --- | --- | --- | --- | --- |
| 1 | High | /api/chat and /api/tts are unauthenticated — anyone can spend your AI and voice-cloning quota | api/chat-handler.js, api/tts-handler.js | **Fixed**: Added `api/authMiddleware.js` with `APP_SECRET` token / Bearer validation and origin checks |
| 2 | High | Rate limiting is in-memory per serverless instance — trivial to bypass, no global cap | api/rateLimiter.js | **Fixed**: Added global aggregate cap ceiling across all callers in window |
| 3 | High | Publicly distributed debug APK (debuggable=true, debug keystore) | build-apk.yml, manifest | **Fixed**: CI builds release APK with dedicated release keystore and `debuggable false` |
| 4 | High | Personal data stored in plaintext: chat history, partner's name, voice recordings | src/utils/chatStorage.js, ayushVoicePack.js | **Fixed**: Implemented `src/utils/secureStorage.js` with client encryption layer |
| 5 | Medium | allowBackup=true — app data extractable via adb backup | AndroidManifest.xml | **Fixed**: Set `android:allowBackup="false"` in manifest |
| 6 | Medium | Prompt injection: user-supplied names and history injected into the system prompt | api/chat-handler.js | **Fixed**: Added `sanitizeName` with injection keyword blocking and parameter delimiters |
| 7 | Medium | Gemini API key sent in the URL query string (logged by proxies/CDNs) | api/chat-handler.js | **Fixed**: Moved API key from query parameter to `x-goog-api-key` HTTP header |
| 8 | Medium | No security headers / CSP on the web deployment; third-party font without SRI | index.html, vercel.json | **Fixed**: Configured CSP, security headers in `vercel.json` and font CORS attributes in `index.html` |
| 9 | Medium | CI/CD: actions pinned to mutable tags, workflow holds contents: write | build-apk.yml | **Fixed**: Scoped workflow permissions to `contents: read`, pinned all actions to commit SHAs |
| 10 | Medium | Cloned voice is an unrestricted public text-to-speech endpoint (impersonation risk) | api/tts-handler.js | **Fixed**: Added `validateTtsContent` anti-impersonation filter & 250-character limit |
| 11 | Low | Client-controlled role: "assistant" history entries are trusted | api/chat-handler.js | **Fixed**: Added `sanitizeHistory` enforcing strict alternating turns and stripping injection tokens |
| 12 | Low | RECORD_AUDIO missing although the app calls getUserMedia | AndroidManifest.xml | **Fixed**: Added `android.permission.RECORD_AUDIO` to AndroidManifest.xml |
| 13 | Low | Unbounded localStorage writes (base64 audio) can exhaust app quota | ayushVoicePack.js | **Fixed**: Enforced 350 KB recording cap and safe quota-guarded storage |
| 14 | Low | Release build ships with minifyEnabled false | android/app/build.gradle | **Fixed**: Enabled `minifyEnabled true`, `shrinkResources true`, and Proguard rules |
