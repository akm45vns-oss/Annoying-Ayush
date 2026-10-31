# Talking Tom--Style Game: Complete Feature & Frontend Design Specification

> **Project type:** Interactive virtual-pet game\
> **Target platform:** Mobile-first web app (PWA-ready), deployable on
> Vercel\
> **Working concept:** A playful 3D character that listens, repeats what
> the player says, reacts to touch, chats, changes outfits, and builds a
> sense of personality over time.\
> **Design goal:** Capture the instantly understandable fun of a Talking
> Tom--style game while giving the experience its own identity, polished
> visuals, responsive controls, and reliable performance on modest
> phones.

------------------------------------------------------------------------

## 1. Product Vision

Build a charming, expressive virtual companion who feels present on
screen. The character should react immediately to the player's voice and
touch, perform entertaining animations, and offer a small set of
easy-to-understand activities.

The experience should be: - **Character-first:** The character is the
main focus, not menus or panels. - **Instantly playable:** A new player
should understand the primary interactions within seconds. -
**Mobile-first:** Designed for touch screens, portrait orientation, and
one-handed use. - **Responsive:** Controls should feel immediate, with
clear loading, listening, speaking, and error states. - **Distinctive:**
Use original character design, animations, sounds, UI styling, and
writing rather than copying copyrighted Talking Tom assets.

## 2. Core Gameplay Loop

1.  The player opens the game and sees the character in an idle
    animation.
2.  The player taps, swipes, speaks, or chooses an activity.
3.  The character reacts with an animation, expression, sound, or spoken
    response.
4.  The player earns coins, affection, experience, or collectibles
    through activities.
5.  The player uses rewards to unlock outfits, accessories, room
    decorations, and emotes.
6.  The character remembers permitted game progress and gradually feels
    more personal.

The main loop should remain fun even when optional systems such as
accounts, rewards, or AI chat are unavailable.

------------------------------------------------------------------------

## 3. Main Screen / Frontend Layout

### 3.1 Portrait home screen

The home screen should use almost the entire viewport for the 3D
character.

**Top bar** - Player level and experience progress. - Coin balance. -
Settings icon. - Optional daily reward indicator. - Keep the top bar
compact and avoid covering the character's head.

**Character stage** - Large 3D character centered on screen. - Full
face, ears, hands, and feet should remain visible on common phone aspect
ratios. - Camera framing should adapt to viewport size and safe areas. -
Soft floor shadow and subtle environment lighting. - A simple
background/room that can be changed later. - Small contextual speech
bubble for short reactions. - Character should remain visible while
panels open; use bottom sheets or overlays rather than navigating away.

**Primary action area** - Two prominent actions: 1. **Play & Romance**
--- opens playful interactions, touch reactions, mini-games, affection
activities, and emotes. 2. **AI Chat** --- opens a conversational
interface with text and optional voice. - A compact microphone/listening
control can be displayed when voice mode is active. - Avoid filling the
home screen with many equally prominent buttons.

**Bottom navigation** - Home - Wardrobe - Activities - Room - Profile /
Progress

On small screens, use icons with short labels. Keep the two primary
actions visually dominant.

### 3.2 Desktop layout

-   Keep the character centered in a large stage.
-   Place secondary controls in a left or right rail.
-   Keep chat in a collapsible side panel.
-   Do not simply stretch the mobile layout across a wide screen.
-   Support mouse, keyboard, and microphone interaction.

### 3.3 Visual direction

Suggested art direction: - Soft 3D cartoon aesthetic. - Rounded shapes
and readable silhouettes. - Expressive eyes, eyebrows, mouth, and
ears. - Warm, friendly lighting with gentle ambient shadows. - Bright
but controlled color palette. - Subtle gradients, translucent panels,
rounded cards, and restrained motion. - Large touch targets and clear
visual hierarchy. - Avoid visual clutter, excessive particles, and
constant UI movement.

------------------------------------------------------------------------

## 4. Character System

### 4.1 Character states

The character should have a state machine with clear transitions:

