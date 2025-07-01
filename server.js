const http = require('http');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const port = process.env.PORT || 3000;
const baseDir = path.join(__dirname, 'web');
const dataDir = path.join(__dirname, 'data');

function getMime(file) {
  const ext = path.extname(file);
  switch (ext) {
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    case '.js': return 'text/javascript';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    default: return 'application/octet-stream';
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/api/builder') {
    const builderPath = path.join(dataDir, 'character_builder.yaml');
    try {
      const data = fs.readFileSync(builderPath, 'utf8');
      const json = yaml.load(data).character_builder;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(json));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to load builder');
    }
    return;
  }

  if (req.method === 'GET' && req.url.startsWith('/api/characters')) {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const name = urlObj.searchParams.get('name');
    const charPath = path.join(dataDir, 'characters.yaml');
    try {
      const chars = fs.existsSync(charPath)
        ? yaml.load(fs.readFileSync(charPath, 'utf8')) || {}
        : {};
      const result = name ? chars[name] : chars;
      if (!result) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Character not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to load character');
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/characters') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const { name, data } = JSON.parse(body);
        const charPath = path.join(dataDir, 'characters.yaml');
        let chars = {};
        if (fs.existsSync(charPath)) {
          chars = yaml.load(fs.readFileSync(charPath, 'utf8')) || {};
        }
        chars[name] = data;
        fs.writeFileSync(charPath, yaml.dump(chars), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to save character');
      }
    });
    return;
  }

  if (req.method === 'PUT' && req.url.startsWith('/api/characters')) {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const name = urlObj.searchParams.get('name');
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const charPath = path.join(dataDir, 'characters.yaml');
        let chars = {};
        if (fs.existsSync(charPath)) {
          chars = yaml.load(fs.readFileSync(charPath, 'utf8')) || {};
        }
        if (!chars[name]) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Character not found');
          return;
        }
        chars[name] = { ...chars[name], ...updates };
        fs.writeFileSync(charPath, yaml.dump(chars), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(chars[name]));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to update character');
      }
    });
    return;
  }

  if (req.method === 'DELETE' && req.url.startsWith('/api/characters')) {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const name = urlObj.searchParams.get('name');
    const charPath = path.join(dataDir, 'characters.yaml');
    try {
      const chars = fs.existsSync(charPath)
        ? yaml.load(fs.readFileSync(charPath, 'utf8')) || {}
        : {};
      if (!chars[name]) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Character not found');
        return;
      }
      delete chars[name];
      fs.writeFileSync(charPath, yaml.dump(chars), 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Failed to delete character');
    }
    return;
  }

  const reqPath = req.url === '/' ? '/index.html' : req.url;
  const filePath = path.join(baseDir, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': getMime(filePath) });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
