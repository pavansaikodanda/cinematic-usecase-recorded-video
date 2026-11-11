# Speeds up a range of a screen recording and paints a replacement image over every on-screen label that matches a
# template (e.g. hide the real model name in an IDE's model picker behind the label you want shown). Output is a
# full-frame clip already sped up; use it in the plan with from=0, to=<its length>, speed=1.
# masks.json: [{"find": "tpl.png", "replace": "rep.png", "fill": 0}, ...]  (paths relative to masks.json;
#   find = label cut from a real frame, replace = the label to show at the same size, fill = extra white width to clear)
# Check a few frames afterwards: "masked" should equal "frames" whenever the label is on screen.
# usage: python mask.py src from to speed out.mp4 masks.json
import json, os, sys, subprocess, numpy as np, cv2
src, a, b, S, out, mj = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5], sys.argv[6]
probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src], capture_output=True, text=True).stdout.strip().split(',')
W, H = int(probe[0]), int(probe[1])
D = os.path.dirname(os.path.abspath(mj))
T = []  # (template gray, replacement, white-fill width)
for m in json.load(open(mj, encoding='utf8')):
	T.append((cv2.cvtColor(cv2.imread(os.path.join(D, m['find'])), cv2.COLOR_BGR2GRAY), cv2.imread(os.path.join(D, m['replace'])), int(m.get('fill', 0))))
dec = subprocess.Popen(['ffmpeg', '-v', 'error', '-nostdin', '-threads', '2', '-ss', str(a), '-to', str(b), '-i', src, '-vf', f'setpts=(PTS-STARTPTS)/{S},fps=30', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], stdout=subprocess.PIPE)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '30', '-i', '-', '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', out], stdin=subprocess.PIPE)
n = hits = 0
while True:
	buf = dec.stdout.read(W * H * 3)
	if len(buf) < W * H * 3: break
	f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).copy()
	g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY)
	for tpl, rep, fw in T:
		th, tw = tpl.shape; rh, rw = rep.shape[:2]
		r = cv2.matchTemplate(g, tpl, cv2.TM_CCOEFF_NORMED)
		for _ in range(3):
			_, mv, _, (x, y) = cv2.minMaxLoc(r)
			if mv < 0.75: break
			hits += 1
			f[y:y + th, x:x + max(tw, fw)] = 255
			yy = max(0, y - (rh - th) // 2); ww = min(rw, W - x)
			f[yy:yy + rh, x:x + ww] = rep[:, :ww]
			r[max(0, y - th):y + th, max(0, x - tw):x + tw] = -1
	enc.stdin.write(f.tobytes()); n += 1
enc.stdin.close(); enc.wait(); dec.wait()
print(out, 'frames', n, 'masked', hits)
