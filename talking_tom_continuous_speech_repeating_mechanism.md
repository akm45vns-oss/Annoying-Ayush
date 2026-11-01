# Talking Tom--Style Continuous Speech Repeating Engine

**Purpose:** A detailed engineering specification for a virtual-pet
character that listens continuously during an active voice session,
detects complete phrases, repeats them in a character voice, and returns
to listening without repeatedly turning the microphone stream off and
on.

## 1. Target player experience

The player taps **Start Listening** once and grants microphone
permission. The game then: 1. Acquires one microphone stream. 2.
Continuously monitors audio for speech. 3. Detects when a phrase starts
and when the player has finished. 4. Converts the complete phrase to
text. 5. Shows the recognized phrase as a caption. 6. Speaks the phrase
using the selected character voice. 7. Prevents the microphone from
interpreting the character's own voice as player speech. 8. Resumes
speech detection using the same microphone stream.

The key distinction is: **pause speech processing while the character
speaks; do not stop the microphone tracks after every phrase.**

## 2. Browser constraints

-   Microphone access requires HTTPS, except on localhost.
-   The player must grant permission.
-   Browsers and operating systems may interrupt microphone access when
    a tab is backgrounded, the phone locks, the browser is suspended, or
    another app takes the microphone.
-   Web Speech API support varies significantly, especially on mobile.
    Some implementations stop automatically or manage their own capture
    lifecycle.
-   A robust design should not depend exclusively on
    `SpeechRecognition.start()` as its persistent microphone engine.
-   Continuous listening must be opt-in, visible, and immediately
    stoppable.

**Recommended architecture:** use `getUserMedia()` to acquire one
persistent audio stream, a VAD/audio segmentation layer to detect
phrases, a speech-to-text service to transcribe completed segments, and
a TTS playback manager to speak them.

## 3. Architecture overview

``` text
Player speaks
    |
    v
One getUserMedia microphone stream
    |
    v
Audio processing / Voice Activity Detection
    |
    v
Phrase buffer and end-of-speech detection
    |
    v
Speech-to-text service
    |
    v
Transcript validation and loop protection
    |
    v
Text-to-speech service
    |
    v
Character audio playback + mouth animation
    |
    v
Short settling delay
    |
    v
Resume VAD on the SAME microphone stream
```

Separate the implementation into five modules:

  -----------------------------------------------------------------------
  Module                              Responsibility
  ----------------------------------- -----------------------------------
  `MicrophoneSession`                 Owns the microphone stream and
                                      AudioContext

  `SpeechSegmenter`                   Detects speech and creates phrase
                                      segments

  `TranscriptionService`              Converts audio segments into text

  `RepeatController`                  Orchestrates states, requests,
                                      queues, and loop prevention

  `CharacterSpeechPlayer`             Plays TTS audio and drives
                                      character animation
  -----------------------------------------------------------------------

Do not combine all of these responsibilities in one React component.

## 4. Microphone lifecycle: acquire once, reuse

### Correct lifecycle

``` text
OFF
  -> REQUESTING_PERMISSION
  -> ACQUIRING_STREAM
  -> CALIBRATING
  -> LISTENING
  -> CAPTURING_PHRASE
  -> TRANSCRIBING
  -> SPEAKING
  -> LISTENING (same stream)
  -> PAUSED (stream may remain open)
  -> LISTENING
  -> STOPPING
  -> OFF
```

`capturing`, `transcribing`, and `speaking` are processing states. They
must not automatically destroy the microphone stream.

### When to call `getUserMedia()`

Call it when the player explicitly starts voice mode. Do not call it for
every phrase, silence boundary, transcription, or TTS request. Do not
call it from a render function or an effect that reruns whenever UI
state changes.

### Example persistent microphone manager

