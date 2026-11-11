# Narration: one trimmed wav per line from plan.json "lines" ({id: text}) plus durations.json, Kokoro af_heart at 0.95 (the house voice).
# Write product names phonetically in the text (e.g. how the brand should sound) so the voice pronounces them right.
# usage: python vo.py plan.json <kokoro model dir>
import json, os, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
P = json.load(open(sys.argv[1], encoding='utf8'))
M = sys.argv[2].rstrip('/\\') + '/'
O = P['work'] + '/audio/'
os.makedirs(O, exist_ok=True)
k = Kokoro(M + 'kokoro-v1.0.onnx', M + 'voices-v1.0.bin')
SR = 24000
def trim(x):
	th = 10 ** (-45 / 20); i = np.where(np.abs(x) > th)[0]; keep = int(.04 * SR)
	return x[max(0, i[0] - keep):i[-1] + keep + 1]
d = {}
for n, t in P['lines'].items():
	s, _ = k.create(t, voice=P.get('voice', 'af_heart'), speed=P.get('speed', 0.95), lang='en-us')
	s = trim(s.astype(np.float32)); sf.write(O + n + '.wav', s, SR); d[n] = round(len(s) / SR, 3)
	print(n, d[n], flush=True)
json.dump(d, open(O + 'durations.json', 'w'), indent=1)
print('total', round(sum(d.values()), 1))
