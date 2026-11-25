import {lookup} from 'node:dns/promises';
import {get} from 'node:https';
import {isIP} from 'node:net';

export function publicAddress(address) {
  // Use globally routable IPv4 only. Reject IPv6 and mapped/private ranges.
  if (isIP(address) !== 4) return false;
  const [a,b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0,168].includes(b)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && [18,19,51].includes(b)) || (a === 203 && b === 0));
}

export function competitionURL(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443') || isIP(url.hostname) || !url.hostname.includes('.') || /\.(local|internal|localhost|test)$/i.test(url.hostname)) throw Error('Use a public HTTPS competition page.');
  url.hash = '';
  return url;
}

async function readPage(value, redirects = 0) {
  const url = competitionURL(value);
  const addresses = await lookup(url.hostname, {all:true, family:4});
  if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw Error('Unavailable source.');
  const pinned = addresses[0];
  return new Promise((resolve,reject) => {
    // Pin the validated address; DNS changes cannot send this request to a private host.
    const request = get(url, {headers:{'User-Agent':'PitchViva-CompetitionReader/1.0','Accept':'text/html,text/plain'}, lookup:(_host, options, done) => done(null, options?.all ? [pinned] : pinned.address, 4)}, response => {
      if ([301,302,303,307,308].includes(response.statusCode)) {
        response.resume();
        if (redirects >= 2 || !response.headers.location) return reject(Error('Too many redirects.'));
        resolve(readPage(new URL(response.headers.location,url).href, redirects + 1)); return;
      }
      if (response.statusCode !== 200 || !/text\/(html|plain)/i.test(response.headers['content-type'] || '')) { response.resume(); reject(Error('Unreadable page.')); return; }
      let bytes=0;const chunks=[];
      response.on('data', chunk => { bytes += chunk.length; if (bytes > 512*1024) { response.destroy(); reject(Error('Page too large.')); } else chunks.push(chunk); });
      response.on('end', () => resolve({html:Buffer.concat(chunks).toString('utf8'),source:url.href}));
      response.on('error',reject);
    });
    const timeout = setTimeout(() => request.destroy(Error('Source timed out.')),5000);
    request.on('close',()=>clearTimeout(timeout));
    request.on('error',reject);
  });
}

function decode(value) {
  return value.replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, m => ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'",'&nbsp;':' '})[m]).replace(/&#(\d+);/g, (_,n) => Number(n) <= 0x10ffff ? String.fromCodePoint(Number(n)) : '');
}

export function extractRequirements(html) {
  const text=html.replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'').replace(/<\/(?:p|li|h[1-6]|div|section|tr)>|<br\s*\/?\s*>/gi,'\n').replace(/<[^>]*>/g,' ');
  const lines=decode(text).split('\n').map(line=>line.replace(/\s+/g,' ').trim()).filter(Boolean);
  return [...new Set(lines.filter(line=>line.length>=15 && /\b(judg\w*|criteri\w*|rubric|slide\w*|pitch\w*|deadline|eligib\w*|submission|submit|template|minute\w*|round\w*|track\w*|weight\w*|plagiar\w*|AI policy|intellectual property)\b/i.test(line)))].slice(0,18).map(line=>line.slice(0,450));
}

export async function competitionBrief(value, reader=readPage) {
  competitionURL(value);
  const page=await reader(value);
  return {source:page.source,checked:new Date().toISOString(),excerpts:extractRequirements(page.html),status:'source_excerpts',note:'Page excerpts, not a verified complete rulebook. Check the edition, round and linked documents.'};
}

export default async function handler(request,response) {
  response.setHeader('Cache-Control','no-store');
  response.setHeader('X-Content-Type-Options','nosniff');
  if (request.method !== 'GET') return response.status(405).json({error:'Use GET.'});
  try {
    const url=new URL(request.url,'https://pitchviva.invalid').searchParams.get('url');
    if (!url || url.length>1000) return response.status(400).json({error:'Add a competition page link.'});
    return response.status(200).json(await competitionBrief(url));
  } catch { return response.status(422).json({error:'Could not read this page. Paste the rules or continue in the studio.'}); }
}