``` js
export class MicrophoneSession {
  constructor() {
    this.stream = null;
    this.audioContext = null;
    this.source = null;
    this.analyser = null;
    this.status = "off";
  }

  async start() {
    if (this.stream?.active) return this.stream;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone capture is not supported.");
    }

    this.status = "requesting";

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1
      },
      video: false
    });

    this.audioContext = new AudioContext();
    await this.audioContext.resume();

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);

    this.status = "listening";
    return this.stream;
  }

  pauseProcessing() {
    // Keep microphone tracks alive; ignore audio frames.
    this.status = "paused";
  }

  resumeProcessing() {
    if (!this.stream?.active) {
      throw new Error("Microphone stream is no longer active.");
    }
    this.status = "listening";
  }

  async stop() {
    this.stream?.getTracks().forEach(track => track.stop());

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }

    this.stream = null;
    this.audioContext = null;
    this.source = null;
    this.analyser = null;
    this.status = "off";
  }
}
```

This is a lifecycle example, not a complete production service.
Production code must observe `track.onended`, AudioContext state
changes, device changes, page visibility, and errors.

### Pause versus stop

-   **Pause processing:** microphone stream remains open; VAD and phrase
    interpretation are suspended.
-   **Resume:** continue using the existing stream if it is still
    active.
-   **Stop:** stop all microphone tracks and close the AudioContext.
-   **Recover:** if the browser or operating system ended the stream,
    show a recovery state and reacquire after an appropriate user
    action.

The UI must be honest: if tracks remain active during a processing
pause, do not show the microphone as fully off.

## 5. Detect speech with Voice Activity Detection

The microphone captures silence, room noise, fans, music, and speech.
The game needs Voice Activity Detection (VAD) to distinguish them.

Recommended signals: - RMS audio energy. - Noise-floor estimate. -
Speech probability from a VAD model. - Duration above/below
thresholds. - Minimum and maximum phrase duration.

For samples (x_1, `\ldots`{=tex}, x_N):

\[ RMS = `\sqrt{\frac{1}{N}\sum_{i=1}^{N}x_i^2}`{=tex} \]

\[ dBFS = 20`\log`{=tex}\_{10}(`\max`{=tex}(RMS,`\epsilon`{=tex})) \]

Energy is only a rough signal: fans and music can also be loud. Prefer a
real VAD model where feasible.

### Adaptive threshold strategy

1.  During initial calibration, measure background noise.
2.  Estimate a noise floor.
3.  Set a speech-start threshold above the noise floor.
4.  Use a lower continuation threshold (hysteresis).
5.  Update the noise estimate slowly during genuine silence.
6.  Do not adapt the noise floor aggressively during speech.

Hysteresis prevents the detector from rapidly switching between speech
and silence when the signal is near a threshold.

Illustrative state:

``` js
const vadState = {
  noiseFloor: 0,
  startThreshold: 0,
  continueThreshold: 0,
  speechStartedAt: null,
  silenceStartedAt: null,
  isSpeechActive: false
};
```

Illustrative logic:

``` js
function detectBoundary(level, now, state) {
  if (!state.isSpeechActive) {
    if (level > state.startThreshold) {
      state.speechStartedAt ??= now;

      if (now - state.speechStartedAt >= 120) {
        state.isSpeechActive = true;
        state.silenceStartedAt = null;
        return "speech-start";
      }
    } else {
      state.speechStartedAt = null;
    }
  } else {
    if (level < state.continueThreshold) {
      state.silenceStartedAt ??= now;
      return "possible-silence";
    }

    state.silenceStartedAt = null;
  }

  return "no-boundary";
}
```

This is pseudocode. A real implementation needs frame scheduling,
calibrated thresholds, VAD confidence, and maximum-duration handling.

## 6. Phrase segmentation: repeat sentences, not individual words

Example player input: "Hello Tom, how are you?"

The desired result is one complete phrase, not five separate recordings.

Suggested starting values (tune on real devices):

  ------------------------------------------------------------------------
  Parameter                           Starting value Purpose
  --------------------- ---------------------------- ---------------------
  Audio frame                              10--30 ms Detection granularity

  Speech-start                           100--200 ms Reject clicks
  confirmation                                       

  End-of-phrase silence                  600--900 ms Detect phrase
                                                     completion

  Minimum phrase                         200--300 ms Reject tiny noises
  duration                                           

  Maximum phrase                       8--12 seconds Bound memory and
  duration                                           upload size

  Post-playback                          150--300 ms Let audio pipeline
  settling                                           settle

  Repeat cooldown                        250--500 ms Avoid rapid duplicate
                                                     requests
  ------------------------------------------------------------------------

