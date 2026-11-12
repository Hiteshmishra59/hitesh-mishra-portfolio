/* Hitesh portfolio casual chat add-on. Independent from event/profile engine.
   Exact normalized phrase matching prevents accidental interception of event questions.
   Public code; no API keys, no telemetry, no hidden network requests. */
(function () {
  'use strict';
  const DATA_URL = '/casual-knowledge.json';
  const normalize = (s) => String(s ?? '')
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const map = new Map();
  let status = 'loading';
  let readyPromise;
  // Client-side keyword intent engine; not a general reasoning AI.
  function register(data) {
    if (!data || !Array.isArray(data.topics)) throw new Error('Invalid casual bank');
    for (const topic of data.topics) {
      for (const phrase of (topic.english || [])) {
        const key = normalize(phrase);
        if (key && !map.has(key)) map.set(key, { topic, lang: 'en' });
      }
      for (const phrase of (topic.hinglish || [])) {
        const key = normalize(phrase);
        if (key && !map.has(key)) map.set(key, { topic, lang: 'hi' });
      }
    }
    status = 'ready';
  }
  async function load() {
    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      register(await response.json());
    } catch (error) {
      status = 'error';
      console.warn('[HiteshCasual] Could not load casual knowledge:', error);
    }
  }
  readyPromise = load();

  window.HiteshCasual = {
    answer(message) {
      const entry = map.get(normalize(message));
      if (!entry) return null; // Let profile and events engine answer instead.
      return entry.lang === 'hi' ? entry.topic.answer_hinglish : entry.topic.answer_en;
    },
    ready: () => readyPromise,
    get status() { return status; },
    get phraseCount() { return map.size; },
    get topicCount() { return new Set([...map.values()].map(e => e.topic.id)).size; }
  };
})();