-   `idle`
-   `listening`
-   `thinking`
-   `speaking`
-   `laughing`
-   `happy`
-   `sad`
-   `surprised`
-   `angry_playful`
-   `sleeping`
-   `eating`
-   `dancing`
-   `playing`
-   `romantic`
-   `hurt_comical`
-   `celebrating`

Use animation blending where possible. Do not abruptly snap between
unrelated poses.

### 4.2 Idle behavior

-   Gentle breathing.
-   Natural blinking at varied intervals.
-   Small head turns and eye movement.
-   Occasional weight shifts.
-   Rare, short idle reactions.
-   Return to a neutral pose after an action.

**Important:** Idle animations must not continuously move the character
around the stage. Avoid looping workout, walking, or exaggerated
arm-spread animations unless explicitly selected.

### 4.3 Facial expressions

Create expression controls for: - Neutral - Smile - Big smile - Laugh -
Sad - Angry - Surprised - Sleepy - Curious - Blushing - Talking

Use blend shapes/morph targets where supported. If the model has no
facial rig, use the best available facial animation fallback.

### 4.4 Character animation interactions

-   Tap head: head tilt, blink, laugh, or playful reaction.
-   Tap nose: funny expression or sound.
-   Tap belly: laugh or giggle.
-   Tap hands: wave or high-five.
-   Tap feet: small hop or annoyed reaction.
-   Swipe: character follows the swipe or reacts to direction.
-   Long press: hold a reaction or trigger a special animation.
-   Double tap: trigger a distinct reaction, not the same event twice.
-   Drag: optional gentle character movement, with bounds to prevent
    losing the character off-screen.

Every interaction should have cooldowns and should not stack conflicting
animations.

------------------------------------------------------------------------

## 5. Voice & Talking System

### 5.1 Voice modes

Offer clear modes: - **Repeat mode:** Listen to the player's speech and
repeat the recognized phrase in the character voice. - **Original
voice:** Use the character's default voice. - **Funny voice:** Apply a
playful pitch or voice effect where technically supported. - **AI
response voice:** Speak the AI-generated response. - **Silent mode:**
Use captions and animations without audio.

Do not imply that a voice clone is configured unless the required
provider credentials and voice ID are actually present.

### 5.2 Listening experience

-   Ask for microphone permission only after the player taps a
    microphone/listening control or enables the feature.
-   Explain why microphone access is needed.
-   Show an obvious listening indicator.
-   Show a live audio-level meter or listening animation.
-   Provide a clear stop/pause control.
-   Show recognized text before or while repeating, where practical.
-   Handle permission denied, missing microphone, unavailable speech
    recognition, network failure, and unsupported browser states.
-   Never leave the microphone indicator stuck in a listening state.
-   Avoid rapid on/off toggling and audio feedback loops.

### 5.3 Continuous listening

If continuous listening is enabled: - Make the feature opt-in. - Show a
persistent, unmistakable listening status. - Provide a one-tap
pause/stop control. - Use voice activity detection (VAD) or silence
detection to identify speech boundaries. - Apply a minimum speech
duration and configurable sensitivity. - Avoid repeating the character's
own speaker output. - Use an output-playback lock or echo suppression
strategy. - Add a short cooldown between recognized phrases. - Stop
listening when the player leaves the game, backgrounds the tab, or
disables the feature, according to browser capabilities. - Explain that
browser and operating-system restrictions may interrupt background
microphone access.

### 5.4 Repeat pipeline

Recommended flow:

1.  Capture microphone audio.
2.  Detect speech activity.
3.  Convert speech to text using browser speech recognition or a
    configured speech-to-text provider.
4.  Normalize punctuation and language metadata.
5.  Apply loop-prevention checks.
6.  Display the recognized phrase.
7.  Generate speech using the selected voice provider.
8.  Play audio and trigger mouth/talking animation.
9.  Return to listening only if continuous mode remains enabled.

### 5.5 Language support

Plan for: - English - Hindi - Hinglish (Hindi-English mixed speech) -
Bhojpuri

