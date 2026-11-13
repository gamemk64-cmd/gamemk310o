const test = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../karaoke-vocal.js');

function fakeAnalyser(mode) {
  const fftSize = 2048;
  const frequencyBinCount = fftSize / 2;
  return {
    fftSize, frequencyBinCount,
    getByteTimeDomainData(out) {
      for (let i = 0; i < out.length; i++) out[i] = mode === 'quiet' ? 128 : 128 + Math.round(28 * Math.sin(i * 2 * Math.PI * 440 / 48000));
    },
    getByteFrequencyData(out) {
      out.fill(0);
      if (mode === 'voice-like') {
        const hz = [440, 880, 1320, 1760, 2200, 2640, 3080];
        const amp = [245, 210, 165, 125, 95, 70, 48];
        hz.forEach((frequency, i) => { out[Math.round(frequency / (48000 / fftSize))] = amp[i]; });
      } else if (mode === 'noise') {
        for (let i = 10; i < 160; i++) out[i] = 116;
      }
    }
  };
}

test('quiet input is not classified as vocal activity', () => {
  const gate = create();
  const result = gate.sample(fakeAnalyser('quiet'), 48000);
  assert.equal(result.available, true);
  assert.equal(result.active, false);
});

test('harmonic voice-like signal activates after a short stability window', () => {
  const gate = create();
  const analyser = fakeAnalyser('voice-like');
  let result;
  for (let i = 0; i < 8; i++) result = gate.sample(analyser, 48000);
  assert.equal(result.available, true);
  assert.equal(result.active, true);
});

test('broadband noise without harmonic peaks does not pass the gate', () => {
  const gate = create();
  const analyser = fakeAnalyser('noise');
  let result;
  for (let i = 0; i < 10; i++) result = gate.sample(analyser, 48000);
  assert.equal(result.active, false);
});
