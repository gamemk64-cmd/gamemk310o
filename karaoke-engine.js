/* Karaoke timeline engine. No DOM, no network; can be tested in Node and used in the browser. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KaraokeEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value) || 0));
  const syllableCount = text => String(text || '').trim().split(/\s+/).filter(Boolean)
    .reduce((sum, word) => sum + Math.max(1, (word.toLowerCase().match(/[aeiouyаеёиоуыэюяіїєөү]+/g) || []).length), 0);
  const wordWeight = text => {
    const value = String(text || '').trim();
    const syllables = (value.toLowerCase().match(/[aeiouyаеёиоуыэюяіїєөү]+/g) || []).length;
    const letters = value.replace(/[^\p{L}\p{N}]/gu, '').length;
    return Math.max(0.55, syllables * 0.8 + letters * 0.035);
  };

  function findIndex(lines, time) {
    let low = 0, high = lines.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if (Number(lines[middle].t) <= time) low = middle + 1;
      else high = middle;
    }
    return low - 1;
  }

  function estimateRates(lines, kind) {
    if (!Array.isArray(lines) || kind === 'plain' || kind === 'word') return [];
    const raw = lines.map((line, index) => {
      const next = lines[index + 1];
      const gap = next ? Number(next.t) - Number(line.t) : 0;
      // Large gaps are likely to contain instrumental time. Do not use them as a
      // measure of the singer's speed.
      return gap >= 0.32 && gap <= 5.2 ? syllableCount(line.text) / gap : null;
    });
    const sorted = raw.filter(value => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
    const globalRate = sorted.length ? sorted[Math.floor((sorted.length - 1) * 0.72)] : 3.4;
    return lines.map((line, index) => {
      const local = [];
      for (let k = Math.max(0, index - 3); k <= Math.min(lines.length - 1, index + 3); k++) {
        if (raw[k] != null && raw[k] > 0) local.push(raw[k]);
      }
      local.sort((a, b) => a - b);
      const localRate = local.length ? local[Math.floor((local.length - 1) * 0.72)] : globalRate;
      // Conservative duration: it is better to leave a clean gap than keep old
      // words glowing over an instrumental break.
      return clamp(localRate * 1.03, 2.0, 9.5);
    });
  }

  function estimateWordTimes(line, next, rate) {
    const tokens = String(line?.text || '').match(/\S+\s*/g) || [];
    if (!tokens.length) return [];
    const start = Math.max(0, Number(line.t) || 0);
    const nextStart = next && Number(next.t) > start ? Number(next.t) : null;
    const weights = tokens.map(wordWeight);
    const totalWeight = weights.reduce((sum, value) => sum + value, 0) || 1;
    const speed = clamp(rate || line?._rate || 3.4, 2.0, 9.5);
    let span = clamp((syllableCount(line.text) / speed) * 1.08, 0.28, 5.8);
    if (nextStart != null) span = Math.min(span, Math.max(0.06, nextStart - start - 0.04));
    let accumulated = 0;
    return tokens.map((text, index) => {
      const wordStart = start + span * accumulated / totalWeight;
      accumulated += weights[index];
      const wordEnd = index === tokens.length - 1
        ? start + span
        : start + span * accumulated / totalWeight;
      return { text, t: wordStart, end: Math.max(wordStart + 0.035, wordEnd), approximate: true };
    });
  }

  function normalizeWordSchedule(line, next, rate) {
    const source = Array.isArray(line?.words) ? line.words : [];
    if (!source.length) return estimateWordTimes(line, next, rate);
    const sorted = source.map(word => ({
      text: String(word.text || '').trim(),
      t: Number(word.t),
      end: Number.isFinite(Number(word.end)) ? Number(word.end) : null,
      approximate: false
    })).filter(word => word.text && Number.isFinite(word.t)).sort((a, b) => a.t - b.t);
    const nextLineStart = next && Number(next.t) > Number(line.t) ? Number(next.t) : Infinity;
    return sorted.map((word, index) => {
      const following = sorted[index + 1];
      const natural = clamp((syllableCount(word.text) / clamp(rate || 3.8, 2, 10)) * 1.08, 0.18, 2.4);
      const nextWordStart = following ? following.t : nextLineStart;
      let end = word.end != null && word.end > word.t ? word.end : Math.min(nextWordStart, word.t + natural);
      if (Number.isFinite(nextWordStart)) end = Math.min(end, nextWordStart);
      end = Math.max(word.t + 0.035, end);
      return { ...word, end };
    });
  }

  function frameAt(lines, time, kind, rates) {
    const t = Math.max(0, Number(time) || 0);
    if (!Array.isArray(lines) || !lines.length || kind === 'plain') {
      return { index: -1, line: null, next: null, schedule: [], wordIndex: -1, vocalActive: false, pause: false, waiting: true };
    }
    const index = findIndex(lines, t);
    if (index < 0) return { index, line: null, next: lines[0], schedule: [], wordIndex: -1, vocalActive: false, pause: false, waiting: true };
    const line = lines[index], next = lines[index + 1] || null;
    const rate = Array.isArray(rates) ? rates[index] : (line._rate || 3.4);
    const schedule = normalizeWordSchedule(line, next, rate);
    if (!schedule.length) return { index, line, next, schedule, wordIndex: -1, vocalActive: false, pause: false, waiting: true };

    let wordIndex = -1;
    for (let i = 0; i < schedule.length; i++) {
      const word = schedule[i];
      if (t >= word.t && t < word.end) { wordIndex = i; break; }
    }
    const firstStart = schedule[0].t;
    const lastEnd = schedule[schedule.length - 1].end;
    const inLineWindow = t >= Number(line.t) && (!next || t < Number(next.t));
    const betweenWords = inLineWindow && wordIndex < 0 && t >= firstStart && t < lastEnd;
    const afterPhrase = inLineWindow && t >= lastEnd;
    const beforeFirstWord = inLineWindow && t < firstStart;
    const pause = !!next && inLineWindow && (betweenWords || afterPhrase || beforeFirstWord);
    return {
      index, line, next, schedule, wordIndex,
      vocalActive: wordIndex >= 0,
      pause,
      waiting: !inLineWindow,
      phraseStart: firstStart,
      phraseEnd: lastEnd,
      approximate: schedule.some(word => word.approximate)
    };
  }

  return { clamp, syllableCount, wordWeight, findIndex, estimateRates, estimateWordTimes, normalizeWordSchedule, frameAt };
});
