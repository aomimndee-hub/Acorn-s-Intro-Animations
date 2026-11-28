# Acorn's Intro Animations — Owlbear Rodeo extension

A cinematic **crystal-shatter intro cutscene** for [Owlbear Rodeo](https://www.owlbear.rodeo).
The GM picks a token, presses play, and every player at the table sees a fullscreen
cutscene with music. The text cues are timed to the soundtrack, and **the chosen token
appears right after the line _"get out of my head"_**.

ส่วนขยาย Owlbear Rodeo สำหรับเล่นอนิเมชั่นเปิดตัว token แบบคัตซีน
GM เลือก token แล้วกดเล่น ผู้เล่นทุกคนจะเห็นอนิเมชั่นเต็มจอพร้อมเพลง ข้อความทุกบรรทัดตรงจังหวะเพลง
และ **token ที่ GM เลือกจะปรากฏหลังข้อความ "get out of my head"**

---

## ติดตั้ง / Install

1. Push this repo to GitHub, then go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   (ไปที่ Settings → Pages แล้วเลือก Source เป็น **GitHub Actions**)
2. Push to `main`. The **Deploy to GitHub Pages** workflow builds and publishes the site.
   (push เข้า `main` แล้ว workflow จะ build และ deploy ให้อัตโนมัติ)
3. In Owlbear Rodeo: **Profile → Extensions → Add Custom Extension** and paste
   (ใน Owlbear Rodeo ไปที่ Extensions → Add Custom Extension แล้ววางลิงก์นี้)

   ```
   https://aomimndee-hub.github.io/Acorn-s-Intro-Animations/manifest.json
   ```
4. Enable the extension in your room.

## ใช้งาน / How to use

- **Popover:** click the crystal icon in the toolbar, select a token on the map, then
  **▶ Play for everyone**. **Preview only for me** plays it on your screen only.
  (กดไอคอนคริสตัล → เลือก token → กด Play for everyone)
- **Right-click:** right-click any image token → **Break Through**, **Anchor**, **Compass** or **Spica** (GM only).
  (คลิกขวาที่ token → Break Through, Anchor, Compass หรือ Spica)
- **Name / subtitle:** the name defaults to the token's label. You can rename it and add a subtitle.
- **Reveal on map:** if ticked, a hidden token becomes visible on the map when the intro ends.
  (ติ๊ก “Make the token visible…” เพื่อให้ token ที่ซ่อนอยู่ปรากฏบนแผนที่หลังจบอนิเมชั่น)
- Each viewer can set their own **volume** in the popover and **Skip** (or press `Esc`).

## Animations / ตัวเลือกอนิเมชัน

The GM chooses the animation from the **Animation** menu in the popover.
(GM เลือกอนิเมชันจากเมนู **Animation** ในหน้าต่างของ Extension)

- **Break Through:** the original one-token crystal cutscene, synced to music.
- **All Out Attack** *(under maintenance: switched off while it is being reworked)***:** 1–4 player tokens appear in panes of glass, the glass shatters, and the team rushes
  1 target in black silhouette. The lead then lands, rises into a pose, and ends on a comic-style card.
  Every cue follows `public/audio/finisher.mp3`.
  (ฝั่งผู้เล่น 1–4 ตัวเปิดตัวในกระจก พุ่งโจมตีเป้าหมาย 1 ตัวเป็นเงาดำ แล้วตัวหลักลงมายืนตอนจบ)
- **Anchor:** a two-tone (electric blue / white) lyric cutscene of about 46 s for one token. The token's name
  opens the video, then the token floats underwater, stands under an umbrella in the rain, sits on a beach,
  rides an anchor inside a magic circle, tumbles on the beat between film strips, clings to a swinging
  anchor, and falls through the sky. The title card text (default `ANCHOR`) can be changed in the popover.
  Every cut follows `public/audio/anchor.mp3` (about 190 BPM; the beat grid drives the film-strip section).
  The anchor, its chain, the magic circle, the towers and the flying-V guitar are real 3D models
  (`src/anchor/three.js`, Three.js) with two-tone blue/white shading; the token stays on the 2D layer so
  tokens hosted without CORS headers still work. Without WebGL, 2D drawings stand in.
- **Compass:** a 47 s cutscene for one token in 3D, in navy and gold. Chrome serif lyrics (HOLD / ON /
  TIGHT / MY COMPASS is CURIOSITY …) are real 3D text with a bloom pass. The token appears only twice:
  standing at the centre of the glowing pool in a basin of rocks (with its reflection in the water), and
  bound inside a golden rope ("you and me"). On "let us…" cracks spread across the screen beat by beat,
  and on "BE" the whole frame shatters into glass shards that fly outward into FREE. It ends under a gold
  four-point star over a rising and falling tide ("high tide / low tide") and an old-TV switch-off.
  Code: `src/compass/gl.js` (3D) and `src/compass/scene.js` (timeline, 2D effects), music `public/audio/compass.mp3`.
  (อนิเมชัน 3D โทนน้ำเงินกรมท่า-ทอง token ปรากฏตอนยืนกลางแอ่งน้ำวนกับตอนถูกเชือกทองมัด แล้วจอร้าวและแตกเป็นเศษกระจก)
- **Spica:** a silver, star-lit cutscene of about 49 s for one token, timed to `public/audio/spica.mp3`
  (~117 BPM, bars of 2.06 s). The first half follows the source video re-timed onto the song:
  "PEACE" / "SALVATION" / "THE LAST HOPE" inside a turning ornate halo, a star with "Now, let's bring back
  the lost light.", rotating squares with "There's nothing to fear anymore...", then the title on the drop
  (16.23 s) with light beams crossing on every bar, and a turning glint with the crest on three bars.
  In the break the Virgo constellation lights up and its lines gather into the token's silhouette.
  The finale (34.8 s to the end) is an original design: the token is revealed in colour, and each bar
  adds a motif (halo rings, the square star, warp streaks, constellation sparks, the crest and the name
  card) before a white-out on the last beat. The title text (default `Spica`) can be changed in the popover.
  (ครึ่งแรกตามวิดีโอต้นฉบับแต่ตรงจังหวะเพลง ช่วงหลังจาก 34.8 วิ ออกแบบใหม่ token ถือกำเนิดจากกลุ่มดาว)
- **Sortilege:** an 18.9 s opening title, no token needed. "a new era of sorcery" glitches in on black;
  a warm sepia light opens onto engraved Gothic columns, a window and a lantern over dictionary text, with the
  torn-paper label "I. The magic of time" typing on; a page curl turns to a violet library (lamp, books,
  star map) and "II. The fount of knowledge"; a flash into lilac brings luminous clock, sun and bead chains
  with "III. The sight of everything imaginable" pulling together; then "~SORTILEGE~ the spellkeeper",
  a grey flash and a fade to black. All drawings are generated in `src/sortilege/art.js`; the title text can
  be changed in the popover. Music: `public/audio/sortilege.mp3`.
  (ฉากเปิดไม่ใช้ token: ตัวอักษร glitch, ภาพลายเส้นโกธิกโทนซีเปีย, พลิกหน้ากระดาษเข้าห้องสมุดม่วง, ฉากชมพูม่วงกับนาฬิกาและดวงอาทิตย์, จบที่ชื่อ SORTILEGE)
- **Star that doesn't Exist:** a 43 s cutscene for one token, following the GM's storyboard. Feathers fall in
  S-curves as a gold star lights up and a dark glass lyric card slides out of the vanishing point in perspective; a 3D space colony (an O'Neill cylinder
  of buildings, domes, rings and mirrors, `src/star/colony.js`) drifts across from the left; a cut to the
  pastel moon with feathers falling from it; black bars close in, a breath of silence, a white flash on the
  drop (25.4 s) as the bars snap open and the camera pulls back from the token; it floats before god rays
  and a turning star-chart medallion, feathers burst out and swirl, comet ribbons orbit it, a distant moon
  and gold star (with hexagonal aperture ghosts) sit behind, and a shockwave rings out on every bar. It ends on
  "Ascende verso lumen astria nonexa" and the title "Star that doesn't Exist".
  The lyric lines live in `LYRICS` in `src/star/scene.js`: they are timed to the vocal phrases, and the words
  are stand-ins until the real lyrics are added. Music: `public/audio/star.mp3`.
  (ตามสตอรี่บอร์ด: ขนนก, ยาน space colony 3D, ดวงจันทร์, แถบดำ+แฟลช, token ลอยในอวกาศ; เนื้อเพลงแก้ได้ที่ LYRICS)
- **Forsaken:** an 88 s Rochas313-style cutscene in a blocky 3D Roblox world (`src/forsaken/world.js`): R6
  characters, a stud baseplate farm and the giant stepped tree Nosoi. Dialogue under the tree, then the music
  hits: red and white posterize with pixel lyrics, rot spreading over the tree, a red chorus of tall serif
  words before rays, inverted cyan flashes, dead trees in sepia, and the last question, "WHY HAVE YOU FORSAKEN
  ME?". The GM picks the player's **role** (the infected one, in Rochas's place, or the one Nosoi calls at the
  end) and how the player is **shown** (a Roblox character with a name tag, or the token image). Lyrics follow
  the audio, timed in `src/forsaken/scene.js`. Music: `public/audio/forsaken.mp3` (FORSAKEN cover, 0:51–2:19).
  (อนิเมชันโทนน้ำเงิน-ขาว token 1 ตัว ชื่อ token ขึ้นตอนเปิด แล้วไปตามฉากใต้น้ำ ฝน ชายหาด สมอ ฟิล์ม และท้องฟ้า)