Language selection should be available in settings. Browser speech
recognition support varies by browser, device, and language. Provide a
fallback text input and a clear unsupported-language message.

### 5.6 Audio controls

-   Master volume.
-   Character voice volume.
-   Music volume.
-   Sound-effects volume.
-   Mute toggle.
-   Voice preview.
-   Audio output state indicator.

Persist audio preferences locally.

------------------------------------------------------------------------

## 6. AI Chat

### 6.1 Chat features

-   Text chat with the character.
-   Optional speech-to-text input.
-   Optional text-to-speech output.
-   Typing/thinking indicator.
-   Short, playful, age-appropriate responses.
-   Conversation history for the current session.
-   Clear chat action.
-   Suggested prompts for first-time players.
-   Retry on network failure.
-   Stop generation control if supported.

### 6.2 Character personality

The character should be: - Playful and expressive. - Friendly and
humorous. - Supportive without pretending to be a real person. - Able to
respond in the selected language. - Consistent in tone. - Brief by
default, with longer answers only when useful.

### 6.3 Chat UI

-   Open as a bottom sheet on mobile.
-   Use a side panel on desktop.
-   Keep the character visible where possible.
-   Use rounded message bubbles.
-   Add a clear input field and send button.
-   Include microphone and speaker controls only when available.
-   Provide loading, empty, offline, and error states.

### 6.4 Safety and privacy

-   Do not collect or store microphone recordings unless the product
    explicitly requires it and the user has been informed.
-   Prefer processing speech transiently.
-   Provide a clear privacy notice.
-   Do not expose API keys in frontend code.
-   Route AI and voice-provider requests through a secure backend.
-   Add rate limits and input-size limits.
-   Provide a way to clear chat history and locally stored game data.

------------------------------------------------------------------------

## 7. Play & Romance Mode

This is a playful affection and interaction area. Keep it light,
non-explicit, and suitable for a broad audience.

### 7.1 Touch interactions

-   Head pat.
-   Nose boop.
-   Belly tickle.
-   Hand tap / high-five.
-   Hug animation.
-   Wave.
-   Heart gesture.
-   Compliment reaction.
-   Gift presentation.
-   Photo pose.

### 7.2 Affection system

-   Affection meter.
-   Daily interaction bonus.
-   Unlockable reactions.
-   Character greetings based on progress.
-   Milestone animations.
-   Optional gifts purchased with earned in-game coins.

Do not punish players for missing days. Avoid manipulative streak
mechanics.

### 7.3 Emotes and reactions

-   Laugh.
-   Dance.
-   Cry comically.
-   Blow a kiss.
-   Wave.
-   Celebrate.
-   Sleep.
-   Act surprised.
-   Make a silly face.

Each emote should have a preview and a short animation.

------------------------------------------------------------------------

## 8. Mini-Games & Activities

Build activities as modular features so they can be added incrementally.

### Starter activities

1.  **Tap Challenge:** Tap targets that appear around the character.
2.  **Memory Match:** Match simple pairs.
3.  **Reaction Test:** Tap when the character signals.
4.  **Dance Copy:** Repeat a short sequence of gestures.
5.  **Bubble Pop:** Pop floating bubbles.
6.  **Rock-Paper-Scissors:** Play against the character.
7.  **Guess the Sound:** Identify a simple sound.
8.  **Quick Quiz:** Short, optional general-knowledge questions.

### Activity requirements

-   Short sessions (roughly 30--90 seconds).
-   Clear instructions.
-   Pause and exit controls.
-   Reward summary.
-   Difficulty progression.
-   Touch-friendly controls.
-   Reduced-motion and reduced-effects options.
-   No activity should require a high-end GPU.

------------------------------------------------------------------------

## 9. Wardrobe & Customization

### 9.1 Items

-   Shirts and costumes.
-   Hats.
-   Glasses.
-   Shoes.
-   Accessories.
-   Seasonal outfits.
-   Color variations, if supported by the model.

### 9.2 Wardrobe UI

-   Grid of item cards.
-   Category tabs.
-   Character preview.
-   Equip/unequip action.
-   Locked item state.
-   Coin price and ownership state.
-   Preview before purchase.
-   Confirmation for spending currency.

