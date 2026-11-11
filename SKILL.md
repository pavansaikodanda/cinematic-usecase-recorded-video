---
name: cinematic-usecase-recorded-video
description: Turn use case screen recordings of an AI coding agent building in Salesforce into a branded explainer video with narration, music, sound effects, agent-panel-only shots and real Salesforce result screens, optionally hiding the underlying model name. Extends usecase-recorder (records first if no recording exists) and the cinematic-video-director / cinematic-explainer-video skills, with the person's brand applied. Use when asked to make a demo video, sales/AE video, explainer or cinematic version from use case recordings, or to combine several use case recordings into one video.
---

# Cinematic use case recorded video

Make an explainer from real use case recordings. If the person has a brand skill or brand kit, load it first (it sets colours, fonts, logo and pattern), and read **`cinematic-explainer-video`** for craft rules (narration sync, motion, sound, QA) if it is installed. For a fully animated "film cut", run **`cinematic-video-director`** with the plan below as its brief. If the use case has not been recorded yet, run **`usecase-recorder`** first and use its saved paths and cut list.

## House rules
- Ask once for the person's naming rules: how product names are spoken (write them phonetically in the narration text only; on screen keep the real spelling) and what the model should be called on camera. If a model or provider name must not appear, no frame may show it: the IDE's model picker, error/retry text, task logs. Mask it (step 3) or cut it.
- Agent shots show **only the agent panel** (crop), never the whole IDE. Salesforce results are shown full frame from the clean browser window.
- Narration claims only what the recording proves. Keep honest caveats (e.g. "coverage is up but still short of 75%").
- Default voice: Kokoro `af_heart` at speed **0.95**, music ducked ~10 dB under voice, SFX: chord on intro/end card, whoosh on scene cuts, pop when a Salesforce result appears. Deliver at -14 LUFS.
- Keep the recorder's cut list out: personal pop-ups, other windows, error stretches.

## Two cuts
| Cut | What it is | Time |
|---|---|---|
| **demo** (default when time is short) | Real footage, branded header bars, captions, time-lapse agent panel, Salesforce screens, narration + SFX + music. Built by `scripts/build_film.js`. | ~30-40 min for 4 use cases |
| **film** | Animated kit scenes (kinetic type, card stacks, cursor paths) using recording frames as UI plates, via `cinematic-video-director`. | 1-2 h |

Ask once which cut and the length limit (default under 5 min) if not given; state the default you chose otherwise.

## Needs
Node, ffmpeg/ffprobe, Python with `opencv-python`, `numpy`, `soundfile` and `kokoro-onnx` (plus the `kokoro-v1.0.onnx` and `voices-v1.0.bin` model files), a music bed (wav) and an SFX folder with `chord.wav`, `whoosh.wav`, `swoosh.wav`, `pop.wav`. Work in a new folder per film. Check free RAM first; run heavy ffmpeg jobs one at a time.

## Pipeline (demo cut)
1. **Pick clips.** Make contact sheets (`usecase-recorder/scripts/sheet.ps1`, every 15-75 s depending on length) and read them. For exact moments (prompt pasted, question shown, result on screen) tile a short range every 2-4 s. Per use case aim for: prompt (real speed, 7-11 s) -> agent working (time-lapse 24-120x to ~14 s) -> the agent's question/answer -> fixes/build -> the agent's own summary -> Salesforce result (1-3.5x) -> live test if any.
2. **Crops.** Built-in crops for 1918x1016 recordings of a maximized VS Code-style IDE: `HOME` [1030,880,362,59] agent home screen with prompt box; `CHAT` [830,540,362,59] chat panel when the terminal is open; `CHATFULL` [830,880,362,59] chat panel without terminal; `PAGE` [1900,620,0,345] for web screenshots. Check one frame per clip; add or override crops in `plan.crops` if the layout differs.
3. **Hide a model name (if needed).** Look at a frame of every agent clip. If a label must be hidden, cut the label from a real frame (`find` PNG) and make the label to show at the same size (`replace` PNG, ideally cut from a frame where the IDE shows it, so it looks native), list them in a `masks.json`, and pre-render that range with `python scripts/mask.py <src> <from> <to> <speed> <out.mp4> masks.json`. Use the masked file in the plan with `from 0`, `speed 1`. Verify `masked` ~= `frames` and eyeball 2-3 frames. Labels at a different size (home screen vs chat) need their own pair.
4. **Plan.** Copy `references/plan.example.json`, fill `brand`, `recordings`, `lines` (one narration line per section, 1-2 sentences, ~2.3 words/s) and `sections` (`card`, `agent`, `web`, `still` clips with tag/title/caption). Sections stretch to fit their narration by holding the last frame.
5. **Voice.** `python scripts/vo.py plan.json <kokoro model dir>` (set `PYTHONIOENCODING=utf-8`).
6. **Build.** `node scripts/build_film.js plan.json` (run in background). Clips already at the right length are reused, so re-voicing or caption fixes re-render only what changed.
7. **QA before sending:** contact sheet of the final every 6 s; `blackdetect`; `ebur128` (about -14 LUFS); duration under the limit; no hidden model/provider name in any frame; no cut-list item; narration doesn't run past its section. Note anything not fixed.
8. **Deliver:** send the file and give its path, length and a short outline. Tell the person an in-chat preview may play muted; open it in a normal player.

## Brand
`plan.brand` takes `primary`, `accent`, `ink`, `background` (ffmpeg colours like `0x1F3A5F`), `fontBold`, `fontRegular` (TTF paths), `logo` (corner logo on content shots), `logoReversed` (on cards) and `pattern` (card background). Anything missing falls back to a neutral look and Arial; `build_film.js` warns when a font path is missing. If the brand's fonts aren't installed, ask the person before downloading them.

## Lessons from real runs
- A plain demo cut was not what was wanted when the person said "same style": confirm whether they mean the voice/sound (fast) or the animated film cut (slow) before building.
- Snipping Tool recordings can end early silently; check the last frame of every source before planning around it.
- Several parallel decodes of 1080p sources ran out of memory on a 16 GB machine; mask/render sequentially.
