/* Hitesh Smart Casual V4 — English + Roman Hindi/Hinglish
   Loads /casual-knowledge.json. Only answers high-confidence conversational intents.
   Leaves career, events, contact, RFID, etc. to HiteshAddon. No API keys. */
(function () {
  'use strict';
  const URL = '/casual-knowledge.json';
  const WHATSAPP = 'https://wa.me/917066712160';
  const normalize = value => String(value ?? '').toLowerCase()
    .replace(/[’‘]/g, "'").replace(/\bwhat's\b/g, 'what is')
    .replace(/\bhow's\b/g, 'how is').replace(/\bwho's\b/g, 'who is')
    .replace(/\b(kaisaa|kaisah)\b/g, 'kaisa')
    .replace(/\b(kaisee|kaisey)\b/g, 'kaise')
    .replace(/\b(thik|theek|thk|theekkk)\b/g, 'theek')
    .replace(/\b(kr|kar)\b/g, 'kar')
    .replace(/\b(rha|raha)\b/g, 'raha')
    .replace(/\b(gya|gayaa)\b/g, 'gaya')
    .replace(/\b(nhi|nai|nahin)\b/g, 'nahi')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  const greeting = /^(?:(?:hi+|hey+|hello+|namaste|namaskar|yo|arey|arre|suno|sun|bro|bhai|yaar|ji)\s+){1,4}/;
  const salutation = /(?:\s+(?:bhai|bro|yaar|ji|sir|buddy|please|plz|pls)){1,3}$/;
  const professional = /\b(experience|experienced|events?|concerts?|festival|projects?|career|dreamcast|sportz|rfid|cashless|registration|accreditation|operations?|portfolio|resume|cv|skills?|technology|technologies|qualification|education|degree|linkedin|website|internship|202[0-9]|20[12][0-9]|location of event|footfall|client|team management|work history|which country|what did hitesh|how many)\b/;
  const roman = /\b(bhai|yaar|aap|tum|tu|hai|hain|ho|kaisa|kaise|kya|kab|kahan|nahi|theek|chal|acha|accha|haan|samajh|gaya|bata|batao|karo|karna|shukriya|milte|raha|sahi|mast|badhiya|bole|bol|apna|unka|uska|dekh|sun|kuch|aur)\b/;
  const map = new Map();
  let topics = [];
  let status = 'loading';
  let readyPromise;
  function isRoman(q) { return roman.test(q); }
  function result(topic, lang) { return lang === 'hi' ? topic.answer_hinglish : topic.answer_en; }
  function variants(s) {
    let q = normalize(s), set = new Set([q]);
    // Allow casual salutations but never strip the body of a professional question.
    for (let i = 0; i < 3; i++) {
      const next = [...set].flatMap(x => [x.replace(greeting, ''), x.replace(salutation, '')]);
      for (const x of next) if (x.trim()) set.add(x.trim());
    }
    return [...set].filter(Boolean);
  }
  function register(data) {
    if (!data || !Array.isArray(data.topics)) throw Error('Invalid topics JSON');
    topics = data.topics;
    for (const topic of topics) {
      if (!topic.id || !topic.answer_en || !topic.answer_hinglish) continue;
      for (const [field, lang] of [['english', 'en'], ['hinglish', 'hi']]) {
        for (const phrase of topic[field] || []) {
          const k = normalize(phrase);
          if (k && !map.has(k)) map.set(k, { topic, lang });
        }
      }
    }
    status = 'ready';
  }
  function intention(message) {
    const q = normalize(message);
    if (!q) return null;
    // Specific self vs Hitesh distinction; no guesses about Hitesh's personal condition.
    const hitesh = /\b(hitesh|hitesh bhai|hitesh sir)\b/.test(q);
    const stripped = q.replace(greeting, '').replace(salutation, '').trim();
    const wellbeing = /\b(kaisa hai|kaise ho|kaise hain|kaisa h|kaisa chal raha|kya haal|kaisa chalra|how is hitesh|how is he|how are you|how are things|how is everything|doing well|theek hai kya|theek ho|sab theek)\b/;
    const personalNow = /\b(abhi kya kar raha|kya kar raha hai|what is hitesh doing now|where is hitesh|hitesh kaha hai|hitesh kahan hai|hitesh kidhar hai)\b/;
    if (hitesh && wellbeing.test(q)) return isRoman(q)
      ? 'Hello bhai! Main Hitesh ka virtual portfolio assistant hoon. Unka latest personal haal mere paas verified nahi hai. Unse directly WhatsApp par baat kar sakte ho: ' + WHATSAPP
      : "Hi! I'm Hitesh's virtual portfolio assistant. I can't verify how he is personally doing right now. Please contact him directly on WhatsApp: " + WHATSAPP;
    if (hitesh && personalNow.test(q)) return isRoman(q)
      ? 'Hitesh abhi kya kar rahe hain, uski live update mere paas nahi hai. Direct WhatsApp par connect karein: ' + WHATSAPP
      : "I don't have a live update on Hitesh's current activities. Please contact him on WhatsApp: " + WHATSAPP;
    // Never intercept event, work, CV, experience questions, even when greeting precedes them.
    if (professional.test(q)) return null;
    const candidate = variants(q);
    for (const v of candidate) {
      const entry = map.get(v);
      if (entry) return result(entry.topic, isRoman(q) ? 'hi' : entry.lang);
    }
    // Constrained natural-language intents: no vague substring matching.
    if (!hitesh && wellbeing.test(stripped) && stripped.split(' ').length <= 9) return isRoman(q)
      ? 'Main badhiya hoon bhai! Hitesh ke work ya experience ke baare mein kya jaanna chahoge?'
      : "I'm doing well, thanks! What would you like to know about Hitesh's work?";
    if (/^(?:(?:hi|hey|hello|bhai|bro|yaar)\s+)*(?:chal\s+)?(?:theek|ok|okay|alright|fine|acha|accha)(?:\s+(?:hai|bhai|bro|yaar|ji|fir|phir|then)){0,3}$/.test(q)) return isRoman(q)
      ? 'Bilkul bhai! Aur kuch poochna ho toh bata dena.'
      : "Sure! Let me know if there's anything else you'd like to ask.";
    if (/^(?:thank(?:s| you)?|thx|ty|shukriya|dhanyawad)(?:\s+(?:so much|very much|a lot|again|bhai|bro|yaar|ji|for helping|for the help)){0,3}$/.test(stripped)) return isRoman(q)
      ? 'Koi baat nahi bhai! Aur kuch jaanna ho toh pooch lena.'
      : "You're welcome! Happy to help.";
    if (/^(?:bye|goodbye|see you|see ya|milte hain|chalo bye)(?:\s+(?:bhai|bro|yaar|ji|then|later)){0,2}$/.test(stripped)) return isRoman(q)
      ? 'Chalo bhai, phir milte hain! Take care.'
      : 'Goodbye! Have a great day.';
    // Greeting only, not greeting + substantial question.
    if (/^(?:hi+|hey+|hello+|namaste|namaskar|yo)(?:\s+(?:bhai|bro|yaar|ji|hitesh|assistant|sir)){0,3}$/.test(q)) return isRoman(q)
      ? 'Hello bhai! Main Hitesh ka portfolio assistant hoon. Kya jaanna chahoge?'
      : "Hello! I'm Hitesh's portfolio assistant. How can I help?";
    return null;
  }
  readyPromise = fetch(URL, { cache: 'no-store' })
    .then(r => { if (!r.ok) throw Error('HTTP ' + r.status); return r.json(); })
    .then(register)
    .catch(err => { status = 'error'; console.warn('[HiteshCasual] Data could not load:', err); });
  window.HiteshCasual = {
    answer: intention,
    ready: () => readyPromise,
    get status() { return status; },
    get phraseCount() { return map.size; },
    get topicCount() { return topics.length; }
  };
})();
