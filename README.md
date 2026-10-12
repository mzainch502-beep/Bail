# Bail Studio

**A little thought. A moving story.**

Bail is a free, open-source, minimalist video studio. Its static web application and delivery workflows live entirely in this GitHub repository. No account, ads, watermark, analytics or paid API is required for its built-in motion mode.

## Current release: 0.1.0

- Responsive editor for phones and desktops, with four original visual directions: After hours, Soft light, Paper story and New worlds.
- Text-to-scenes **procedural motion graphics**, animated typography, lights, particles and spatial orbit graphics. This mode is not generative AI footage.
- Vertical 9:16, widescreen 16:9 and square canvases; slow push, drift and fixed camera styles.
- Editable text, durations, typography, colors and scene order, up to 12 scenes.
- Photo import with on-device resizing and animated camera moves; soundtrack import and audio/video export.
- 480p, 720p and 1080p export at 30fps through browser MediaRecorder. MP4 where supported, otherwise WebM. No guaranteed MP4 support on every browser.
- Local IndexedDB project library, downloadable JSON backups and import.
- Installable web experience and offline application files. iPhone uses the web app; an APK does not install on iOS.
- Optional **real AI cinema** adapter for a ComfyUI video runtime you own. Supports API-format workflow submission, prompt/negative/seed substitution, history polling, video output retrieval and original footage download. Not bundled with a model, GPU or public inference service.

## Run locally

```sh
python3 -m http.server 4173 --directory web
```

Open `http://localhost:4173`. No build step or dependencies are required to run the app. No credentials belong in the public repository.

## GitHub hosting

The `Publish Bail to GitHub Pages` workflow publishes `web/` on each push to `main`, and can be run manually from Actions. If GitHub refuses automatic Pages enablement, choose **Settings → Pages → Source → GitHub Actions**, then re-run the workflow.

Expected project URL, once deployment succeeds: `https://mzainch502-beep.github.io/Bail/`.

GitHub Pages is static hosting. It does not host a video model, database server or GPU service. This release is a free open-source tool. GitHub Pages is not a hosting route for a commercial SaaS business; a commercial version would require appropriate hosting.

## Real AI cinema

1. Run a ComfyUI server you control, with a video model and a tested text-to-video workflow that saves `.mp4` or `.webm` output. Select a model whose license permits your use. Hardware requirements depend on the model.
2. Export the workflow in **API format**, not ordinary UI format.
3. Replace the positive prompt string (or a portion of it) with `{{prompt}}`. Optional `{{negative}}` and exact `{{seed}}` values are substituted too. Seed becomes a number when it is the entire value.
4. In Bail, expand AI cinema → Set up AI cinema. Paste the server's HTTPS address and workflow JSON. Test and connect, then close the dialog and select Generate AI footage.
5. Your server must allow requests from your Bail origin through CORS and be reachable from your browser. Use a properly secured gateway/access control; do not expose an unauthenticated ComfyUI server publicly. This release has no authenticated gateway integration and accepts no API keys in URLs. Local HTTP is allowed only when Bail runs on local HTTP too.
6. The workflow determines model, frame count, output size and motion. Studio style and camera controls apply only to procedural graphics. AI footage is previewed/downloaded separately; it is not yet composited into the scene timeline or included in project backups.

The adapter implements the local ComfyUI `/system_stats`, `/prompt`, `/history/{prompt_id}` and `/view` routes. It polls for up to 30 minutes. A lost connection or timeout does not automatically cancel the server job. Backend integration has mock protocol coverage; a live GPU model has not been tested in this workspace.

### Why not free AI for everyone on GitHub alone?

High-quality video inference needs substantial compute. GitHub Pages cannot run it, and GitHub GPU runners are billed. GitHub Actions is for building/testing this app, not a free public inference server. Bail can keep **source, testing and web delivery on GitHub**, but an external or self-owned runtime is necessary for actual AI-generated footage. No provider is advertised as unlimited or permanently free.

## Phone installation

- Android: open the published site in Chrome → menu → Add to Home screen / Install.
- iPhone: open in Safari → Share → Add to Home Screen.
- Native signed Android/iOS distribution is not shipped in this release. Apple App Store distribution cannot be guaranteed at zero cost.

## Verification

```sh
npm ci
npm run check
npm test
npx playwright install --with-deps chromium
npm run test:browser
```

GitHub Actions runs unit tests plus desktop/mobile browser checks for scene editing, storage, export and the mocked ComfyUI protocol. Browser behavior varies; real phone export and a real ComfyUI video model still need device/runtime testing.

## Privacy and limitations

Motion assets and projects stay in browser storage. AI prompts/workflows go only to the server you choose. GitHub may log application delivery requests. Projects are not synced between devices and browser storage can be erased; make backups. User media files are not committed to GitHub.

Keep the browser visible while rendering; moving into the background cancels the export to avoid producing an incomplete video. Audio loops to fit the story. Use media you have rights to use. No stock library, copyrighted music, synthetic speech or cloud AI credits are bundled. Export time is approximately video duration, and speed/quality depend on device capability.

## Next milestones

- Verified local text-to-video model recipes and benchmarked quality on consistent prompts.
- Timeline editing of AI clips, transitions, subtitle tracks and sound mixing.
- Optional browser GPU inference after measuring phone memory, heat, download size and quality.
- Native packaging and accessibility/device validation.

Bail does not claim to outperform paid video models. That requires output comparisons and real model evaluation.

MIT licensed; see LICENSE.
