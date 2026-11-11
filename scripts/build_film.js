// Builds a branded explainer from use case screen recordings, driven by an edit plan (see references/plan.example.json).
// Agent footage is cropped to the agent panel; web-app footage is shown full frame; narration starts at each section,
// sections stretch (last frame held) to fit their narration; SFX on cuts and results; music ducked under the voice.
// Brand (colours, fonts, logos, pattern) comes from plan.brand; anything left out falls back to a neutral look.
// Clips already rendered at the right length are reused, so re-runs after a voice change are fast.
// usage: node build_film.js plan.json
const { execFileSync } = require("child_process")
const fs = require("fs")
const path = require("path")
const P = JSON.parse(fs.readFileSync(process.argv[2], "utf8"))
const WORK = P.work, OUT = `${WORK}/clips`, AU = `${WORK}/audio/`
const B = P.brand || {}
fs.mkdirSync(OUT, { recursive: true })
const esc = (p) => p.replace(/\\/g, "/").replace(":", "\\:")
const font = (f, fallback) => {
	if (f && fs.existsSync(f)) return esc(f)
	if (f) console.warn(`WARNING: brand font ${f} not found; using ${fallback}`)
	return esc(fallback)
}
const FB = font(B.fontBold, "C:/Windows/Fonts/arialbd.ttf")
const F = font(B.fontRegular, "C:/Windows/Fonts/arial.ttf")
const PRIMARY = B.primary || "0x1F3A5F", ACCENT = B.accent || "0xE07A1F", INK = B.ink || "0x3A3A3A", BG = B.background || "0xF2F2F2"
const enc = ["-c:v", "libx264", "-threads", "3", "-preset", "veryfast", "-crf", "20", "-pix_fmt", "yuv420p", "-r", "30", "-an"]
const run = (args) => execFileSync("ffmpeg", ["-v", "error", "-y", "-nostdin", "-threads", "2", ...args], { stdio: "inherit" })
const VO = JSON.parse(fs.readFileSync(AU + "durations.json", "utf8"))
let tn = 0
const txt = (s, font, size, color, x, y) => {
	const f = path.join(OUT, `t${tn++}.txt`)
	fs.writeFileSync(f, s)
	return `drawtext=fontfile='${font}':textfile='${esc(f)}':expansion=none:fontsize=${size}:fontcolor=${color}:x=${x}:y=${y}`
}
const header = (tag, title) => [`drawbox=x=0:y=0:w=1920:h=140:color=${PRIMARY}:t=fill`, `drawbox=x=60:y=26:w=10:h=30:color=${ACCENT}:t=fill`, txt(tag, FB, 28, ACCENT, 84, 26), txt(title, FB, 46, "white", 60, 70)]
const fade = (d) => `fade=in:d=0.25,fade=out:st=${(d - 0.25).toFixed(2)}:d=0.25`
const hold = (h) => (h > 0 ? `,tpad=stop_mode=clone:stop_duration=${h.toFixed(3)}` : "")
const cached = (file, d) => {
	if (!fs.existsSync(file)) return false
	try { return Math.abs(parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString()) - d) < 0.06 } catch { return false }
}
const src = (k) => P.recordings[k] || k
// Named crops [w, h, x, y] for 1918x1016 recordings of a maximized VS Code-style IDE; override or extend with plan.crops.
const crops = { CHAT: [830, 540, 362, 59], CHATFULL: [830, 880, 362, 59], HOME: [1030, 880, 362, 59], PAGE: [1900, 620, 0, 345], ...(P.crops || {}) }
const crop = (c) => (typeof c === "string" ? crops[c] : c)
// Corner logo on content shots (input 2) when plan.brand.logo is set.
const logoIn = () => (B.logo ? ["-loop", "1", "-i", B.logo] : [])
const logoFx = () => (B.logo ? [`[2:v]scale=230:-1[lg]`, `[a][lg]overlay=1650:1000[b]`] : [`[a]null[b]`])

