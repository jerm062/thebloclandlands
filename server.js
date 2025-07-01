const http = require('http');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');

const port = process.env.PORT || 3000;
const baseDir = path.join(__dirname, 'web');
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(__dirname, 'data');
const partyPath = path.join(dataDir, 'party.json');
const offersPath = path.join(dataDir, 'offers.json');
const builderPath = path.join(dataDir, 'character_builder.yaml');
const defaultBuilder = yaml.load(
  fs.readFileSync(path.join(__dirname, 'data', 'character_builder.yaml'), 'utf8')
).character_builder;

function loadParty() {
  try {
    const data = JSON.parse(fs.readFileSync(partyPath, 'utf8'));
    if (!('pending' in data)) data.pending = null;
    return data;
  } catch {
    return { members: [], actions: {}, pending: null };
  }
}

function saveParty(p) {
  fs.writeFileSync(partyPath, JSON.stringify(p, null, 2), 'utf8');
}

function loadOffers() {
  try {
    return JSON.parse(fs.readFileSync(offersPath, 'utf8'));
  } catch {
    return [];
  }
}

function saveOffers(o) {
  fs.writeFileSync(offersPath, JSON.stringify(o, null, 2), 'utf8');
}


function loadBuilder() {
  try {
    const data = yaml.load(fs.readFileSync(builderPath, 'utf8'));
    if (data && data.character_builder) return data.character_builder;
  } catch {}
  return defaultBuilder;
}


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
    const data = loadBuilder();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
    return;
  }

  if (req.method === 'GET' && req.url === '/api/story') {
    const storyPath = path.join(dataDir, 'story.txt');
    const text = fs.existsSync(storyPath) ? fs.readFileSync(storyPath, 'utf8') : '';
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(text);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/story') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        const { role, text } = JSON.parse(body);
        const line = `${role}: ${text}\n`;
        const storyPath = path.join(dataDir, 'story.txt');
        fs.appendFileSync(storyPath, line, 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to save story');
      }
    });
    return;
  }



  if (req.method === 'GET' && req.url.startsWith('/api/offers')) {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const name = urlObj.searchParams.get('name');
    const offers = loadOffers();
    const result = name ? offers.filter(o => o.name === name) : offers;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/offers') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try {
        const offer = JSON.parse(body);
        const offers = loadOffers();
        offers.push(offer);
        saveOffers(offers);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to save offer');
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/offers/claim') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try {
        const { name, index } = JSON.parse(body);
        const offers = loadOffers();
        if (!offers[index] || offers[index].name !== name) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Offer not found' }));
          return;
        }
        const offer = offers.splice(index, 1)[0];
        saveOffers(offers);
        const charPath = path.join(dataDir, 'characters.yaml');
        let chars = fs.existsSync(charPath) ? yaml.load(fs.readFileSync(charPath, 'utf8')) || {} : {};
        if (!chars[name]) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Character not found' }));
          return;
        }
        chars[name].inventory = chars[name].inventory || [];
        (offer.items || []).forEach(it => chars[name].inventory.push(it));
        if (offer.gold) {
          chars[name].sp = (chars[name].sp || 0) + offer.gold;
        }
        fs.writeFileSync(charPath, yaml.dump(chars), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(chars[name]));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to claim offer');
      }
    });
    return;
  }

  if (req.method === 'GET' && req.url === '/api/party') {
    const party = loadParty();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(party));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/party/join') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try {
        const { name } = JSON.parse(body);
        const party = loadParty();
        if (!party.members.includes(name)) {
          party.members.push(name);
        }
        saveParty(party);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(party));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to join party');
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/party/leave') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try {
        const { name } = JSON.parse(body);
        const party = loadParty();
        party.members = party.members.filter(m => m !== name);
        delete party.actions[name];
        saveParty(party);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(party));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to leave party');
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/party/action') {
    let body = '';
    req.on('data', c => (body += c));
    req.on('end', () => {
      try {
        const { name, action } = JSON.parse(body);
        const party = loadParty();
        party.actions[name] = action;
        saveParty(party);

        const allSelected = party.members.length > 0 && party.members.every(m => party.actions[m]);
        if (allSelected) {
          const actionsText = party.members.map(m => `${m}: ${party.actions[m]}`).join(', ');
          const allTravel = party.members.every(m => party.actions[m] === 'travel');
          const line = allTravel
            ? `System: All party members chose to travel. Guide, roll for travel events.`
            : `System: Party actions - ${actionsText}. Guide, resolve results.`;
          const storyPath = path.join(dataDir, 'story.txt');
          fs.appendFileSync(storyPath, line + '\n', 'utf8');
          if (allTravel) party.pending = 'travel';
          saveParty(party);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(party));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Failed to set action');
      }
    });
    return;
  }

  if (req.method === 'POST' && req.url === '/api/party/travel-roll') {
    const party = loadParty();
    if (party.pending !== 'travel') {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No travel roll pending' }));
      return;
    }
    const events = [
      'Wild Encounter',
      'Human Encounter',
      'Environment',
      'Loss',
      'Exhaustion',
      'Discovery'
    ];
    const result = events[Math.floor(Math.random() * 6)];
    const storyPath = path.join(dataDir, 'story.txt');
    fs.appendFileSync(storyPath, `System: Travel event result - ${result}\n`, 'utf8');
    party.pending = null;
    party.actions = {};
    saveParty(party);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ result }));
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
