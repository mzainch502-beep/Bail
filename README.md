# Bail Studio 0.2.0

Bail is an offline, open-source procedural video and image studio. All generation in this version is built into the app. No external service or sign-in is required.

## Generate from a prompt

- **Generate video** interprets scene descriptions, draws animated illustrations and immediately renders a downloadable WebM/MP4 video. Android saves directly to **Downloads/Bail**. Keep the app open while rendering. Android starts at 480p for better compatibility; the export dialog supports 720p/1080p too.
- **Generate image** creates and downloads a PNG from your prompt, at 1080 pixels on the short edge.
- **Preview & edit scenes** lets you change descriptions, durations, scene order, camera motion, color and typography before a manual export.
- Content mode: **Illustrated scenes** or **Animated text**. Photos, music, local project saves and JSON backups remain supported.
- Variation changes the deterministic scene layout. The same prompt and variation produce the same scene.

Supported subjects: city, mountains, forest, ocean/beach, space, desert, coffee and product bottles. Atmosphere includes night, sunset/sunrise, rain and snow. Rendering uses layered drawing, independently moving clouds, ocean waves, particles, steam, illumination and camera motion. Unknown subjects produce abstract artwork; this engine cannot draw arbitrary subjects.

**This is procedural illustration, not a trained AI diffusion/video model.** It does not produce photorealistic cinematic footage. The previous external ComfyUI setup flow has been removed from the main app. No claims of outperforming paid AI models are made.

## Android

The `Build Android APK` workflow builds `Bail-0.2.0.apk`, verifies its signature, then checks editor launch, native video saving and PNG generation on an Android emulator. Android 10+ with a current Android System WebView is required. The editor is bundled using WebViewAssetLoader and works without GitHub Pages. Photos/music/backup import use Android's document picker; generated videos and PNGs use MediaStore Downloads without broad storage permission.

This beta is debug-signed. GitHub runner signing identities can differ between builds, so an update may require uninstalling the old beta. **Download a project backup before uninstalling**; local projects are otherwise erased. Production signing needs a durable private signing key outside Git.

## Web

```sh
python3 -m http.server 4173 --directory web
```

The static app can be published through the Pages workflow. New repositories may require Settings → Pages → GitHub Actions. User projects and media stay in browser storage and are not synced or committed to GitHub. Clearing browser/app data removes local projects; save backups.

## Verification

```sh
npm ci
npm run check
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

Browser checks cover direct prompt-to-video downloads, local PNG output, different imagery for different prompts, no remote generation requests, editing and saving. Android checks run the actual packaged app and verify native file output. Physical phone behavior can differ from emulator behavior.

MIT licensed.