### 9.3 Character customization

If supported by the model: - Fur/skin color variations. - Eye color. -
Accessory placement. - Outfit combinations. - Name or nickname.

Ensure that customization does not break rigging, clipping, or
animation.

------------------------------------------------------------------------

## 10. Room & Environment

-   A small default room.
-   Unlockable backgrounds.
-   Day/night lighting presets.
-   Simple furniture and decorations.
-   Interactive objects.
-   Room themes.
-   Seasonal decoration packs.

Keep the environment lightweight. Use baked lighting or efficient
lighting setups where possible.

------------------------------------------------------------------------

## 11. Progression & Rewards

### 11.1 Currencies

-   Coins earned through activities.
-   Optional premium currency only if a real monetization system is
    deliberately added.
-   Do not imply purchases or payments exist if they are not
    implemented.

### 11.2 Progression

-   Player level.
-   Experience points.
-   Unlockable emotes.
-   Wardrobe items.
-   Room decorations.
-   Activity achievements.
-   Daily reward that does not create punitive streak pressure.

### 11.3 Achievements

Examples: - First conversation. - First voice repeat. - 10
interactions. - First mini-game completed. - First outfit unlocked. - 5
different emotes used.

------------------------------------------------------------------------

## 12. Settings

Organize settings into simple sections.

**Audio** - Master volume. - Voice volume. - Music volume. - Sound
effects. - Mute.

**Voice** - Repeat mode. - Continuous listening. - Language. - Voice
selection. - Listening sensitivity. - Captions. - Microphone permission
status.

**Graphics** - Quality: Low / Balanced / High. - Shadows on/off. -
Effects on/off. - Character detail. - Reduced motion.

**Gameplay** - Vibration/haptics. - Tutorial replay. - Reset local
progress.

**Privacy** - Microphone explanation. - Data and chat-history
controls. - Clear locally stored data. - Privacy policy link.

------------------------------------------------------------------------

## 13. Onboarding & Tutorials

First launch: 1. Show a short welcome screen. 2. Introduce the
character. 3. Explain tap interactions. 4. Offer an optional microphone
setup. 5. Explain that microphone access is optional. 6. Demonstrate
repeat mode only after permission is granted. 7. Show the two main
actions: Play & Romance and AI Chat. 8. Let the player skip or replay
the tutorial.

Do not request microphone permission immediately on page load.

------------------------------------------------------------------------

## 14. Responsive Design Requirements

### Mobile

-   Portrait-first layout.
-   Support narrow screens around 320--360 CSS pixels.
-   Respect top and bottom safe-area insets.
-   Keep primary actions reachable by thumb.
-   Minimum touch target: approximately 44 × 44 CSS pixels.
-   Prevent accidental page scrolling while interacting with the 3D
    stage, without blocking normal scrolling in menus.
-   Use bottom sheets for settings, wardrobe, and chat.
-   Keep the character's full face visible at all times.

### Tablet

-   Larger character stage.
-   Two-column panels where useful.
-   Avoid oversized controls.

### Desktop

-   Centered character stage.
-   Optional side panels.
-   Keyboard support.
-   Hover states in addition to focus states.
-   Resizable or collapsible chat panel.

### Accessibility

-   Visible keyboard focus.
-   Semantic buttons and labels.
-   Text alternatives for icon-only controls.
-   Captions for spoken output.
-   Sufficient color contrast.
-   Reduced-motion option.
-   Do not rely on color alone to communicate state.

------------------------------------------------------------------------

## 15. Frontend Technology & Architecture

Suggested stack: - **React** for UI. - **Vite** for development and
production builds. - **Three.js** for 3D rendering. - **React Three
Fiber** for React-based 3D scene composition. - **Drei** for common 3D
helpers, where useful. - **CSS Modules or Tailwind CSS** for UI
styling. - **Zustand or React Context** for lightweight app state. -
**React Router** only if multiple route-level screens are needed. -
**PWA support** as an optional enhancement.