These are tuning values, not universal constants. Do not use an
extremely short silence timeout: natural pauses would split sentences.

### Phrase segmentation algorithm

1.  Wait for VAD to detect speech.
2.  Start collecting audio frames.
3.  Continue collecting while speech remains active.
4.  When silence begins, start a silence timer.
5.  If speech resumes before the timeout, cancel the timer and continue
    the same phrase.
6.  If silence exceeds the configured timeout, finalize the segment.
7.  Reject segments that are too short or invalid.
8.  Send the completed segment to speech-to-text.
9.  Reset the phrase buffer, not the microphone stream.

If maximum phrase duration is reached, finalize a segment safely and
continue capturing subsequent speech if the selected provider supports
it.

## 7. Capturing phrase audio

### Option A: MediaRecorder

Use `MediaRecorder` with the persistent microphone stream. Start and
stop phrase recordings while leaving the underlying microphone tracks
active.

``` js
const chunks = [];
const recorder = new MediaRecorder(stream, {
  mimeType: chooseSupportedMimeType()
});

recorder.ondataavailable = event => {
  if (event.data.size > 0) chunks.push(event.data);
};

// Begin a phrase segment.
recorder.start();

// On detected phrase completion:
recorder.stop();

// In onstop, create a Blob from chunks and submit it.
```

Important: - `recorder.stop()` does not inherently stop the microphone
tracks. - Check `MediaRecorder.isTypeSupported()` before choosing a MIME
type. - Audio codecs vary across browsers and providers. - Do not create
competing recorders for the same input. - Reset the chunk array for
every phrase. - Handle recorder errors and unexpected stop events.

### Option B: AudioWorklet / PCM

Use AudioWorklet to process short audio frames and pass them to VAD or a
streaming recognition service.

Advantages: - Fine-grained frame control. - Better fit for real-time VAD
and streaming. - Potentially lower latency.

Costs: - More engineering complexity. - Correct resampling and
audio-format handling are required. - Avoid excessive frame copies and
main-thread work.

**Recommendation:** Start with MediaRecorder phrase segments plus a
reliable VAD. Move to AudioWorklet/streaming when the stable baseline
needs lower latency.

## 8. Speech-to-text

When a phrase is finalized, send it to a speech recognition service.

Possible options: - Browser Web Speech API where supported. - Hosted
speech-to-text through your backend. - A streaming speech recognition
provider.

Do not assume Web Speech API is reliable on all Android browsers. Test
the target devices and browsers.

Example request:

``` http
POST /api/speech-to-text
Content-Type: multipart/form-data
```

Example response:

``` json
{
  "text": "Hello Tom, how are you?",
  "language": "en",
  "isFinal": true
}
```

The exact schema depends on the provider.

### Language support

Plan for: - English (India): `en-IN` - Hindi (India): `hi-IN` -
Hinglish: code-switching support must be verified with the provider. -
Bhojpuri: verify that the selected provider supports it.

A locale setting does not guarantee accurate Hinglish or Bhojpuri
recognition. Test real speech, accents, code-switching, and noisy
environments.

### Conservative transcript cleanup

``` js
function normalizeTranscript(text) {
  return text.trim().replace(/\s+/g, " ");
}
```

Preserve the player's words, slang, names, and language. Do not
translate or rewrite unless the player explicitly selects that behavior.

## 9. Text-to-speech: repeat the recognized phrase

After validating the transcript: 1. Select the configured character
voice. 2. Send the phrase to the backend TTS endpoint. 3. Receive
playable audio. 4. Play it through one playback manager. 5. Animate the
character's mouth while audio plays. 6. Resume VAD after playback and a
short settling delay.

Example request:

``` http
POST /api/text-to-speech
Content-Type: application/json
```

