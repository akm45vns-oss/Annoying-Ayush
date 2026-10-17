# Annoying Ayush — Custom 3D Avatar Asset Specification

To replace the procedural chibi character with a personalized 3D avatar of yourself, place your rigged 3D model in this directory.

---

## 📁 1. File Location & Naming

- **Path**: `public/models/ayush.glb`
- **Default Filename**: `ayush.glb` (Binary GLTF format)
- *Note*: You can also preview or test custom `.glb` files locally by uploading them in the game's **Romantic Settings Modal** at runtime.

---

## 🎨 2. Model Specifications & Optimization (Mobile Friendly)

| Property | Recommendation |
| :--- | :--- |
| **Format** | `.glb` (self-contained binary GLTF with embedded textures) |
| **Polygon Budget** | 20,000 to 50,000 triangles (for smooth 60fps on mobile phones) |
| **Texture Maps** | Maximum 2048x2048 resolution (albedo, roughness, normal) |
| **Origin Point** | Base between feet (`y = 0`), upright along `+Y`, facing forward `+Z` |
| **Scale** | Real-world height (~1.75m to 1.85m). The game engine automatically normalizes scaling. |

---

## 🦴 3. Rigging & Skeleton

The game automatically searches for humanoid bone names:
- `Head`, `Neck`: Drives natural breathing sway, subtle gazing, and tap bounce.
- `Spine`, `Hips`: Anchors posture.
- `Jaw`: Opens and closes dynamically with voice playback if blend shapes are absent.

Standard rigs supported out-of-the-box:
- **Ready Player Me** humanoid avatars.
- **Mixamo** humanoid auto-rigs.
- **Blender Rigify** humanoid exports.

---

## 👄 4. Morph Targets / Blend Shapes (Lip-Sync & Expressions)

For the best facial animations and speech lip-sync, include these standard blend shapes on your head/face mesh:

### A. Speech & Lip-Sync (Driven by Audio Amplitude)
- `mouthOpen` or `jawOpen`
- `viseme_aa`
- `viseme_O`

### B. Facial Expressions
- **Blinking**: `eyeBlinkLeft`, `eyeBlinkRight` (or `blink`)
- **Smile / Laugh / Kiss**: `mouthSmileLeft`, `mouthSmileRight` (or `smile`)

---

## 🎬 5. Optional Bundled Animations

If your `.glb` model includes AnimationClips, the game engine will automatically crossfade to them during interactions:
- `idle`: Default breathing loop.
- `talk` or `talking`: Animated speech gestures.
- `laugh`: Giggling/laughing animation.
- `kiss`: Blowing a kiss.
- `hug` or `cuddle`: Warm embrace.
- `dance`: Playful victory dance.

If no animation clips are included, the engine automatically applies its smooth procedural breathing, head tracking, eye blinking, and lip-sync physics.

---

## 🚀 6. How to Generate Your Model

1. **Ready Player Me**: Generate a 3D cartoon avatar from a selfie at [readyplayer.me](https://readyplayer.me/), export as `.glb` with full facial morph targets.
2. **Blender**: Export using **File $\to$ Export $\to$ glTF 2.0 (.glb)**, ensuring *Include $\to$ Custom Properties* and *Animation $\to$ Shape Keys* are checked.
3. Save the exported file directly into `public/models/ayush.glb`.