### Suggested frontend structure

``` text
src/
  app/
    App.jsx
    routes.jsx
    providers/
  components/
    CharacterStage/
    TopBar/
    BottomNavigation/
    PrimaryActions/
    SpeechBubble/
    Modal/
    BottomSheet/
    LoadingState/
    ErrorState/
  features/
    character/
      components/
      hooks/
      state/
      animations/
    voice/
      components/
      hooks/
      services/
      state/
    chat/
      components/
      hooks/
      services/
    activities/
      components/
      games/
    wardrobe/
      components/
      data/
    room/
      components/
    rewards/
      components/
    settings/
      components/
  services/
    apiClient.js
    audioManager.js
    storage.js
  hooks/
  styles/
  utils/
  assets/
    models/
    textures/
    audio/
    icons/
```

### Component responsibilities

-   `CharacterStage`: Owns the 3D canvas, camera, lighting, model, and
    animation controller.
-   `CharacterController`: Maps app events to character states and
    animations.
-   `VoiceController`: Manages microphone permission, capture, speech
    recognition, and listening state.
-   `SpeechPlayer`: Plays generated audio and synchronizes speaking
    state.
-   `HomeScreen`: Composes the top bar, character stage, and primary
    actions.
-   `ChatPanel`: Owns chat messages, input, loading, and errors.
-   `WardrobePanel`: Displays categories, item previews, and equip
    actions.
-   `ActivityHub`: Lists available mini-games.
-   `SettingsPanel`: Manages preferences and permission explanations.

------------------------------------------------------------------------

## 16. 3D Performance & Camera Requirements

### Character framing

-   Use a dedicated camera controller.
-   Define mobile and desktop camera presets.
-   Fit the character using model bounds rather than hard-coded offsets
    alone.
-   Keep the face inside a safe framing region.
-   Recalculate framing on resize and orientation change.
-   Avoid camera movement that makes the character appear distant.
-   Prevent clipping at the top of the head, feet, or hands.

### Performance

-   Use compressed GLB/GLTF models where possible.
-   Compress textures and use appropriate texture sizes.
-   Load non-essential assets lazily.
-   Avoid unnecessary real-time lights and expensive shadows.
-   Use instancing for repeated objects.
-   Limit particle effects.
-   Pause or reduce rendering when the tab is hidden.
-   Dispose of unused geometries, materials, and textures.
-   Provide low-quality settings for older phones.
-   Monitor frame rate and memory use on real devices.

### Loading

-   Show a branded loading state.
-   Load the character before optional room assets.
-   Provide progress feedback when available.
-   Show a graceful fallback if the model fails to load.
-   Never leave the screen blank indefinitely.

------------------------------------------------------------------------

## 17. State Management & Interaction Rules

Use explicit states rather than many unrelated booleans.

Example high-level state:

``` js
{
  screen: "home",
  character: {
    mood: "happy",
    action: "idle",
    isSpeaking: false
  },
  voice: {
    mode: "repeat",
    status: "off",
    language: "en-IN",
    continuous: false
  },
  audio: {
    muted: false,
    masterVolume: 0.8
  },
  ui: {
    activePanel: null,
    isChatOpen: false
  },
  progress: {
    level: 1,
    experience: 0,
    coins: 0,
    affection: 0
  }
}
```

Rules: - Only one major character action should own the animation state
at a time. - Voice output must not be mistaken for player input. -
Closing a panel should restore the previous screen state. - Network
errors must not crash the game. - Disable duplicate submissions while a
request is pending. - Keep UI state and 3D character state
synchronized. - Persist only appropriate preferences and progress.

------------------------------------------------------------------------

## 18. Backend & API Integration

The frontend must never contain private provider API keys.

Recommended backend responsibilities: - AI chat requests. -
Speech-to-text requests, if using a server provider. - Text-to-speech
requests. - Voice provider configuration. - Authentication, only if
accounts are introduced. - Cloud save, only if cross-device progress is
required. - Rate limiting and abuse prevention.

Example API routes:

``` text
POST /api/chat
POST /api/speech-to-text
POST /api/text-to-speech
GET  /api/config
GET  /api/profile
POST /api/progress
```

The frontend should: - Use environment-based API base URLs. - Handle
timeouts and retries carefully. - Validate response types. - Show
actionable error messages. - Avoid logging secrets, raw audio, or
private user content.

------------------------------------------------------------------------

## 19. Data Persistence

For a simple first version: - Use local storage for settings and small
progress values. - Use IndexedDB for larger local data if needed. - Do
not store raw microphone recordings by default. - Version stored data
and handle migrations. - Provide a reset option.

For cloud saves: - Add authentication. - Validate all progress updates
server-side. - Do not trust client-submitted coin balances or
achievement unlocks. - Define retention and deletion behavior.

------------------------------------------------------------------------

## 20. Security, Privacy & Reliability

-   Keep all API secrets on the server.
-   Restrict CORS to known origins.
-   Validate request bodies.
-   Rate-limit expensive AI and voice endpoints.
-   Add request timeouts and safe retries.
-   Sanitize user-generated text before rendering.
-   Do not use `dangerouslySetInnerHTML` for untrusted chat content.
-   Explain microphone use before requesting access.
-   Provide clear controls to stop listening.
-   Avoid collecting unnecessary personal information.
-   Provide graceful fallbacks when providers are unavailable.

------------------------------------------------------------------------

## 21. Testing & Quality Checklist

### Functional

-   [ ] Character loads successfully.
-   [ ] Character remains fully visible on mobile.
-   [ ] Idle animation is subtle and stable.
-   [ ] Touch interactions trigger the correct reaction.
-   [ ] Conflicting animations do not overlap.
-   [ ] Microphone permission can be granted and denied.
-   [ ] Listening can be started and stopped reliably.
-   [ ] Continuous listening does not oscillate on/off.
-   [ ] Character audio does not create a repeat loop.
-   [ ] AI chat handles success, empty response, timeout, and error.
-   [ ] Settings persist after refresh.
-   [ ] Wardrobe items preview and equip correctly.
-   [ ] Mini-games can start, finish, and exit.
-   [ ] Progress rewards are not duplicated.

### Responsive

-   [ ] 320px-wide phone.
-   [ ] 360px-wide phone.
-   [ ] 390px-wide phone.
-   [ ] 430px-wide phone.
-   [ ] Tablet portrait and landscape.
-   [ ] Desktop at common resolutions.
-   [ ] Safe-area insets are respected.
-   [ ] Orientation changes do not break camera framing.

### Performance

-   [ ] Initial screen appears quickly.
-   [ ] 3D assets load progressively.
-   [ ] Low graphics mode works.
-   [ ] No repeated memory growth after opening and closing panels.
-   [ ] No unnecessary animation while the page is hidden.
-   [ ] Audio does not continue unexpectedly after leaving the game.

### Accessibility

-   [ ] Keyboard navigation works.
-   [ ] Focus states are visible.
-   [ ] Icon buttons have accessible names.
-   [ ] Captions are available for speech.
-   [ ] Reduced motion is respected.

------------------------------------------------------------------------

## 22. Suggested Development Roadmap

### Phase 1 --- Playable foundation

-   Responsive home screen.
-   Character model and camera framing.
-   Idle animation and facial expressions.
-   Tap and swipe interactions.
-   Audio controls.
-   Basic settings.

### Phase 2 --- Voice experience

-   Microphone permission flow.
-   Push-to-talk repeat mode.
-   Speech recognition.
-   Text-to-speech.
-   Captions.
-   Reliable listening state machine.
-   Loop prevention.

### Phase 3 --- AI chat

-   Chat panel.
-   Backend integration.
-   Character personality prompt.
-   Text and optional voice responses.
-   Error handling and rate limits.

### Phase 4 --- Game systems

-   Play & Romance interactions.
-   Emotes.
-   Mini-games.
-   Coins and experience.
-   Achievements.

### Phase 5 --- Customization

-   Wardrobe.
-   Accessories.
-   Room themes.
-   Saved character setup.