``` json
{
  "text": "Hello Tom, how are you?",
  "voice": "character-default",
  "language": "en-IN"
}
```

The backend must validate text length, select a configured voice, keep
API keys private, enforce timeouts, and return a playable audio format.

### Voice modes

-   Original character voice.
-   Funny/alternate voice.
-   Cloned voice only when the voice model and credentials are actually
    configured and authorized.
-   Device speech-synthesis fallback if implemented.

Never label a device fallback as a cloned voice.

### Playback example

``` js
async function playCharacterAudio(blob, audioElement) {
  const url = URL.createObjectURL(blob);

  try {
    audioElement.src = url;
    await audioElement.play();

    await new Promise((resolve, reject) => {
      audioElement.onended = resolve;
      audioElement.onerror = reject;
    });
  } finally {
    audioElement.pause();
    audioElement.removeAttribute("src");
    audioElement.load();
    URL.revokeObjectURL(url);
  }
}
```

In production, use a dedicated playback manager, clean up event
handlers, handle cancellation, and prevent overlapping audio.

## 10. Critical: prevent the character hearing itself

Without protection:

1.  Player says "Hello".
2.  Character repeats "Hello".
3.  Microphone captures the speaker output.
4.  Speech recognition detects "Hello".
5.  Character repeats it again.
6.  The loop continues.

### Primary protection: gate VAD during playback

While character TTS is playing: - Stop feeding microphone frames into
the phrase segmenter. - Discard any incomplete phrase overlapping
playback. - Keep microphone tracks alive. - Set the voice state to
`speaking`. - Wait until playback ends. - Wait a short settling
period. - Reset the segmenter and resume VAD on the same stream.

``` js
if (voiceState === "speaking") {
  speechSegmenter.reset();
  return; // Ignore microphone frames during character playback.
}
```

Additional protection: - Enable browser echo cancellation where
available. - Reject duplicate transcripts within a short time window. -
Use request IDs to ignore stale transcription results. - Prevent
overlapping TTS requests. - Test with phone speakers and headphones.

Echo cancellation is imperfect and varies by device. Playback gating
remains essential for the basic repeat mode. If the character must
support interruptions while speaking, implement a dedicated acoustic
echo cancellation and barge-in design rather than simply removing the
gate.

## 11. One state machine owns the whole session

  State            Mic stream            VAD         Character
  ---------------- --------------------- ----------- ----------------
  `off`            Closed                Off         Idle
  `requesting`     Pending               Off         Permission UI
  `calibrating`    Open                  Measuring   Setup
  `listening`      Open                  On          Idle/listening
  `capturing`      Open                  On          Listening
  `transcribing`   Open                  Gated       Thinking
  `speaking`       Open                  Gated       Speaking
  `paused`         Open but ignored      Off         Idle
  `recovering`     Reacquire if needed   Off         Recovery
  `error`          Depends on failure    Off         Error feedback

Transitions:

``` text
OFF -> REQUESTING -> CALIBRATING -> LISTENING
LISTENING -> CAPTURING -> TRANSCRIBING -> SPEAKING
SPEAKING -> LISTENING
LISTENING -> PAUSED -> LISTENING
ANY ACTIVE STATE -> STOPPING -> OFF
ANY ACTIVE STATE -> RECOVERING -> LISTENING or ERROR
```

### Controller pseudocode

