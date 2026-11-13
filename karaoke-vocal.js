/* Conservative local-audio vocal activity hint. This is a heuristic, not source separation. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KaraokeVocalGate = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function create() {
    let frequency = null;
    let waveform = null;
    let smoothed = 0;
    let onFrames = 0;
    let offFrames = 0;
    let active = false;

    function reset() { smoothed = 0; onFrames = 0; offFrames = 0; active = false; }

    function sample(analyser, sampleRate) {
      if (!analyser || typeof analyser.getByteFrequencyData !== 'function') {
        return { available: false, active: false, confidence: 0, reason: 'no-analyser' };
      }
      try {
        if (!frequency || frequency.length !== analyser.frequencyBinCount) {
          frequency = new Uint8Array(analyser.frequencyBinCount);
          waveform = new Uint8Array(analyser.fftSize);
          reset();
        }
        analyser.getByteFrequencyData(frequency);
        analyser.getByteTimeDomainData(waveform);
      } catch {
        return { available: false, active: false, confidence: 0, reason: 'read-failed' };
      }

      let square = 0;
      for (let i = 0; i < waveform.length; i++) {
        const value = (waveform[i] - 128) / 128;
        square += value * value;
      }
      const rms = Math.sqrt(square / Math.max(1, waveform.length));
      if (rms < 0.006) {
        smoothed *= 0.55;
        offFrames++;
        onFrames = 0;
        if (offFrames >= 2) active = false;
        return { available: true, active, confidence: smoothed, rms, reason: 'quiet' };
      }

      const rate = Number(sampleRate) || 48000;
      const binHz = rate / Math.max(1, analyser.fftSize);
      const band = (lowHz, highHz) => {
        const start = Math.max(1, Math.floor(lowHz / binHz));
        const end = Math.min(frequency.length - 1, Math.ceil(highHz / binHz));
        const values = [];
        for (let i = start; i <= end; i++) values.push(frequency[i] / 255);
        if (!values.length) return { mean: 0, flatness: 1, peaks: 0, peakCount: 0 };
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const logMean = values.reduce((a, b) => a + Math.log(Math.max(1e-4, b)), 0) / values.length;
        const flatness = Math.exp(logMean) / Math.max(1e-4, mean);
        let peaks = 0;
        for (let i = 1; i < values.length - 1; i++) {
          if (values[i] > 0.055 && values[i] > values[i - 1] * 1.18 && values[i] >= values[i + 1] * 1.08) peaks++;
        }
        return { mean, flatness, peaks: peaks / Math.max(1, values.length), peakCount: peaks };
      };

      const low = band(70, 250);
      const voice = band(250, 3800);
      const air = band(3800, 7800);
      const total = low.mean + voice.mean + air.mean + 0.0001;
      const voiceRatio = voice.mean / total;
      const harmonicity = 1 - Math.min(1, voice.flatness);
      const peakStructure = Math.min(1, voice.peaks * 13);
      const airBalance = Math.min(1, air.mean / Math.max(0.015, voice.mean * 0.72));
      const loudness = Math.min(1, rms / 0.075);

      // Instruments can still resemble singing. The threshold is intentionally
      // conservative and this gate is used only as an extra hint for line-timed
      // local files; exact word-timed sources rely on their supplied timestamps.
      let raw = (voiceRatio * 0.34) + (harmonicity * 0.28) + (peakStructure * 0.20) + (airBalance * 0.08) + (loudness * 0.10);
      if (voice.peakCount < 2) raw *= 0.52;
      smoothed += (raw - smoothed) * (raw > smoothed ? 0.42 : 0.24);
      if (smoothed >= 0.47) { onFrames++; offFrames = 0; }
      else if (smoothed < 0.35) { offFrames++; onFrames = 0; }
      if (onFrames >= 3) active = true;
      if (offFrames >= 4) active = false;
      return { available: true, active, confidence: smoothed, rms, voiceRatio, harmonicity, reason: active ? 'vocal-like' : 'uncertain' };
    }

    return { sample, reset };
  }

  return { create };
});