*(All Out Attack is under maintenance right now; this section applies once it is back.)*
To play All Out Attack, select 2–5 tokens: **the first is the lead and the last is the target**. Then press
**▶ Play for everyone** or right-click → **All Out Attack**. In the popover, click a card to put the selected
token there, and press **Lead** to choose the main character. Transparent PNG tokens give the best silhouettes.

## Break Through cue sheet (synced to `public/audio/intro.mp3`)

The audio is the master clock: every frame is drawn from `audio.currentTime`, so picture and
music cannot drift apart. Times are in seconds of the original soundtrack; the bundled mp3 starts at 4.4 s.

| Time | Beat |
|---|---|
| 4.62 | Cut from black — colossal crystal pillar, a spark ignites |
| 6.30 | `i - started with few` |
| 7.62 → 8.15 | Squeeze to a slit → the crystal tip |
| 10.10 | `ii - only less it gets.` |
| 11.95 | Violet nebula, a new star swells |
| 13.70 | `iii - time by time, now empty` |
| 15.65 | White flash — giant star vs crystal blade |
| 17.45 | Everything inverts to ink: `iv - and there was nothing left.` |
| 18.45 | Black. `get out of my head` |
| **19.45** | **Whiteout → the selected token is revealed** |
| 21.30 | `it wasn't gone` |
| 25.10 | `with only 5 fragments left` |
| 26.90 → 28.50 | `how / much / do / you / believe / in / this / world?` (word by word) |
| 30.00 | Surge — shockwave, shard burst, **token name card** |
| 31.40 | Colour drains to monochrome |
| 32.10 → 33.45 | Final squeeze, grey flash, fade out |

