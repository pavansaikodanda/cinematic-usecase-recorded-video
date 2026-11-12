# Voice-over guide

The voice-over carries the explainer. A viewer with the sound on and their eyes elsewhere should still understand each use case: what was asked, what the agent did, what came out of it, and what is left to do. The footage then proves what the voice says.

## 1. Script structure

Write one narration line per section, 1-2 sentences each. For every use case, follow this order:

| Beat | What the line says | Example |
|---|---|---|
| **Setup** | The business problem and the plain-words ask | "A customer sends a purchase order as a PDF. We ask the agent to turn it into a quote." |
| **Work** | What the agent does, as verbs the viewer can see on screen | "It reads the PO, checks the products and prices, and asks about the currency before it creates anything." |
| **Decision** (if any) | Where a person stays in control | "We pick three of the fourteen issues. Nothing is changed without a yes." |
| **Result** | The proven outcome, with the real numbers on screen | "Here is the quote: ninety three thousand, six hundred and fifty dollars, three lines, matching the PO." |
| **Caveat / next step** | What is not done yet, or what the person needs to do next | "Coverage is up, but still short of seventy five percent. That is the next fix." |

Bookend the film with two lines:
- An **intro line** that names what the viewer is about to see and how many use cases there are.
- A **closing line** with the takeaway, plus the call to action if the person gave one.

## 2. Writing rules
- **One idea per line.** The default voice speaks about 3 words per second, so a 10-second shot holds about 25-30 words. `vo.py` warns when a line is longer than 2 sentences, 32 words or 12 s spoken.
- **Say what the viewer must do or decide**, not only what happened: "Review the three fixes, then approve the deploy." This turns the film from a show into an explanation.
- **Only claim what the recording proves.** Use real numbers and names from the result screens. Keep the honest caveats; never round failures into success.
- **Speak for the ear.** Use short words and active verbs. Avoid acronyms where you can; where you can't, spell them for the voice ("P O", "A P I"). Write numbers out the way they should be spoken ("ninety three thousand, six hundred and fifty dollars").
- **Spell names phonetically in the narration text only.** On screen, keep the real spelling in titles and captions.
- **No narration of UI clicks** ("now we click the button"). Describe the outcome instead.
- **Captions agree with the voice but don't repeat it word for word.** The caption carries the number or name; the voice carries the meaning.

## 3. Produce
1. Fill `lines` in plan.json and point each section's `vo` at its line(s).
2. Run `python scripts/vo.py plan.json <kokoro model dir>`. It writes one wav per line, `audio/durations.json` and `audio/script.md` (the full script with length and pace per line), and prints warnings.
3. **Fix every warning** by shortening the text, not by speeding up the voice. Re-voice only the lines you changed: `python scripts/vo.py plan.json <model dir> L03 L07`.
4. **Listen to every line once.** Check names, acronyms and numbers. When a word is mispronounced, respell it and re-voice that line.
5. Show `audio/script.md` to the person before the final build when time allows. Changing words now is cheap; re-rendering later is not.

The voice defaults to `af_heart` at speed 0.95. Override it with `voice` and `speed` in plan.json, and keep one voice for the whole film.

## 4. Sync and mix (`build_film.js` does this)
- Each section's narration starts 0.5 s after the section's first frame, with a 0.4 s gap between lines. The section holds its last frame until the voice ends, so a voice line is never cut off.
- Under the voice, the music is ducked by about 10 dB (sidechain, 120 ms attack and 400 ms release). The whole mix is normalized to -14 LUFS.
- If a section now holds a frozen frame for too long, the line is too long for its shot: shorten the line, or give the section a longer clip.

## 5. QA the voice in the final cut
- Play the whole film once with your eyes closed. Every use case should still make sense; if one doesn't, its setup or result line is missing something.
- Check that every result line lands while its result is on screen, and that no line runs into the next section.
- Check that no spoken word names something the person asked to hide (for example a model or provider name).