``` js
class RepeatController {
  constructor({ mic, segmenter, transcriber, speaker }) {
    this.mic = mic;
    this.segmenter = segmenter;
    this.transcriber = transcriber;
    this.speaker = speaker;
    this.state = "off";
    this.sessionId = 0;
    this.enabled = false;
  }

  async start() {
    if (this.enabled) return;

    this.enabled = true;
    this.sessionId += 1;

    await this.mic.start();
    this.state = "listening";
    this.segmenter.start();
  }

  async handlePhrase(audioBlob) {
    if (!this.enabled || this.state !== "listening") return;

    const session = this.sessionId;
    this.state = "transcribing";
    this.segmenter.pause();

    try {
      const text = await this.transcriber.transcribe(audioBlob);

      if (!this.enabled || session !== this.sessionId) return;

      if (!text?.trim()) {
        this.state = "listening";
        this.segmenter.reset();
        this.segmenter.resume();
        return;
      }

      this.state = "speaking";
      await this.speaker.say(text);

      if (!this.enabled || session !== this.sessionId) return;

      await new Promise(resolve => setTimeout(resolve, 200));

      this.state = "listening";
      this.segmenter.reset();
      this.segmenter.resume();
    } catch (error) {
      if (!this.enabled || session !== this.sessionId) return;

      this.state = "listening";
      this.segmenter.reset();
      this.segmenter.resume();
      throw error;
    }
  }

  async stop() {
    this.enabled = false;
    this.sessionId += 1; // Invalidate pending async work.
    this.state = "off";

    this.segmenter.stop();
    this.speaker.stop();
    await this.mic.stop();
  }
}
```

This is architectural pseudocode. Production code needs cancellation,
error classification, event subscriptions, queue policy, and
race-condition tests.

## 12. React integration rules

React should display controller state, not repeatedly create audio
sessions.

-   Keep one controller instance in a stable provider/service.
-   Use a stable reference such as `useRef` or an application-level
    singleton with explicit lifecycle ownership.
-   Subscribe to controller state changes.
-   Start only from a user action.
-   Stop on explicit disable or appropriate teardown.
-   Ensure React Strict Mode does not create duplicate streams.
-   Never call `getUserMedia()` during render.
-   Avoid effects that restart the microphone whenever `isListening`
    changes.

Example controls:

``` jsx
<button onClick={startVoiceSession}>Start Listening</button>
<button onClick={pauseVoiceSession}>Pause</button>
<button onClick={stopVoiceSession}>Stop Microphone</button>
```

The controller is the single source of truth. Do not keep conflicting
microphone states in multiple components.

## 13. UI feedback

The player must always know what is happening.

**Listening** - Microphone icon and "Listening" label. - Subtle
waveform/audio-level meter. - Visible pause and stop controls.

**Capturing** - "Listening..." label. - Optional live transcript. - Do
not flash the microphone icon for each audio frame.

**Transcribing** - Thinking animation. - Show the recognized phrase when
available. - Provide retry feedback on failure.

**Speaking** - Character mouth animation and speaking indicator. -
Microphone session remains active, but recognition is temporarily gated.

**Paused** - "Paused" and a resume action. - If the stream remains open,
explain that processing is paused but microphone access is still active.

**Error** - Explain permission denial, missing device, disconnected mic,
unsupported recognition, network failure, or TTS failure. - Provide a
clear recovery action. - Do not retry endlessly in the background.

## 14. Make the repeat feel smooth

Measure these stages independently:

  Stage                 Optimization
  --------------------- ----------------------------
  Speech start          VAD responsiveness
  Phrase end            Natural silence timeout
  Upload                Audio size and network
  Transcription         Provider latency
  TTS generation        Voice provider latency
  Playback start        Buffering and audio format
  Character animation   State transition timing

Practical rules: 1. Use a natural phrase-end silence threshold. 2. Reuse
network connections where supported. 3. Keep audio segments within
provider limits. 4. Show a thinking animation while transcription runs.
5. Avoid duplicate requests. 6. Use request IDs to ignore stale results.
7. Use one playback manager and a defined queue policy. 8. Do not cut
normal pauses just to reduce latency.

## 15. Mouth animation synchronization

Minimum implementation: - Set character state to `speaking` when audio
starts. - Keep it active until playback ends. - Return to idle after
playback. - Add natural blinking and subtle head movement.

Better implementation: - Use provider viseme or word timestamps if
available. - Map visemes to mouth blend shapes. - Interpolate between
shapes smoothly. - If timing data is unavailable, use audio amplitude as
an approximate mouth-opening signal.

Audio amplitude is not phoneme recognition; it cannot provide accurate
lip-sync by itself.

## 16. Recovery and failure handling

**Permission denied:** Explain how to enable access in browser settings.
Do not repeatedly prompt. Keep text interaction available.