## Effects

Everything is drawn live on a single canvas, with no video files:
faceted crystal prisms with light flowing inside them and chromatic dispersion along their edges,
starbursts with anamorphic lens streaks and hexagonal lens ghosts, partial ripple rings,
drifting nebula smoke, rising crystal shards, god rays, glowing wing ribbons, orbit rings drawn
in front of and behind the token, an over-exposed "born from light" token entrance with an
RGB-split fringe, shockwaves, film grain, letterbox squeezes, camera shake on every hit, and the
white→grey→dark subtitle cards.

## Development

```bash
npm install
npm run dev      # serves http://localhost:5173/Acorn-s-Intro-Animations/manifest.json
npm run build    # outputs dist/
```

Add `http://localhost:5173/Acorn-s-Intro-Animations/manifest.json` as a custom extension to test
locally. Open `intro.html` directly to watch the cutscene with a demo token, or add
`?seek=20.5` to freeze any moment of the timeline.

| File | Purpose |
|---|---|
| `src/background.js` | Listens for the play broadcast on every client and opens the fullscreen modal; adds the right-click menu |
| `src/popover.js` | GM controls (token preview, name, subtitle, reveal, volume) |
| `src/intro.js` | Loads token, fonts and audio; drives the renderer from the audio clock |
| `src/cutscene/timeline.js` | The cutscene: every shot and cue, as a pure function of time |
| `src/cutscene/draw.js` | Crystals, stars, rings, shards, ribbons, subtitle cards |
| `src/cutscene/sprites.js` | Procedurally generated glow, starburst, smoke, ink and token silhouettes |

## Audio

`public/audio/intro.mp3` is the user-supplied soundtrack, trimmed to the cutscene (4.4 s – 35.4 s)
and loudness-normalised. The music belongs to its original creators; replace it with your own
track if you publish the extension. If you change the track, adjust `AUDIO_OFFSET` and `CUE` in
`src/cutscene/timeline.js`.
