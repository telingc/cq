// Original, synthesized audio: filtered rain under a quiet night-time lo-fi lullaby with a
// singing mallet melody over a soft pad, slow pedalled piano, round bass and a gentle steady beat.
export function createSoundscape() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  let context;
  let master;
  let music;
  let keysBus;
  let leadBus;
  let noiseBuffer;
  let whiteNoise;
  let nextStepTime = 0;
  let step = 0;
  let started = false;
  let starting = false;

  const bpm = 74;
  const eighth = 60 / bpm / 2;
  const frequency = note => 440 * 2 ** ((note - 69) / 12);

  // Chords as [bass pitch class, upper tones]. Everything stays inside F major; the
  // IV-V-iii-vi movement and the landings on D minor give the faint touch of sadness.
  const chordTones = {
    Bbmaj9: [10, [2, 5, 9, 0]], Cadd9: [0, [4, 7, 0, 2]], Csus: [0, [5, 7, 0, 2]],
    Am7: [9, [0, 4, 7, 9]], Dm9: [2, [5, 9, 0, 4]], Gm9: [7, [10, 2, 5, 9]],
    Fmaj9: [5, [4, 7, 9, 0]]
  };
  const progression = [
    ['Bbmaj9'], ['Cadd9'], ['Am7'], ['Dm9'], ['Gm9'], ['Am7'], ['Bbmaj9'], ['Csus', 'Cadd9'],
    ['Bbmaj9'], ['Cadd9'], ['Am7'], ['Dm9'], ['Gm9'], ['Cadd9'], ['Fmaj9'], ['Fmaj9']
  ];
  // Melody per bar as [eighth within the bar, MIDI note, length in eighths]: it rises through
  // the first phrase, sighs back down, climbs to its peak in bar 9 and comes home to F.
  const melody = [
    [[0, 69, 3], [3, 72, 1], [4, 74, 4]],
    [[0, 76, 3], [3, 74, 1], [4, 72, 2], [6, 74, 2]],
    [[0, 76, 4], [4, 79, 2], [6, 76, 2]],
    [[0, 74, 6], [6, 72, 1], [7, 69, 1]],
    [[0, 70, 3], [3, 69, 1], [4, 67, 2], [6, 69, 2]],
    [[0, 72, 3], [3, 76, 1], [4, 74, 2], [6, 72, 2]],
    [[0, 74, 3], [3, 72, 1], [4, 69, 2], [6, 65, 2]],
    [[0, 67, 6], [6, 69, 1], [7, 72, 1]],
    [[0, 74, 3], [3, 77, 1], [4, 81, 4]],
    [[0, 79, 3], [3, 76, 1], [4, 74, 2], [6, 76, 2]],
    [[0, 72, 4], [4, 69, 2], [6, 72, 2]],
    [[0, 74, 2], [2, 76, 1], [3, 77, 3], [6, 76, 2]],
    [[0, 74, 3], [3, 72, 1], [4, 70, 2], [6, 74, 2]],
    [[0, 72, 3], [3, 74, 1], [4, 76, 2], [6, 74, 2]],
    [[0, 72, 3], [3, 69, 1], [4, 67, 2], [6, 69, 2]],
    [[0, 65, 7]]
  ];

  // Pick the placement of each chord's tones (D3-G4) that moves least from the previous chord.
  function voiceLead(tones, previous) {
    const options = tones.map(pitchClass => {
      const notes = [];
      for (let note = 50; note <= 67; note++) if (note % 12 === pitchClass) notes.push(note);
      return notes;
    });
    let best;
    let bestCost = Infinity;
    const search = (index, chosen) => {
      if (index === options.length) {
        const voicing = [...chosen].sort((a, b) => a - b);
        let cost = voicing.reduce((sum, note, i) => sum + Math.abs(note - previous[i]), 0);
        if (voicing[1] - voicing[0] < 3) cost += 12;
        if (cost < bestCost) [best, bestCost] = [voicing, cost];
        return;
      }
      for (const note of options[index]) search(index + 1, [...chosen, note]);
    };
    search(0, []);
    return best;
  }
  // The second lap voices the first bar from the last one, so the loop seam is smooth too.
  const bars = [];
  let voicing = [52, 55, 57, 60];
  for (let lap = 0; lap < 2; lap++) {
    progression.forEach((names, bar) => {
      bars[bar] = names.map(name => {
        const [root, tones] = chordTones[name];
        voicing = voiceLead(tones, voicing);
        return { root: 33 + (root + 3) % 12, voicing };
      });
    });
  }

  // Warm, slowly swelling pad that overlaps into the next chord so changes never jolt.
  function pad(note, time, length) {
    const f = frequency(note);
    const filter = context.createBiquadFilter();
    const amp = context.createGain();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = .3;
    amp.gain.setValueAtTime(.0001, time);
    amp.gain.exponentialRampToValueAtTime(.011, time + .9);
    amp.gain.setValueAtTime(.011, time + length);
    amp.gain.exponentialRampToValueAtTime(.0001, time + length + 1.2);
    for (const detune of [-6, 6]) {
      const osc = context.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = f;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(time);
      osc.stop(time + length + 1.25);
    }
    filter.connect(amp).connect(keysBus);
  }

  // Mellow electric piano; held notes overlap as if the sustain pedal were down.
  function keys(note, time, length, level) {
    const f = frequency(note);
    const carrier = context.createOscillator();
    const modulator = context.createOscillator();
    const brightness = context.createGain();
    const amp = context.createGain();
    carrier.frequency.value = f;
    modulator.frequency.value = f;
    brightness.gain.setValueAtTime(f * (.5 + level * .8), time);
    brightness.gain.exponentialRampToValueAtTime(f * .1, time + .9);
    modulator.connect(brightness).connect(carrier.frequency);
    const peak = .042 * level;
    amp.gain.setValueAtTime(.0001, time);
    amp.gain.exponentialRampToValueAtTime(peak, time + .008);
    amp.gain.exponentialRampToValueAtTime(peak * .35, time + length);
    amp.gain.exponentialRampToValueAtTime(.0001, time + length + .6);
    carrier.connect(amp).connect(keysBus);
    for (const osc of [carrier, modulator]) {
      osc.start(time);
      osc.stop(time + length + .65);
    }
  }

  // Struck bars: the fundamental rings for the note's length, upper partials fade quickly.
  function mallet(note, time, length, level, partials, peakLevel) {
    const f = frequency(note);
    for (const [ratio, partialLevel, decay] of partials) {
      const osc = context.createOscillator();
      const amp = context.createGain();
      const peak = peakLevel * level * partialLevel;
      osc.frequency.value = f * ratio;
      amp.gain.setValueAtTime(.0001, time);
      amp.gain.exponentialRampToValueAtTime(peak, time + .004);
      let end = time + decay;
      if (ratio === 1) {
        amp.gain.exponentialRampToValueAtTime(peak * .35, time + length);
        end = time + length + .7;
      }
      amp.gain.exponentialRampToValueAtTime(.0001, end);
      osc.connect(amp).connect(leadBus);
      osc.start(time);
      osc.stop(end + .02);
    }
  }
  const softMallet = (note, time, length, level) =>
    mallet(note, time, length, level, [[1, 1], [4, .14, .45], [10, .025, .1]], .095);
  const celesta = (note, time, length, level) =>
    mallet(note, time, length, level, [[1, 1], [2, .14, .6], [3, .05, .3]], .05);

  function bass(note, time, length) {
    const f = frequency(note);
    const body = context.createOscillator();
    const fundamental = context.createOscillator();
    const fundamentalLevel = context.createGain();
    const filter = context.createBiquadFilter();
    const amp = context.createGain();
    body.type = 'triangle';
    body.frequency.value = f;
    fundamental.frequency.value = f;
    fundamentalLevel.gain.value = .7;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(700, time);
    filter.frequency.exponentialRampToValueAtTime(300, time + .5);
    amp.gain.setValueAtTime(.0001, time);
    amp.gain.exponentialRampToValueAtTime(.064, time + .03);
    amp.gain.exponentialRampToValueAtTime(.03, time + length);
    amp.gain.exponentialRampToValueAtTime(.0001, time + length + .35);
    body.connect(filter);
    fundamental.connect(fundamentalLevel).connect(filter);
    filter.connect(amp).connect(music);
    for (const osc of [body, fundamental]) {
      osc.start(time);
      osc.stop(time + length + .4);
    }
  }

  function kick(time, level) {
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.frequency.setValueAtTime(88, time);
    osc.frequency.exponentialRampToValueAtTime(46, time + .16);
    amp.gain.setValueAtTime(.0001, time);
    amp.gain.exponentialRampToValueAtTime(.045 * level, time + .008);
    amp.gain.exponentialRampToValueAtTime(.0001, time + .3);
    osc.connect(amp).connect(music);
    osc.start(time);
    osc.stop(time + .32);
  }

  function noiseHit(time, level, type, cutoff, attack, decay) {
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const amp = context.createGain();
    source.buffer = whiteNoise;
    filter.type = type;
    filter.frequency.value = cutoff;
    filter.Q.value = .5;
    amp.gain.setValueAtTime(.0001, time);
    amp.gain.exponentialRampToValueAtTime(level, time + attack);
    amp.gain.exponentialRampToValueAtTime(.0001, time + decay);
    source.connect(filter).connect(amp).connect(music);
    source.start(time, Math.random() * .7);
    source.stop(time + decay + .02);
  }
  const snare = time => noiseHit(time, .026, 'bandpass', 1900, .01, .16);
  const hat = (time, level) => noiseHit(time, .014 * level, 'highpass', 7000, .006, .06);

  function scheduleStep(index, time) {
    const bar = Math.floor(index / 8) % 16;
    const lap = Math.floor(index / 128) % 2;
    const position = index % 8;
    const chords = bars[bar];
    const half = chords.length === 2 && position >= 4;
    const chord = chords[half ? 1 : 0];
    const segmentStart = half ? 4 : 0;
    const segmentEnd = chords.length === 2 && !half ? 4 : 8;
    const loose = spread => time + (Math.random() - .5) * spread;

    // Accompaniment: a sustained pad, the chord broken slowly upward on the piano, a long bass note.
    if (position === segmentStart) {
      for (const note of chord.voicing) pad(note, time, (segmentEnd - segmentStart) * eighth);
    }
    if (position % 2 === 0) {
      const tone = chord.voicing[(position - segmentStart) / 2];
      keys(tone, loose(.012), (segmentEnd - position) * eighth, .52 + Math.random() * .08);
    }
    if (position === 0) bass(chord.root, time, 7.6 * eighth);

    // The melody carries all the movement; on the second lap a music box joins an octave up.
    const lead = melody[bar].find(([at]) => at === position);
    if (lead) {
      const [, note, length] = lead;
      const level = (length >= 3 ? 1 : .86) * (.94 + Math.random() * .12);
      softMallet(note, loose(.01), length * eighth, level);
      if (lap === 1) celesta(note + 12, loose(.01), length * eighth, level * .3);
    }

    // A soft, even pulse that never changes.
    hat(loose(.004), position % 2 ? .6 : .8);
    if (position === 0 || position === 4) kick(time, position ? .8 : 1);
    if (position === 2 || position === 6) snare(loose(.006));
  }

  function schedule() {
    const now = context.currentTime;
    // After the tab has been throttled, skip missed steps instead of playing them all at once.
    while (nextStepTime < now) {
      nextStepTime += eighth;
      step++;
    }
    const horizon = now + (document.hidden ? 1.6 : .3);
    while (nextStepTime < horizon) {
      scheduleStep(step++, nextStepTime);
      nextStepTime += eighth;
    }
  }

  function impulse(seconds) {
    const rate = context.sampleRate;
    const length = Math.floor(rate * seconds);
    const buffer = context.createBuffer(2, length, rate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      let smooth = 0;
      for (let i = Math.floor(rate * .015); i < length; i++) {
        const t = i / length;
        smooth += (Math.random() * 2 - 1 - smooth) * (.5 - t * .4);
        data[i] = smooth * (1 - t) ** 2.4;
      }
    }
    return buffer;
  }

  function crackleBuffer() {
    const length = context.sampleRate * 3;
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] += (Math.random() * 2 - 1) * .015;
      if (Math.random() < .00015) {
        const pop = (Math.random() * 2 - 1) * (.4 + Math.random() * .6);
        for (let k = 0; k < 24 && i + k < length; k++) {
          data[i + k] += pop * Math.exp(-k / 4) * (k % 2 ? -1 : 1);
        }
      }
    }
    return buffer;
  }

  // Raise a gain from silence along a smoothstep curve (squared for the music, so it starts
  // almost imperceptibly and lands without a kink), using short linear ramps every browser
  // schedules reliably.
  function swell(param, target, duration, power) {
    const start = context.currentTime;
    param.setValueAtTime(0, start);
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      param.linearRampToValueAtTime(target * (t * t * (3 - 2 * t)) ** power, start + duration * t);
    }
  }

  function setup() {
    master = context.createGain();
    master.gain.value = .58;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -24;
    compressor.ratio.value = 2.5;
    master.connect(compressor).connect(context.destination);

    const sampleRate = context.sampleRate;
    noiseBuffer = context.createBuffer(1, sampleRate * 4, sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    let slow = 0;
    for (let i = 0; i < samples.length; i++) {
      const white = Math.random() * 2 - 1;
      slow = slow * .985 + white * .015;
      samples[i] = slow * 1.3 + white * .27;
    }
    const rain = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const rainLevel = context.createGain();
    rain.buffer = noiseBuffer;
    rain.loop = true;
    highpass.type = 'highpass';
    highpass.frequency.value = 180;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 2500;
    swell(rainLevel.gain, .15, 5, 1);
    rain.connect(highpass).connect(lowpass).connect(rainLevel).connect(master);
    rain.start();

    whiteNoise = context.createBuffer(1, sampleRate, sampleRate);
    const white = whiteNoise.getChannelData(0);
    for (let i = 0; i < white.length; i++) white[i] = Math.random() * 2 - 1;

    // The rain arrives first; the music rises slowly beneath it over twelve seconds.
    music = context.createGain();
    swell(music.gain, .8, 12, 2);
    // Lo-fi chain: gentle saturation, slow tape wobble, softened highs and a small room.
    const warmth = context.createWaveShaper();
    warmth.curve = Float32Array.from({ length: 1024 }, (_, i) => Math.tanh((i / 511.5 - 1) * 2.2) / 2.2);
    warmth.oversample = '2x';
    const tape = context.createDelay(.05);
    tape.delayTime.value = .015;
    for (const [rate, depth] of [[.43, .0008], [5.7, .00003]]) {
      const wobble = context.createOscillator();
      const amount = context.createGain();
      wobble.frequency.value = rate;
      amount.gain.value = depth;
      wobble.connect(amount).connect(tape.delayTime);
      wobble.start();
    }
    const tone = context.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.value = 4600;
    tone.Q.value = .5;
    const lowCut = context.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = 38;
    music.connect(warmth).connect(tape).connect(tone).connect(lowCut).connect(master);
    const room = context.createConvolver();
    room.buffer = impulse(3);
    const roomLevel = context.createGain();
    roomLevel.gain.value = .32;
    lowCut.connect(room).connect(roomLevel).connect(master);

    keysBus = context.createGain();
    keysBus.gain.value = .9;
    if (context.createStereoPanner) {
      const drift = context.createStereoPanner();
      const sway = context.createOscillator();
      const width = context.createGain();
      sway.frequency.value = .15;
      width.gain.value = .25;
      sway.connect(width).connect(drift.pan);
      sway.start();
      keysBus.connect(drift).connect(music);
    } else {
      keysBus.connect(music);
    }
    leadBus = context.createGain();
    leadBus.gain.value = .85;
    leadBus.connect(music);

    const crackle = context.createBufferSource();
    const crackleTone = context.createBiquadFilter();
    const crackleLevel = context.createGain();
    crackle.buffer = crackleBuffer();
    crackle.loop = true;
    crackleTone.type = 'bandpass';
    crackleTone.frequency.value = 2400;
    crackleTone.Q.value = .7;
    crackleLevel.gain.value = .045;
    crackle.connect(crackleTone).connect(crackleLevel).connect(music);
    crackle.start();

    nextStepTime = context.currentTime + .12;
    schedule();
    window.setInterval(schedule, 60);
  }

  async function start() {
    if (starting || started) return;
    if (!AudioContextClass) {
      console.warn('Web Audio is unavailable; this scene will be silent.');
      return;
    }
    starting = true;
    try {
      context ||= new AudioContextClass();
      await context.resume();
      if (context.state !== 'running') throw new Error(`Audio context is ${context.state}`);
      setup();
      started = true;
      for (const type of ['pointerdown', 'keydown', 'wheel']) {
        window.removeEventListener(type, start);
      }
    } catch (error) {
      console.error('Could not start the rain and music soundscape:', error);
    } finally {
      starting = false;
    }
  }

  for (const type of ['pointerdown', 'keydown', 'wheel']) {
    window.addEventListener(type, start, { passive: true });
  }
  function resumeSoundscape() {
    if (started && context.state === 'suspended') {
      context.resume().catch(error => console.error('Could not resume the soundscape:', error));
    }
  }
  window.addEventListener('pointerdown', resumeSoundscape, { passive: true });
  window.addEventListener('keydown', resumeSoundscape);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) resumeSoundscape();
  });
}