**Microphone track ended:** Listen for `track.onended`. Stop VAD,
discard incomplete audio, show disconnected status, and ask the player
to resume. Do not assume the old stream is reusable.

**AudioContext suspended:** Detect the state change and resume only in a
browser-permitted user-gesture flow.

**Transcription failed:** Keep the microphone session if healthy. Retry
only within a bounded policy or discard that phrase with a message.

**TTS failed:** Use a configured fallback if available; otherwise show
the transcript as text. Do not speak an error through the same TTS path.

**Network timeout:** Use bounded timeouts, avoid unlimited retries, and
prevent duplicate submissions.

**Player stops during an API request:** Invalidate the session ID and
ignore the late response. Do not play speech after the session has
stopped.

## 17. Privacy and security

-   Explain microphone use before permission is requested.
-   Make continuous listening opt-in.
-   Keep a persistent, visible listening indicator.
-   Provide an immediate stop control.
-   Do not store raw recordings by default.
-   Delete temporary audio blobs after processing.
-   Use HTTPS.
-   Keep API keys on the backend.
-   Apply request size limits and rate limits.
-   Avoid logging raw audio or sensitive transcripts.
-   Provide privacy and data-deletion information.
-   Stop microphone tracks when the player disables voice mode.

A browser permission grant is not permission to record secretly or
indefinitely.

## 18. Suggested code structure

``` text
src/
  features/
    voice/
      VoiceProvider.jsx
      VoiceControls.jsx
      VoiceStatus.jsx
      useVoiceSession.js
      controllers/
        MicrophoneSession.js
        RepeatController.js
        SpeechSegmenter.js
        PlaybackManager.js
      audio/
        AudioLevelMeter.js
        NoiseFloorEstimator.js
        VadAdapter.js
        MediaRecorderSegmenter.js
        AudioWorkletProcessor.js
      services/
        speechToTextApi.js
        textToSpeechApi.js
      utils/
        chooseMimeType.js
        normalizeTranscript.js
        createRequestId.js
        cleanupAudioUrl.js
```

Keep provider-specific logic behind service interfaces so speech
providers can be replaced without rewriting the UI or character system.

## 19. Testing checklist

Test: - Quiet room and noisy room. - Fan, television, and music in the
background. - Soft, loud, fast, and slow speech. - Natural pauses and
long pauses. - English, Hindi, Hinglish, and supported Bhojpuri
speech. - Phone speaker and headphones. - Bluetooth headset. -
Microphone unplugged. - Permission denied or revoked. - Network loss
during transcription and TTS. - Tab backgrounded and restored. - Phone
locked and unlocked. - Screen rotation. - Repeated start, pause, resume,
and stop. - Stop during transcription. - Stop during TTS.

Acceptance criteria:

-   [ ] One microphone stream per active session, not per phrase.
-   [ ] Multiple phrases repeat without another permission prompt.
-   [ ] Natural pauses do not split sentences into individual words.
-   [ ] Character playback does not trigger a repeat loop.
-   [ ] Phrase boundaries do not make the microphone indicator flicker.
-   [ ] Pause/resume does not create duplicate streams.
-   [ ] Stop releases every microphone track.
-   [ ] Disconnected streams show a recovery state.
-   [ ] Stale responses cannot trigger speech after stop.
-   [ ] No duplicate transcription or TTS requests.
-   [ ] The character returns to listening after a successful repeat.
-   [ ] The player can stop continuous listening at any time.

## 20. Implementation roadmap

**Phase 1 --- Persistent microphone** - Implement one microphone-session
manager. - Request permission from a button click. - Display real track
status. - Verify the stream remains active across several phrases.

**Phase 2 --- VAD and phrase boundaries** - Add audio meter and noise
calibration. - Detect speech start/end. - Tune silence thresholds. -
Test normal conversational pauses.

**Phase 3 --- Phrase capture** - Capture complete segments. - Reuse the
same microphone stream between segments. - Verify no permission prompt
appears for each phrase.

**Phase 4 --- Speech recognition** - Send phrase audio to backend. -
Return transcript and language. - Display captions.

