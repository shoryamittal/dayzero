import {createServer} from 'node:http';
import generate from '../api/pptx.mjs';

const port = Number(process.env.PORT || 4177);
const server = createServer((req, res) => {
  const path = req.url.split('?')[0];
  if (path === '/api/pptx') return generate(req, res);
  if ((path === '/health' || path === '/') && req.method === 'GET') {
    res.writeHead(200, {'Content-Type':'application/json', 'Cache-Control':'no-store'});
    res.end(JSON.stringify({service:'PitchViva PowerPoint export', status:'ready', endpoint:'POST /api/pptx'}));
    return;
  }
  res.writeHead(404).end();
});
server.requestTimeout = 30000;
server.listen(port, () => console.log('PitchViva PowerPoint backend listening on port', server.address().port));