// Each clip spec -> { base seconds, sfx kind, render(name, holdSeconds) }
const make = {
	// Title / end card: brand pattern (or primary colour) with the reversed logo.
	card: (c) => ({ base: c.dur, kind: "chord", render: (name, h) => {
		const d = c.dur + h, file = `${OUT}/${name}.mp4`
		if (cached(file, d)) return d
		const lines = [txt(c.title, FB, 58, "white", "(w-text_w)/2", c.sub ? 540 : 560)]
		if (c.sub) lines.push(txt(c.sub, F, 34, ACCENT, "(w-text_w)/2", 650))
		if (c.foot) lines.push(txt(c.foot, F, 30, ACCENT, "(w-text_w)/2", 900))
		const ins = ["-f", "lavfi", "-i", `color=c=${PRIMARY}:s=1920x1080:r=30:d=${d}`]
		const g = ["[0:v]format=yuv420p[c0]"]
		let cur = "c0", i = 1
		if (B.pattern) { ins.push("-loop", "1", "-t", String(d), "-i", B.pattern); g.push(`[${i}:v]scale=1920:1920,crop=1920:1080:0:420,format=yuv420p[p]`); cur = "p"; i++ }
		if (B.logoReversed) { ins.push("-loop", "1", "-t", String(d), "-i", B.logoReversed); g.push(`[${i}:v]scale=560:-1,format=rgba,fade=in:st=0.2:d=0.6:alpha=1[lg]`, `[${cur}][lg]overlay=(W-w)/2:250[c1]`); cur = "c1"; i++ }
		g.push(`[${cur}]${lines.join(",")},${fade(d)}[o]`)
		run([...ins, "-filter_complex", g.join(";"), "-map", "[o]", "-t", String(d), ...enc, file])
		return d
	} }),
	// Coding agent panel only, sped up by speed.
	agent: (c) => ({ base: (c.to - c.from) / c.speed, kind: "whoosh", render: (name, h) => {
		const d = (c.to - c.from) / c.speed + h, file = `${OUT}/${name}.mp4`
		if (cached(file, d)) return d
		const [w, hh, x, y] = crop(c.crop)
		const sc = Math.min(1800 / w, 800 / hh), sw = Math.round((w * sc) / 2) * 2, sh = Math.round((hh * sc) / 2) * 2
		const parts = [...header(c.tag, c.title)]
		if (c.note) parts.push(txt(c.note, F, 26, INK, 60, 1010))
		const g = [`[1:v]crop=${w}:${hh}:${x}:${y},scale=${sw}:${sh}:flags=lanczos,setpts=(PTS-STARTPTS)/${c.speed},fps=30${hold(h)}[v]`, `[0:v][v]overlay=(W-w)/2:${140 + Math.round((840 - sh) / 2)}:shortest=1[a]`, ...logoFx(), `[b]${parts.join(",")},${fade(d)}[o]`].join(";")
		run(["-f", "lavfi", "-i", `color=c=${BG}:s=1920x1080:r=30:d=${d + 1}`, "-ss", String(c.from), "-to", String(c.to), "-i", src(c.src), ...logoIn(), "-filter_complex", g, "-map", "[o]", "-t", d.toFixed(3), ...enc, file])
		return d
	} }),
	// Web app (e.g. Salesforce) screen recording, full frame.
	web: (c) => ({ base: (c.to - c.from) / c.speed, kind: "pop", render: (name, h) => {
		const d = (c.to - c.from) / c.speed + h, file = `${OUT}/${name}.mp4`
		if (cached(file, d)) return d
		const g = [`[1:v]scale=1520:-2:flags=lanczos,setpts=(PTS-STARTPTS)/${c.speed},fps=30${hold(h)}[v]`, `[0:v][v]overlay=(W-w)/2:150:shortest=1[a]`, ...logoFx(), `[b]${[...header(c.tag, c.title), txt(c.caption, FB, 34, PRIMARY, 60, 1000)].join(",")},${fade(d)}[o]`].join(";")
		run(["-f", "lavfi", "-i", `color=c=${BG}:s=1920x1080:r=30:d=${d + 1}`, "-ss", String(c.from), "-to", String(c.to), "-i", src(c.src), ...logoIn(), "-filter_complex", g, "-map", "[o]", "-t", d.toFixed(3), ...enc, file])
		return d
	} }),
	// Screenshot still.
	still: (c) => ({ base: c.dur, kind: "pop", render: (name, h) => {
		const d = c.dur + h, file = `${OUT}/${name}.mp4`
		if (cached(file, d)) return d
		const [w, hh, x, y] = crop(c.crop || "PAGE")
		const sc = Math.min(1840 / w, 760 / hh), sw = Math.round((w * sc) / 2) * 2, sh = Math.round((hh * sc) / 2) * 2
		const g = [`[1:v]crop=${w}:${hh}:${x}:${y},scale=${sw}:${sh}:flags=lanczos,format=yuv420p[v]`, `[0:v][v]overlay=(W-w)/2:${150 + Math.round((770 - sh) / 2)}[a]`, ...logoFx(), `[b]${[...header(c.tag, c.title), txt(c.caption, FB, 36, PRIMARY, 60, 992)].join(",")},${fade(d)}[o]`].join(";")
		run(["-f", "lavfi", "-i", `color=c=${BG}:s=1920x1080:r=30:d=${d}`, "-loop", "1", "-t", String(d), "-i", c.img, ...(B.logo ? ["-loop", "1", "-t", String(d), "-i", B.logo] : []), "-filter_complex", g, "-map", "[o]", "-t", String(d), ...enc, file])
		return d
	} }),
}