**Phase 5 --- Character voice** - Add TTS. - Add playback manager. -
Animate mouth and face. - Gate VAD during playback.

**Phase 6 --- Continuous loop** - Connect everything through one state
machine. - Resume VAD after playback. - Test echo prevention and race
conditions.

**Phase 7 --- Mobile reliability** - Test target Android browsers and
devices. - Handle backgrounding and permission changes. - Add recovery
UI and tune latency.

Do not mix AI chat, outfits, or mini-games into the voice controller.
Keep the voice engine standalone and testable.

## 21. Master prompt for an AI coding assistant

> Inspect my existing React + Vite Talking Tom--style game before
> changing code. Identify the current microphone, speech recognition,
> audio playback, TTS, and character animation implementation. Preserve
> working features and explain the planned changes before editing.
>
> Implement a reliable continuous speech repeating engine. The player
> should tap Start Listening once, grant microphone permission, and
> speak many phrases. The character should repeat each complete phrase
> and return to listening automatically without reacquiring the
> microphone or toggling microphone tracks after every phrase.
>
> Create one `MicrophoneSession` manager that owns one `getUserMedia()`
> stream for the active session. Keep the stream alive during listening,
> phrase capture, transcription, and character playback. Stopping a
> phrase recorder must never stop the underlying microphone tracks. Stop
> tracks only when the player explicitly disables voice mode or when a
> failed stream must be replaced.
>
> Add speech activity detection using a suitable VAD implementation or a
> carefully tested adaptive energy detector. Calibrate the noise floor,
> use hysteresis, reject brief noises, detect natural phrase boundaries,
> and enforce a maximum phrase duration. Do not split ordinary sentences
> into separate words.
>
> Use one authoritative state machine with `off`, `requesting`,
> `calibrating`, `listening`, `capturing`, `transcribing`, `speaking`,
> `paused`, `recovering`, and `error`. One controller owns all
> microphone and repeat transitions. React components subscribe to it
> and must not independently call `getUserMedia()` from renders or
> repeated effects.
>
> Send completed audio segments to the configured backend speech-to-text
> service. Preserve the recognized language and support English, Hindi,
> Hinglish, and Bhojpuri only to the extent the configured provider
> supports them. Then send the transcript to the configured TTS backend.
> Never expose provider API keys in frontend code.
>
> Prevent feedback loops: while character TTS plays, gate VAD and
> discard overlapping incomplete phrase buffers. Keep the microphone
> stream alive. After playback, wait for a configurable settling delay,
> reset the segmenter, and resume VAD on the same stream. Enable echo
> cancellation where available, but do not rely on it as the only
> loop-prevention mechanism.
>
> Use one playback manager, prevent overlapping TTS, clean up audio
> resources, handle autoplay restrictions, and synchronize character
> mouth animation with playback. Use viseme timing if available;
> otherwise use an explicitly approximate audio-amplitude animation.
>
> Handle permission denial, missing or disconnected microphones, ended
> tracks, suspended AudioContext, unsupported recognition, network
> errors, TTS errors, stale asynchronous responses, duplicate events,
> and browser backgrounding. Do not retry indefinitely. Show honest
> listening/paused/speaking/error indicators and provide an immediate
> stop control.
>
> Add tests for multiple phrases in one session, long pauses, background
> noise, self-echo, pause/resume, stop during transcription, stop during
> TTS, stream disconnection, and network failure. Verify that microphone
> acquisition happens once per session and phrase boundaries never stop
> the microphone tracks. Test on real target Android devices and
> browsers.
>
> Run tests and a production build. Report exact files changed, test
> results, browser/device limitations, and required environment
> variables. Do not claim reliable background or locked-screen listening
> unless verified.

## 22. Final engineering rule

**Keep the microphone session alive. Pause speech interpretation---not
microphone capture---while the character repeats the phrase.**

That is the central design decision that prevents repeated microphone
on/off behavior. A persistent capture stream, robust phrase segmenter,
single state-machine controller, and playback gate are the foundation of
a smooth Talking Tom--style speech repeater.
