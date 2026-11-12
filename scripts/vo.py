# Voice-over: one trimmed wav per line from plan.json "lines" ({id: text}) plus durations.json, Kokoro af_heart at 0.95
# (the default voice). Also writes audio/script.md (the narration as a reviewable script, one row per line with the
# words, spoken length and pace) and warns about lines that are too long to follow (over 2 sentences, 32 words or 12 s spoken).
# Write product names phonetically in the text (e.g. how the brand should sound) so the voice pronounces them right.
# usage: python vo.py plan.json <kokoro model dir> [line ids to redo, e.g. L03 L07]
import json, os, re, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
P = json.load(open(sys.argv[1], encoding='utf8'))
M = sys.argv[2].rstrip('/\\') + '/'
only = set(sys.argv[3:])
O = P['work'] + '/audio/'
os.makedirs(O, exist_ok=True)
k = Kokoro(M + 'kokoro-v1.0.onnx', M + 'voices-v1.0.bin')
SR = 24000
def trim(x):
	th = 10 ** (-45 / 20); i = np.where(np.abs(x) > th)[0]; keep = int(.04 * SR)
	return x[max(0, i[0] - keep):i[-1] + keep + 1]
dj = O + 'durations.json'
d = json.load(open(dj)) if only and os.path.exists(dj) else {}
for n, t in P['lines'].items():
	if only and n not in only: continue
	s, _ = k.create(t, voice=P.get('voice', 'af_heart'), speed=P.get('speed', 0.95), lang='en-us')
	s = trim(s.astype(np.float32)); sf.write(O + n + '.wav', s, SR); d[n] = round(len(s) / SR, 3)
	print(n, d[n], flush=True)
json.dump(d, open(dj, 'w'), indent=1)

# Script review sheet + pacing warnings.
used = {v for s in P.get('sections', []) for v in s.get('vo', [])}
rows, warn = [], []
for n, t in P['lines'].items():
	words = len(t.split()); sentences = len([x for x in re.split(r'[.!?]+', t) if x.strip()])
	sec = d.get(n, 0); wps = words / sec if sec else 0
	rows.append(f'| {n} | {t} | {sec:.1f} s | {wps:.1f} w/s |')
	if sentences > 2 or words > 32: warn.append(f'{n}: {words} words / {sentences} sentences - split it or cut it (one idea per line)')
	if sec > 12: warn.append(f'{n}: {sec:.1f} s spoken - too long for one shot; split it or cut words')
	if n not in used: warn.append(f'{n}: not used by any section')
for s in P.get('sections', []):
	for v in s.get('vo', []):
		if v not in P['lines']: warn.append(f'section uses {v}, which has no text in "lines"')
open(O + 'script.md', 'w', encoding='utf8').write('# Voice-over script\n\n| Line | Narration | Length | Pace |\n|---|---|---|---|\n' + '\n'.join(rows) + f'\n\nTotal spoken: {sum(d.values()):.1f} s\n')
print('total', round(sum(d.values()), 1), '| script ->', O + 'script.md')
for w in warn: print('WARNING', w)