const voPlace = [], sfx = [], names = []
let t = 0, n = 0
for (const s of P.sections) {
	const clips = s.clips.map((c) => make[c.type](c))
	const voLen = s.vo.reduce((x, k) => x + VO[k] + 0.4, 0) + 0.6
	const extra = Math.max(0, voLen - clips.reduce((x, c) => x + c.base, 0))
	let vt = t + 0.5
	for (const k of s.vo) { voPlace.push([k, vt]); vt += VO[k] + 0.4 }
	clips.forEach((c, i) => {
		const kind = c.kind === "whoosh" && i > 0 ? "swoosh" : c.kind
		sfx.push([kind, Math.max(0, t + (kind === "chord" ? 0.3 : kind === "pop" ? 0.35 : -0.05))])
		const name = String(n++).padStart(3, "0")
		names.push(name)
		t += c.render(name, i === clips.length - 1 ? extra : 0)
	})
	console.log("section ends", t.toFixed(1))
}
fs.writeFileSync(`${OUT}/list.txt`, names.map((x) => `file '${OUT}/${x}.mp4'`).join("\n"))
run(["-f", "concat", "-safe", "0", "-i", `${OUT}/list.txt`, "-c", "copy", `${WORK}/video.mp4`])

const ins = [], fl = []
voPlace.forEach(([k, at], i) => { ins.push("-i", `${AU}${k}.wav`); const ms = Math.round(at * 1000); fl.push(`[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v${i}]`) })
const nv = voPlace.length, gain = { chord: 0.5, pop: 0.45, whoosh: 0.4, swoosh: 0.3 }
const sins = [], sfl = []
sfx.forEach(([k, at], i) => { sins.push("-i", `${P.sfxDir}/${k}.wav`); const ms = Math.round(at * 1000); sfl.push(`[${nv + 2 + i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=${gain[k]},adelay=${ms}|${ms}[s${i}]`) })
const g = [
	...fl, ...sfl,
	`${voPlace.map((_, i) => `[v${i}]`).join("")}amix=inputs=${nv}:normalize=0,apad[vo]`,
	`${sfx.map((_, i) => `[s${i}]`).join("")}amix=inputs=${sfx.length}:normalize=0,apad[fx]`,
	`[${nv + 1}:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.22[mu]`,
	`[vo]asplit[vo1][vo2]`,
	`[mu][vo2]sidechaincompress=threshold=0.03:ratio=6:attack=120:release=400[md]`,
	`[vo1][md][fx]amix=inputs=3:normalize=0,afade=t=out:st=${(t - 2).toFixed(2)}:d=2,loudnorm=I=-14:TP=-1:LRA=11[a]`,
].join(";")
run(["-i", `${WORK}/video.mp4`, ...ins, "-stream_loop", "-1", "-i", P.music, ...sins, "-filter_complex", g, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", t.toFixed(3), "-movflags", "+faststart", P.out])
console.log("total", t.toFixed(1), "->", P.out)
