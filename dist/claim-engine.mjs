const keys=['problem','solution','approach','proof','impact','ask'];
const normalized=s=>String(s||'').toLowerCase().replace(/\s+/g,' ').trim();
// This finds wording to review. It does not determine whether a claim is true.
export function reviewClaims(p){
 const found=[];
 for(const key of keys){
  const sentences=String(p?.[key]||'').split(/(?<=[.!?])\s+|\n+/u);
  for(const sentence of sentences){
   const quote=sentence.trim();
   const numerical=/(?:[₹$€£]\s?\d[\d,.]*|\d[\d,.]*\s?%|\d[\d,.]*\s+(?:users?|customers?|people|students?|interviews?|participants?|tests?|downloads?|companies|teams?|meals?|hours?|minutes?|days?|kg|tonnes?|million|billion|crore|lakh)\b)/i.test(quote);
   if(!numerical)continue;
   const proposed=/\b(?:goal|target|aim|aiming|hope|plan|planned|planning|projected|projection|estimate|estimated|hypothesis)\b/i.test(quote);
   const note=(p.evidence||[]).find(e=>e.slide===key&&String(e.source||'').trim()&&normalized(e.claim).includes(normalized(quote)));
   found.push({key,quote:quote.slice(0,1200),status:proposed?'goal':note?'source-note':'needs-source',sourceId:note?.id||null});
  }
 }
 return found;
}