### Phase 6 --- Polish and release

-   Performance profiling on low-end Android phones.
-   Accessibility review.
-   Privacy and security review.
-   Cross-browser testing.
-   PWA installation support.
-   Production monitoring and bug fixes.

------------------------------------------------------------------------

## 23. Definition of Done

The first public release is ready when: - The game opens reliably on
mobile and desktop. - The character is fully visible and correctly
framed on common phones. - The player can interact with the character
using touch. - Repeat mode works when browser and microphone support are
available. - The player can stop listening at any time. - The game
prevents the character's voice from triggering its own repeat loop as
far as the platform allows. - AI chat has clear loading and error
states. - The two main actions are easy to find. - Menus are usable on
small screens. - No private API key is shipped to the browser. - The app
has a privacy explanation for microphone use. - Performance is
acceptable on a representative low-end Android device. - Core flows pass
the testing checklist.

------------------------------------------------------------------------

## 24. Master Build Prompt

Use the following as the implementation brief for an AI coding assistant
or development team:

> Build a production-quality, mobile-first Talking Tom--style
> virtual-pet web game with an original 3D cartoon character and
> original visual identity. Use React, Vite, Three.js, and React Three
> Fiber. The character must be the central focus of the home screen and
> must remain fully visible, especially the face, on small Android
> phones. Create a polished portrait-first interface with a compact top
> bar, a large interactive 3D character stage, and only two dominant
> home actions: **Play & Romance** and **AI Chat**. Add bottom
> navigation for Home, Wardrobe, Activities, Room, and Profile.
>
> Implement expressive idle behavior, blinking, breathing, facial
> expressions, smooth animation transitions, and touch reactions for
> head, nose, belly, hands, and feet. Add swipe and long-press
> interactions. Ensure idle animation never forces the character into an
> awkward pose or moves it unnecessarily around the screen.
>
> Build a voice system with optional push-to-talk and opt-in continuous
> listening. Include microphone permission education, clear
> listening/paused/speaking states, speech activity detection, speech
> recognition, repeat mode, selectable voice modes, captions, volume
> controls, and robust error handling. Prevent the character's own audio
> from being recognized as player input. Do not claim a cloned voice is
> configured unless valid server-side provider credentials and a voice
> identifier are available. Support English, Hindi, Hinglish, and
> Bhojpuri where the selected speech provider supports them, and provide
> a text-input fallback.
>
> Add an AI chat panel with message history, typing indicators,
> suggested prompts, retry handling, and optional spoken responses. Keep
> provider API keys on the backend. Add Play & Romance interactions,
> emotes, short mini-games, affection progression, coins, achievements,
> wardrobe customization, and room themes as modular features.
>
> Use bottom sheets on mobile and side panels on desktop. Respect safe
> areas, provide large touch targets, support keyboard navigation and
> reduced motion, and test widths from 320px upward. Optimize GLB/GLTF
> assets, textures, shadows, particles, and render loops for older
> Android devices. Provide low, balanced, and high graphics settings.
> Use explicit state machines for character actions and voice states so
> animations, listening, and audio cannot conflict.
>
> Build reusable, maintainable components; handle loading, empty,
> offline, permission-denied, and API-error states; persist preferences
> safely; and provide a complete test checklist. Do not create fake
> working features or placeholder buttons that do nothing. Implement the
> project in phases, verify each phase with production builds and device
> testing, and document any provider credentials or browser limitations
> that must be configured outside the frontend.

------------------------------------------------------------------------

## 25. Recommended MVP Scope

Do not attempt to build every feature in the first release. Start with
this compact MVP:

1.  One polished 3D character.
2.  Responsive home screen.
3.  Idle animation and 5--8 touch reactions.
4.  Push-to-talk repeat mode.
5.  AI chat with text input.
6.  Character voice output with captions.
7.  Settings for audio, language, and graphics.
8.  Local progress and preferences.

Add continuous listening only after push-to-talk is stable. Add
mini-games, wardrobe, room customization, and progression after the core
character and voice experience are reliable.
