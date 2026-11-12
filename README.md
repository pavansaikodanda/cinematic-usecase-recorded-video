# cinematic-usecase-recorded-video

An agent skill that turns use case recordings into a branded explainer video. The video has narration, music and sound effects, shots of the agent panel only, and real Salesforce result screens. It can also mask a model name.

It builds on [usecase-recorder](https://github.com/pavansaikodanda/usecase-recorder).

See [SKILL.md](SKILL.md) for the pipeline, [references/voiceover-guide.md](references/voiceover-guide.md) for writing and producing the voice-over, and [references/plan.example.json](references/plan.example.json) for the edit plan. Colours, fonts, logos and the pattern are set in the plan's `brand` block.

**Requirements:** Node, ffmpeg and ffprobe, and Python with `opencv-python`, `numpy`, `soundfile` and `kokoro-onnx`.

**Install:** copy this folder into your skills directory (for example `~/.claude/skills/cinematic-usecase-recorded-video`), or zip it and upload it as a skill.
