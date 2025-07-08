const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const publicDir = path.join(__dirname, 'public');
const dataDir = path.join(__dirname, 'data');

function ensure(file) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, '', 'utf8');
}

function loadData(file) {
  ensure(file);
  try {
    const text = fs.readFileSync(file, 'utf8') || '';
    return JSON.parse(text || '{}');
  } catch {
    return {};
  }
}

function saveData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

const resources = {
  '/api/characters': 'characters.json',
  '/api/npcs': 'npcs.json',
  '/api/items': 'items.json',
  '/api/bestiary': 'bestiary.json',
  '/api/dungeons': 'dungeons.json',
  '/api/maps': 'maps.json'
};

function handleResource(req, res, prefix, file) {
  if (!req.url.startsWith(prefix)) return false;
  const filePath = path.join(dataDir, file);
  const urlObj = new URL(req.url, `http://${req.headers.host}`);
  const name = urlObj.searchParams.get('name');
  const data = loadData(filePath);

  if (req.method === 'GET') {
    const result = name ? data[name] : data;
    if (name && !result) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return true;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return true;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try {
        const { name, data: val } = JSON.parse(body);
        data[name] = val;
        saveData(filePath, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed' }));
      }
    });
    return true;
  }

  if (req.method === 'PUT') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        if (!data[name]) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }
        data[name] = { ...data[name], ...updates };
        saveData(filePath, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data[name]));
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Failed' }));
      }
    });
    return true;
  }

  if (req.method === 'DELETE') {
    if (!data[name]) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return true;
    }
    delete data[name];
    saveData(filePath, data);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }
  return false;
}

function serveStatic(req, res) {
  const reqPath = req.url === '/' ? '/index.html' : req.url;
  const file = path.join(publicDir, reqPath);
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(file);
    const mime = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript'
    }[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  for (const [prefix, file] of Object.entries(resources)) {
    if (handleResource(req, res, prefix, file)) return;
  }
  serveStatic(req, res);
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
