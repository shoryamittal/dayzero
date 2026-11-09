import {createServer} from 'node:http';
import {Readable} from 'node:stream';
import {readFile} from 'node:fs/promises';
import {extname, resolve, sep} from 'node:path';
import {handleAssist} from '../api/assist.mjs';

const host = '127.0.0.1';
const port = Number(process.env.DAYZERO_PORT || 4176);
const base = 'http://' + host + ':' + port;
const root = resolve('dist');
const types = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.md': 'text/plain; charset=utf-8', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8'};

createServer(async (incoming, outgoing) => {
  try {
    const url = new URL(incoming.url, base);
    if (url.pathname === '/api/assist') {
      const method = incoming.method;
      const request = new Request(url, {method, headers: incoming.headers,
        ...(method === 'GET' || method === 'HEAD' ? {} : {body: Readable.toWeb(incoming), duplex: 'half'})});
      const response = await handleAssist(request);
      outgoing.writeHead(response.status, Object.fromEntries(response.headers));
      outgoing.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!['GET', 'HEAD'].includes(incoming.method)) {
      outgoing.writeHead(405).end();
      return;
    }
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root + sep) || !types[extname(path)]) {
      outgoing.writeHead(404).end();
      return;
    }
    const data = await readFile(path);
    outgoing.writeHead(200, {'Content-Type': types[extname(path)], 'Cache-Control': 'no-store'});
    outgoing.end(incoming.method === 'HEAD' ? undefined : data);
  } catch {
    outgoing.writeHead(404).end('Not found.');
  }
}).listen(port, host, () => process.stdout.write('Day-Zero local AI server at ' + base + '\n'));
