// Standalone addon. Your existing chat UI is NOT replaced.
// Load this file from a module; createPortfolioAddon() fetches JSON files.
const WA = 'https://wa.me/917066712160';
const STOP = new Set('a an and are as at be by can do does for from has have he his how i in is it me my of on or please she tell the their there this to us was were what when where which who with you your about kya hai ka ke ki ko mein mere mera mujhe bata batana aur se kab kya'.split(' '));
const ALIASES = [['accredation','accreditation'],['accred','accreditation'],['rfid wristbands','rfid'],['cash less','cashless'],['check-in','check in'],['lolla','lollapalooza'],['liwa festival','liwa international festival'],['events','event'],['concerts','concert'],['festivals','festival'],['shows','show'],['projekts','projects'],['whats app','whatsapp']];
function norm(s) {
  s=String(s||'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^\p{L}\p{N} ]/gu,' ').replace(/\s+/g,' ').trim();
  for(const [a,b] of ALIASES) s=s.replace(new RegExp('(^| )'+a+'(?= |$)','g'),(_,p)=>p+b);
  return s;
}
function tokens(s){return new Set(norm(s).split(' ').filter(x=>x.length>2&&!STOP.has(x)));}
function phrase(h,n){return (' '+h+' ').includes(' '+n+' ');}
function language(s){if(/\b(kya|kaun|kaunsa|kaunse|kab|bata|batao|kitne|kaha|kaise|kiya|kiye|kar|hai|hain|mujhe|usne|aata|join karega)\b/i.test(s))return 'hinglish';return 'en';}
const MESSAGES={
 en:{unknown:`I don't have a verified answer to that question yet. Please connect with Hitesh directly on WhatsApp: ${WA}`,empty:'Please type a question.',missing:'The project sheet does not specify that detail. Please connect with Hitesh on WhatsApp: '+WA},
 hi:{unknown:`अभी मेरे पास इस सवाल का पक्का जवाब नहीं है। कृपया हितेश से सीधे WhatsApp पर संपर्क करें: ${WA}`,empty:'कृपया अपना सवाल लिखें।',missing:'इस इवेंट की यह जानकारी शीट में नहीं है। कृपया हितेश से WhatsApp पर संपर्क करें: '+WA},
 hinglish:{unknown:`Is question ka verified answer abhi mere paas nahi hai. Please Hitesh se directly WhatsApp par connect karein: ${WA}`,empty:'Please apna question type karein.',missing:'Is event ki ye detail sheet mein nahi hai. Please WhatsApp par Hitesh se connect karein: '+WA}
};
const availabilityRe=/(available to join|availability to join|joining date|join us|join our|notice period|kab join|kab available|joining ke liye|when can (he|hitesh) (join|start)|can (he|hitesh) join|available for (hire|work)|जॉइन|ज्वाइन|उपलब्ध)/i;
const dateRe=/(\bwhen\b|\bdate\b|\bdates\b|\bschedule\b|\bkab\b|कब|तारीख)/i;
const footRe=/(footfall|audience|attendees|attendance|crowd|kitne log|कितने लोग)/i;
const locationRe=/(\bwhere\b|\blocation\b|\bvenue\b|\bcity\b|\bcountry\b|kaha|kahaan|कहाँ)/i;
const roleRe=/(\brole\b|\bscope\b|responsib|\bwork\b|\bhandled\b|\bmanage\b|\bdid\b|kaam|kya kiya|क्या किया)/i;
const typeRe=/(\btype\b|\bcategory\b|kis tarah|कैसा)/i;
const listRe=/(\bwhich\b|\blist\b|\bshow\b|\bname\b|\ball\b|\bprojects\b|\bevents\b|\bevent\b|kaunse|kaun sa|कौनसे|कौन से|कितने|\bhow many\b)/i;
const countRe=/(how many|count|number of|total|kitne|कितने)/i;
function eventAliases(e){let x=[e.name];const n=norm(e.name);const short=n.replace(/\b20\d\d\b/g,'').trim();if(short.length>=5)x.push(short);return x.map(norm).filter(x=>x.length>=5);}
function bestEvent(question,events){
  const q=norm(question);let best=null, bestScore=0,runner=0;
  for(const e of events){let score=0;for(const alias of eventAliases(e)){
    if(phrase(q,alias))score=Math.max(score,100+alias.length);
    else {const t=[...tokens(alias)],matched=t.filter(x=>tokens(q).has(x));if(t.length && matched.length>=Math.min(2,t.length))score=Math.max(score,matched.length/t.length*45);}
  }if(score>bestScore){runner=bestScore;bestScore=score;best=e}else if(score>runner)runner=score;}
  return bestScore>=55 && (bestScore-runner>=8) ? best : null;
}
function eventAnswer(e,q,lang){
 const missing=MESSAGES[lang].missing;
 let key='overview';if(dateRe.test(q))key='date';else if(footRe.test(q))key='footfall';else if(locationRe.test(q))key='location';else if(roleRe.test(q))key='scope';else if(typeRe.test(q))key='type';
 if(key!=='overview'&&!e[key])return missing;
 if(false){
  if(key==='date')return `${e.name} की रिकॉर्डेड तारीख: ${e.date}।`;
  if(key==='location')return `${e.name} का रिकॉर्डेड स्थान: ${e.location}।`;
  if(key==='footfall')return `${e.name} की शीट में दर्ज अनुमानित फुटफॉल: ${e.footfall}।`;
  if(key==='scope')return `${e.name} में दर्ज काम: ${e.scope}।`;
  if(key==='type')return `${e.name} का प्रकार: ${e.type}।`;
  return `${e.name} (${e.year}) — स्थान: ${e.location||'दर्ज नहीं'}, काम: ${e.scope||'दर्ज नहीं'}${e.date?', तारीख: '+e.date:''}${e.footfall?', अनुमानित फुटफॉल: '+e.footfall:''}।`;
 }
 if(lang==='hinglish'){
  if(key==='date')return `${e.name} ki recorded date: ${e.date}.`;
  if(key==='location')return `${e.name} ka recorded location: ${e.location}.`;
  if(key==='footfall')return `${e.name} ka sheet mein listed estimated footfall: ${e.footfall}.`;
  if(key==='scope')return `${e.name} mein Hitesh ka recorded scope: ${e.scope}.`;
  if(key==='type')return `${e.name} ka event type: ${e.type}.`;
  return `${e.name} (${e.year}) — Location: ${e.location||'not recorded'}; Scope: ${e.scope||'not recorded'}${e.date?'; Dates: '+e.date:''}${e.footfall?'; Estimated footfall: '+e.footfall:''}.`;
 }
 if(key==='date')return `The project sheet lists ${e.name} on ${e.date}.`;
 if(key==='location')return `The recorded location for ${e.name} is ${e.location}.`;
 if(key==='footfall')return `The sheet lists an estimated footfall of ${e.footfall} for ${e.name}.`;
 if(key==='scope')return `Hitesh's recorded scope for ${e.name} was: ${e.scope}.`;
 if(key==='type')return `The project sheet categorizes ${e.name} as ${e.type}.`;
 return `${e.name} (${e.year}) — Location: ${e.location||'not recorded'}; Scope: ${e.scope||'not recorded'}${e.date?'; Dates: '+e.date:''}${e.footfall?'; Estimated footfall: '+e.footfall:''}.`;
}
function profileMatch(q,entries){
 const nq=norm(q),qt=tokens(q);let results=[];
 for(const e of entries){let score=0;
  for(const p of e.questions||[]){const np=norm(p);if(nq===np)score=Math.max(score,110);else if(np.length>=9 && phrase(nq,np))score=Math.max(score,70);}
  for(const p of e.keywords||[]){const np=norm(p);if(np.length>=3&&phrase(nq,np))score+=nq===np?90:(np.includes(' ')?22:14);}
  const xt=new Set([...(e.keywords||[]),...(e.questions||[])].flatMap(x=>[...tokens(x)]));
  let intersection=[...qt].filter(t=>xt.has(t)).length;
  if(intersection>=2)score+=Math.min(25,intersection*5);
  if(score>=22)results.push({entry:e,score});
 }
 results.sort((a,b)=>b.score-a.score);
 if(!results.length || (results.length>1 && results[0].score-results[1].score<6 && results[0].score<40))return null;
 return results[0].entry;
}
function eventList(q,events,lang){
 const n=norm(q),year=(q.match(/\b20(?:2\d|3\d)\b/)||[])[0];
 const filtered=events.filter(e=>{
  if(year && e.year!==Number(year))return false;
  // Optional explicit scope keywords
  if(/rfid|cashless/i.test(q)&&!/rfid|cashless/i.test(e.type+' '+e.scope))return false;
  if(/accreditation/i.test(q)&&!/accreditation/i.test(e.type+' '+e.scope))return false;
  // Location text matching for broad geo queries
  for(const loc of ['mumbai','delhi','pune','abu dhabi','dubai','kenya','singapore','oman','africa']){
   if(phrase(n,loc) && !norm(e.location).includes(loc) && !norm(e.name).includes(loc))return false;
  }
  return true;
 });
 const prefix=year?`${year}: `:'';
 if(!filtered.length)return MESSAGES[lang].unknown;
 if(countRe.test(q)){
  const warning=lang==='hi'?'यह शीट में दर्ज एंट्रीज़ हैं, पूरे करियर का सत्यापित कुल नहीं।':lang==='hinglish'?'Ye sheet mein recorded entries hain, lifetime verified total nahi.':'These are project-sheet entries, not necessarily a verified lifetime or unique-event total.';
  return `${prefix}${filtered.length} ${lang==='hi'?'इवेंट एंट्रीज़':lang==='hinglish'?'event entries':'event entries'}. ${warning}`;
 }
 const max=15,items=filtered.slice(0,max).map(e=>`${e.name} (${e.year})`);
 const more=filtered.length>max?` (+${filtered.length-max} more records; ask about a year, location, or event name)`:'';
 return `${prefix}${items.join('; ')}${more}`;
}
async function createPortfolioAddon({eventsUrl='/events.json',profileUrl='/profile-faq.json'}={}){
 const [ev,pf]=await Promise.all([fetch(eventsUrl),fetch(profileUrl)]);
 if(!ev.ok || !pf.ok)throw new Error('Knowledge files failed to load. Check paths, hosting, and public access.');
 const events=await ev.json(), profile=await pf.json();
 return {
  eventsCount:events.length, profileTopics:profile.length,
  answer(question){
   const lang=language(question),q=String(question||'').trim();
   if(!q)return MESSAGES[lang].empty;
   if(availabilityRe.test(q))return (profile.find(e=>e.id==='joining_availability')?.['answer_'+lang] || profile.find(e=>e.id==='joining_availability')?.answer || MESSAGES[lang].unknown);
   const e=bestEvent(q,events);if(e)return eventAnswer(e,q,lang);
   // Route explicit year/event portfolio queries to the live spreadsheet records.
   if(listRe.test(q) && /(event|project|concert|festival|show|kaunse|कौनसे|कौन से|कितने)/i.test(q) && (/(20\d\d|how many|kitne|कितने|which|list|show|all|kaunse|कौनसे|कौन से|mumbai|delhi|pune|dubai|abu dhabi|kenya|singapore|oman|africa|cashless|accreditation|rfid)/i.test(q)))return eventList(q,events,lang);
   const p=profileMatch(q,profile);if(p)return p['answer_'+lang]||p.answer;
   return MESSAGES[lang].unknown;
  }
 };
}

// Browser bridge: one-line opt-in, does not replace your existing chatbot UI.
// Existing 4 quick-button answers (including updated Experience) remain authoritative.
(function () {
  if (typeof window === 'undefined') return;
  const reserved = new Set(['events','rfid','experience','contact','hi','hello','dreamcast','sportz','singapore','oman','africa','website']);
  const config = window.HiteshAssistantConfig || {};
  const options = {
    eventsUrl: config.eventsUrl || '/events.json',
    profileUrl: config.profileUrl || '/profile-faq.json'
  };
  let engine = null, error = null;
  let ready = createPortfolioAddon(options).then(x => { engine = x; return x; }).catch(e => { error = e; return null; });
  const bridge = {
    answer(question, originalReply) {
      const q = String(question || '').trim();
      if (reserved.has(q.toLowerCase()) || /^(my experience|tell me about (your|my) experience|what is (your|his|hitesh.s) experience)$/i.test(q)) return originalReply;
      if (!engine) return originalReply; // preserve existing behavior if files not yet loaded
      return engine.answer(q);
    },
    get status() { return {loaded: !!engine, error: error ? String(error.message || error) : null,
      eventsCount: engine?.eventsCount || 0, profileTopics: engine?.profileTopics || 0}; },
    get ready() { return ready; },
    refresh() { ready = createPortfolioAddon(options).then(x => {engine=x;error=null;return x;}).catch(e=>{error=e;return null;});return ready; }
  };
  window.HiteshAddon = bridge;
  if (Number(config.refreshMinutes)>0) setInterval(() => bridge.refresh(), Number(config.refreshMinutes)*60000);
})();
