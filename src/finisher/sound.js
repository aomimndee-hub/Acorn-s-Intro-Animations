// All sound is synthesised live, so this animation ships no audio files.
import { HITS, T } from "./scene.js";

export function createSound(volume) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  const ac = new Ctx();
  const master = ac.createDynamicsCompressor();
  const out = ac.createGain();
  out.gain.value = volume;
  master.connect(out).connect(ac.destination);

  const noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

  function whoosh(at, from, to, length, level) {
    const src = ac.createBufferSource();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    src.buffer = noise;
    src.loop = true;
    filter.type = "bandpass";
    filter.Q.value = 2.2;
    filter.frequency.setValueAtTime(from, at);
    filter.frequency.exponentialRampToValueAtTime(to, at + length);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + length * 0.14);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    src.connect(filter).connect(gain).connect(master);
    src.start(at, Math.random() * 0.8);
    src.stop(at + length);
  }

  function tone(at, type, from, to, length, level) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + length);
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + length);
  }

  const boom = (at, level = 0.8) => {
    tone(at, "sine", 130, 30, 0.75, level);
    whoosh(at, 900, 90, 0.55, level * 0.45);
  };

  return {
    context: ac,
    /** Schedules the whole score with t = 0 at `origin` (AudioContext time). */
    schedule(origin) {
      const at = (t) => origin + t;
      tone(at(0.02), "sawtooth", 58, 44, 2.3, 0.07);
      whoosh(at(0.05), 5200, 500, 0.34, 0.22);
      [0.75, 1.03, 1.3, 1.6].forEach((t) => tone(at(t), "triangle", 2600, 1800, 0.22, 0.05));
      whoosh(at(T.lock), 500, 7000, T.flash - T.lock, 0.13);
      tone(at(T.lock), "square", 1320, 1320, 0.07, 0.035);
      tone(at(T.lock + 0.14), "square", 1760, 1760, 0.09, 0.035);
      boom(at(T.flash), 0.72);

      HITS.forEach((hit, i) => {
        const pitch = 1 + i * 0.035;
        whoosh(at(hit.t), 7600 * pitch, 900, 0.11, 0.34);
        tone(at(hit.t), "sawtooth", 3300 * pitch, 720, 0.055, 0.075);
        tone(at(hit.t + 0.008), "square", 170, 62, 0.075, 0.2);
      });

      whoosh(at(T.last - 0.02), 11000, 700, 0.3, 0.55);
      boom(at(T.last), 0.8);
      tone(at(T.last + 0.03), "sine", 4200, 3900, 0.34, 0.05);
      boom(at(T.split), 0.95);
      whoosh(at(T.leap), 280, 3100, T.land - T.leap, 0.2);
      boom(at(T.land), 1);
      boom(at(T.card), 0.9);
      whoosh(at(T.card), 7000, 400, 0.38, 0.3);
    },
    close() {
      ac.close().catch(() => {});
    },
  };
}
