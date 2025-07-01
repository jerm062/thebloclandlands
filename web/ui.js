const output = document.getElementById('output');
const menu = document.getElementById('menu');
const creator = document.getElementById('creator');
const guideEdit = document.getElementById('guide-edit');
const storyPanel = document.getElementById('story');
const hexGenPanel = document.getElementById('hex-gen');
const hexContent = document.getElementById('hex-content');
const hexMenu = document.getElementById('hex-menu');

let builderData = null;
let currentCharacter = null;

async function autoLoadPlayer() {
  const name = localStorage.getItem('currentCharacter');
  if (!name) return;
  const res = await fetch('/api/characters?name=' + encodeURIComponent(name));
  if (!res.ok) return;
  const data = await res.json();
  const inv = data.inventory || [];
  let max = 12;
  inv.forEach(it => {
    const l = it.toLowerCase();
    if (l.includes('backpack')) max += 4;
    if (l.includes('pouch')) max += 2;
  });
  currentCharacter = { name, ...data, max_slots: max, encumber_limit: max + 2, encumbered: inv.length > max };
}

function append(text) {
  const p = document.createElement('p');
  p.textContent = text;
  output.appendChild(p);
  output.scrollTop = output.scrollHeight;
}

function getMarkerString(markers = {}) {
  let str = '';
  if (markers.current_location) str += '#';
  if (markers.mission) str += 'X';
  if (markers.revealed_info) str += '!';
  if (markers.side_mission) str += '?';
  if (markers.traversed) str += '+';
  return str;
}



async function showCreatorForm() {
  output.style.display = 'none';
  menu.style.display = 'none';
  creator.style.display = 'block';
  guideEdit.style.display = 'none';
  storyPanel.style.display = 'none';
  creator.innerHTML = '';

  builderData = await fetch('/api/builder').then(r => r.json());

  const form = document.createElement('form');
  form.id = 'charForm';
  form.innerHTML = `
    <div class="form-field">
      <label for="char-name">Name</label>
      <input id="char-name" type="text" required />
    </div>
    <div class="form-field">
      <label for="rel-select">Religious Belief</label>
      <select id="rel-select"></select>
    </div>
    <div class="form-field" id="align-field" style="display:none">
      <label for="align-select">Alignment</label>
      <select id="align-select"></select>
    </div>
    <div class="form-field">
      <label for="fam-select">Family Background</label>
      <select id="fam-select"></select>
    </div>
    <button class="menu-option" type="submit">Create</button>
  `;
  creator.appendChild(form);

  const relSelect = form.querySelector('#rel-select');
  builderData.religious_belief.options.forEach((opt, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = opt.name;
    relSelect.appendChild(o);
  });

  const famSelect = form.querySelector('#fam-select');
  builderData.family_background.options.forEach((opt, i) => {
    const o = document.createElement('option');
    o.value = i;
    o.textContent = opt.name;
    famSelect.appendChild(o);
  });

  const alignField = form.querySelector('#align-field');
  const alignSelect = form.querySelector('#align-select');

  function updateAlignment() {
    const rel = builderData.religious_belief.options[relSelect.value];
    if (rel.alignment && rel.alignment.options) {
      alignField.style.display = 'block';
      alignSelect.innerHTML = '';
      rel.alignment.options.forEach((opt, i) => {
        const o = document.createElement('option');
        o.value = i;
        o.textContent = opt;
        alignSelect.appendChild(o);
      });
    } else {
      alignField.style.display = 'none';
      alignSelect.innerHTML = '';
    }
  }

  relSelect.addEventListener('change', updateAlignment);
  updateAlignment();

  form.addEventListener('submit', createPlayerFromForm);
}

function showStore(name, charData) {
  creator.innerHTML = '';
  const form = document.createElement('form');
  form.id = 'storeForm';

  const selectLists = [];

  function addSelect(labelText, items) {
    const field = document.createElement('div');
    field.className = 'form-field';
    const label = document.createElement('label');
    label.textContent = `Choose ${labelText}`;
    const select = document.createElement('select');
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'None';
    select.appendChild(none);
    items.forEach((it, i) => {
      const o = document.createElement('option');
      o.value = i;
      const desc = it.damage ? ` ${it.damage}` : it.ac_bonus ? ` ${it.ac_bonus}` : '';
      o.textContent = `${it.name}${desc} (${it.cost_skott})`;
      select.appendChild(o);
    });
    field.appendChild(label);
    field.appendChild(select);
    form.appendChild(field);
    selectLists.push(items);
  }

  Object.entries(builderData.item_shop).forEach(([cat, items]) => {
    if (Array.isArray(items)) {
      addSelect(cat, items);
    } else if (items && typeof items === 'object') {
      Object.entries(items).forEach(([sub, subItems]) => {
        addSelect(`${cat} ${sub}`, subItems);
      });
    }
  });

  const finishBtn = document.createElement('button');
  finishBtn.className = 'menu-option';
  finishBtn.textContent = 'Finish';
  form.appendChild(finishBtn);
  creator.appendChild(form);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let idx = 0;
    selectLists.forEach(items => {
      const select = form.querySelectorAll('select')[idx++];
      const choice = select.value;
      if (choice) {
        const item = items[parseInt(choice, 10)];
        if (item) charData.inventory.push(item.name);
      }
    });

    charData.max_slots = 12;
    charData.inventory.forEach(it => {
      const l = it.toLowerCase();
      if (l.includes('backpack')) charData.max_slots += 4;
      if (l.includes('pouch')) charData.max_slots += 2;
    });
    charData.encumber_limit = charData.max_slots + 2;
    charData.encumbered = charData.inventory.length > charData.max_slots;

    await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: charData })
    });

    currentCharacter = { name, ...charData };
    localStorage.setItem('currentCharacter', name);
    append(`Character '${name}' created.`);
    creator.style.display = 'none';
    output.style.display = '';
    menu.style.display = 'flex';
    showMenu('character');
  });
}

async function createPlayerFromForm(e) {
  e.preventDefault();
  const name = document.getElementById('char-name').value.trim();
  if (!name) return;

  const relIdx = parseInt(document.getElementById('rel-select').value, 10);
  const rel = builderData.religious_belief.options[relIdx];
  const famIdx = parseInt(document.getElementById('fam-select').value, 10);
  const fam = builderData.family_background.options[famIdx];

  let alignment;
  const alignField = document.getElementById('align-field');
  if (alignField.style.display !== 'none') {
    const aIdx = parseInt(document.getElementById('align-select').value, 10);
    alignment = rel.alignment.options[aIdx];
  }

  const charData = {
    religious_belief: rel.name,
    languages: rel.languages,
    family_background: fam.name,
    subclass_traits: fam.subclass_traits,
    hp: 6,
    sp: 0,
    sin: 0,
    level: 1,
    inventory: []
  };

  if (alignment) charData.alignment = alignment;

  const allTraits = new Set();
  builderData.family_background.options.forEach(opt => {
    (opt.subclass_traits || []).forEach(t => allTraits.add(t));
  });
  charData.traits = {};
  allTraits.forEach(t => {
    charData.traits[t] = 6;
  });
  fam.subclass_traits.forEach(t => {
    charData.traits[t] = 5;
  });

  if (builderData.starting_gear && builderData.starting_gear.universal_items) {
    builderData.starting_gear.universal_items.forEach(it => {
      let itemName = it.name;
      if (it.quantity) itemName += ` x${it.quantity}`;
      if (it.durability) itemName += ` (${it.durability})`;
      charData.inventory.push(itemName);
    });
  }

  currentCharacter = { name, ...charData };
  showStore(name, charData);
}

async function loadPlayer() {
  const name = prompt('Enter character name');
  if (!name) return;
  const res = await fetch('/api/characters?name=' + encodeURIComponent(name));
  if (!res.ok) {
    append('Character not found.');
    return;
  }
  const data = await res.json();
  const inv = data.inventory || [];
  let max = 12;
  inv.forEach(it => {
    const l = it.toLowerCase();
    if (l.includes('backpack')) max += 4;
    if (l.includes('pouch')) max += 2;
  });
  currentCharacter = { name, ...data, max_slots: max, encumber_limit: max + 2, encumbered: inv.length > max };
  localStorage.setItem('currentCharacter', name);
  append(`Loaded ${name}.`);
  showMenu('character');
}

function clearCharacter() {
  localStorage.removeItem('currentCharacter');
  currentCharacter = null;
  showMenu('player');
}

async function showPlayerManager() {
  output.style.display = 'none';
  menu.style.display = 'none';
  guideEdit.style.display = 'block';
  storyPanel.style.display = 'none';
  guideEdit.innerHTML = '';

  const chars = await fetch('/api/characters').then(r => r.json());
  Object.entries(chars).forEach(([name, data]) => {
    const row = document.createElement('div');
    row.className = 'form-field';
    const label = document.createElement('span');
    label.textContent = name + ' ';
    const editBtn = document.createElement('button');
    editBtn.className = 'menu-option';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => editPlayer(name, data));
    const delBtn = document.createElement('button');
    delBtn.className = 'menu-option';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async () => {
      if (!confirm('Delete ' + name + '?')) return;
      await fetch('/api/characters?name=' + encodeURIComponent(name), { method: 'DELETE' });
      showPlayerManager();
    });
    row.appendChild(label);
    row.appendChild(editBtn);
    row.appendChild(delBtn);
    guideEdit.appendChild(row);
  });
  const back = document.createElement('button');
  back.className = 'menu-option';
  back.textContent = 'Back';
  back.addEventListener('click', () => {
    guideEdit.style.display = 'none';
    output.style.display = '';
    menu.style.display = 'flex';
    showMenu('guide');
  });
  guideEdit.appendChild(back);
}

function editPlayer(name, data) {
  guideEdit.innerHTML = '';
  const form = document.createElement('form');
  const hpField = document.createElement('div');
  hpField.className = 'form-field';
  hpField.innerHTML = `<label>HP</label><input id="hp" type="number" value="${data.hp || 0}" />`;
  const spField = document.createElement('div');
  spField.className = 'form-field';
  spField.innerHTML = `<label>SP</label><input id="sp" type="number" value="${data.sp || 0}" />`;
  const sinField = document.createElement('div');
  sinField.className = 'form-field';
  sinField.innerHTML = `<label>Sin</label><input id="sin" type="number" value="${data.sin || 0}" />`;
  const invField = document.createElement('div');
  invField.className = 'form-field';
  invField.innerHTML = `<label>Inventory</label><input id="inv" type="text" value="${(data.inventory || []).join(', ')}" />`;
  form.appendChild(hpField);
  form.appendChild(spField);
  form.appendChild(sinField);
  form.appendChild(invField);

  if (data.traits) {
    Object.entries(data.traits).forEach(([t, val]) => {
      const tf = document.createElement('div');
      tf.className = 'form-field';
      tf.innerHTML = `<label>${t}</label><input name="trait-${t}" type="number" value="${val}" />`;
      form.appendChild(tf);
    });
  }

  const save = document.createElement('button');
  save.className = 'menu-option';
  save.textContent = 'Save';
  form.appendChild(save);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const updates = {
      hp: parseInt(form.querySelector('#hp').value, 10),
      sp: parseInt(form.querySelector('#sp').value, 10),
      sin: parseInt(form.querySelector('#sin').value, 10),
      inventory: form.querySelector('#inv').value.split(',').map(s => s.trim()).filter(Boolean)
    };
    if (data.traits) {
      updates.traits = {};
      Object.keys(data.traits).forEach(t => {
        updates.traits[t] = parseInt(form.querySelector(`[name=trait-${t}]`).value, 10);
      });
    }
    await fetch('/api/characters?name=' + encodeURIComponent(name), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    showPlayerManager();
  });

  const cancel = document.createElement('button');
  cancel.className = 'menu-option';
  cancel.textContent = 'Cancel';
  cancel.type = 'button';
  cancel.addEventListener('click', showPlayerManager);
  form.appendChild(cancel);

  const offer = document.createElement('button');
  offer.className = 'menu-option';
  offer.textContent = 'Offer Items/Gold';
  offer.type = 'button';
  offer.addEventListener('click', async () => {
    const itemsStr = prompt('Items (comma separated)') || '';
    const goldStr = prompt('Gold amount') || '0';
    const items = itemsStr.split(',').map(s => s.trim()).filter(Boolean);
    const gold = parseInt(goldStr, 10) || 0;
    await fetch('/api/offers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, items, gold })
    });
    alert('Offer sent');
  });
  form.appendChild(offer);

  guideEdit.appendChild(form);
}

const menus = {
  main: [
    { text: 'Player', action: 'showPlayer' },
    { text: 'Guide', action: 'showGuide' },
    { text: 'Rulebook', action: 'showRulebook' }
  ],
  player: [
    { text: 'New Player', action: 'newPlayer' },
    { text: 'Load Game', action: 'loadPlayer' },
    { text: 'Story Dialogue', action: 'showStory' },
    { text: 'Back', action: 'showMain' }
  ],
  guide: [
    { text: 'Start Guide Session', action: 'startGuide' },
    { text: 'Manage Players', action: 'managePlayers' },
    { text: 'Caravan Party', action: 'showParty' },
    { text: 'Hex Tools', action: 'showHexMenu' },
    { text: 'Story Dialogue', action: 'showStory' },
    { text: 'Back', action: 'showMain' }
  ],
  character: [
    { text: 'Character Sheet', action: 'showSheet' },
    { text: 'Inventory', action: 'showInventory' },
    { text: 'Journal', action: 'showJournal' },
    { text: 'Map', action: 'showMap' },
    { text: 'Caravan Party', action: 'showParty' },
    { text: 'Switch Character', action: 'clearCharacter' },
    { text: 'Back', action: 'showMain' }
  ]
};

function showMenu(name) {
  menu.innerHTML = '';
  menus[name].forEach(item => {
    const btn = document.createElement('button');
    btn.className = 'menu-option';
    btn.dataset.action = item.action;
    btn.textContent = item.text;
    btn.addEventListener('click', () => handleAction(item.action));
    menu.appendChild(btn);
  });
}

function showSheet() {
  if (!currentCharacter) {
    append('No character loaded.');
    return;
  }
  storyPanel.style.display = 'none';
  output.style.display = '';
  output.innerHTML = '';
  append('--- Character Sheet ---');
  Object.entries(currentCharacter).forEach(([k, v]) => {
    if (k === 'inventory' || k === 'traits') return;
    const val = Array.isArray(v) ? v.join(', ') : v;
    append(`${k}: ${val}`);
  });
  if (currentCharacter.traits) {
    append('Traits:');
    Object.entries(currentCharacter.traits).forEach(([t, val]) => {
      append(`- ${t}: ${val}/6`);
    });
  }
}

function showInventory() {
  if (!currentCharacter) {
    append('No character loaded.');
    return;
  }
  storyPanel.style.display = 'none';
  output.style.display = '';
  output.innerHTML = '';
  const items = currentCharacter.inventory || [];
  const max = currentCharacter.max_slots || 12;
  const limit = currentCharacter.encumber_limit || (max + 2);
  append(`Inventory (${items.length}/${limit})` + (currentCharacter.encumbered ? ' - Encumbered!' : ''));
  if (items.length) {
    items.forEach(it => append('- ' + it));
  } else {
    append('Empty');
  }
}

function showJournal() {
  storyPanel.style.display = 'none';
  output.style.display = '';
  output.innerHTML = '';
  append('Journal feature coming soon.');
}

function isAdjacent(a, b) {
  const ai = parseInt(a, 10) - 1;
  const bi = parseInt(b, 10) - 1;
  const ax = ai % 5, ay = Math.floor(ai / 5);
  const bx = bi % 5, by = Math.floor(bi / 5);
  return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
}

function showMap() {
  storyPanel.style.display = 'none';
  output.style.display = '';
  output.innerHTML = '';
  const current = localStorage.getItem('currentHex') || '001';
  fetch('/api/hexes').then(r => r.json()).then(all => {
    const grid = document.createElement('div');
    grid.id = 'player-map';
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(5, 1fr)';
    for (let i = 1; i <= 25; i++) {
      const num = i.toString().padStart(3, '0');
      const cell = document.createElement('button');
      cell.className = 'menu-option';
      cell.textContent = num === current ? 'X' : num;
      cell.addEventListener('click', () => {
        const info = all[num];
        if (num === current) {
          output.innerHTML = '';
          append('Hex ' + num);
          if (info) {
            Object.entries(info).forEach(([k, v]) => append(k + ': ' + v));
          } else {
            append('No info.');
          }
        } else if (isAdjacent(current, num)) {
          const roll = Math.floor(Math.random() * 6) + 1;
          const nav = currentCharacter.traits?.Navigation || 0;
          if (roll + nav >= 6 && info) {
            append('Scouted hex ' + num + ':');
            Object.entries(info).forEach(([k, v]) => append(k + ': ' + v));
          } else {
            append('Failed to scout ' + num + ' (roll ' + roll + ')');
          }
        }
      });
      grid.appendChild(cell);
    }
    output.appendChild(grid);
    const back = document.createElement('button');
    back.className = 'menu-option';
    back.textContent = 'Back';
    back.addEventListener('click', () => showMenu('character'));
    output.appendChild(back);
  });
}

async function showParty() {
  storyPanel.style.display = 'none';
  output.style.display = '';
  output.innerHTML = '';

  const isGuide = !currentCharacter;
  const party = await fetch('/api/party').then(r => r.json());

  append('--- Caravan Party ---');
  append('Members: ' + (party.members.join(', ') || 'None'));

  if (isGuide && Object.keys(party.actions).length) {
    append('Chosen Actions:');
    Object.entries(party.actions).forEach(([n, a]) => append(`${n}: ${a}`));
  }

  if (party.pending === 'travel') {
    const rollBtn = document.createElement('button');
    rollBtn.className = 'menu-option';
    rollBtn.textContent = 'Guide: Roll Travel Event';
    rollBtn.addEventListener('click', async () => {
      const res = await fetch('/api/party/travel-roll', { method: 'POST' });
      const data = await res.json();
      if (data.result) append('Travel Event: ' + data.result);
      showParty();
    });
    output.appendChild(rollBtn);
  }

  if (!isGuide) {
    const name = currentCharacter.name;
    const isMember = party.members.includes(name);

    if (isMember) {
      const act = party.actions[name];
      if (act) append('Your chosen action: ' + act);
      const leave = document.createElement('button');
      leave.className = 'menu-option';
      leave.textContent = 'Leave Party';
      leave.addEventListener('click', async () => {
        await fetch('/api/party/leave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        showParty();
      });
      output.appendChild(leave);

      ['travel', 'explore', 'hunt'].forEach(action => {
        const btn = document.createElement('button');
        btn.className = 'menu-option';
        btn.textContent = action.charAt(0).toUpperCase() + action.slice(1);
        btn.addEventListener('click', async () => {
          let desc = '';
          if (action === 'travel') {
            desc = prompt('Describe your travel action') || '';
          }
          await fetch('/api/party/action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, action })
          });
          if (desc) {
            await fetch('/api/story', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: name, text: desc })
            });
          }
          showParty();
        });
        output.appendChild(btn);
      });
    } else {
      const join = document.createElement('button');
      join.className = 'menu-option';
      join.textContent = 'Join Party';
      join.addEventListener('click', async () => {
        await fetch('/api/party/join', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        showParty();
      });
      output.appendChild(join);
    }

    const back = document.createElement('button');
    back.className = 'menu-option';
    back.textContent = 'Back';
    back.addEventListener('click', () => showMenu('character'));
    output.appendChild(back);
  } else {
    const back = document.createElement('button');
    back.className = 'menu-option';
    back.textContent = 'Back';
    back.addEventListener('click', () => showMenu('guide'));
    output.appendChild(back);
  }
}

function showHexMenu() {
  output.style.display = 'none';
  creator.style.display = 'none';
  guideEdit.style.display = 'none';
  storyPanel.style.display = 'none';
  hexGenPanel.style.display = 'flex';
  hexContent.innerHTML = '';
  hexMenu.innerHTML = '';

  const list = document.createElement('button');
  list.className = 'menu-option';
  list.textContent = 'Hex List';
  list.addEventListener('click', showHexList);
  hexMenu.appendChild(list);

  const map = document.createElement('button');
  map.className = 'menu-option';
  map.textContent = 'Hex Map';
  map.addEventListener('click', showHexMap);
  hexMenu.appendChild(map);

  const back = document.createElement('button');
  back.className = 'menu-option';
  back.textContent = 'Back';
  back.addEventListener('click', () => {
    hexGenPanel.style.display = 'none';
    showMenu('guide');
  });
  hexMenu.appendChild(back);
}

async function showHexList() {
  const hx = await fetch('/api/hexes').then(r => r.json());
  hexContent.innerHTML = '';
  for (let i = 1; i <= 25; i++) {
    const num = i.toString().padStart(3, '0');
    const btn = document.createElement('button');
    btn.className = 'menu-option';
    const mark = getMarkerString(hx[num]?.markers);
    btn.textContent = mark ? `${num} ${mark}` : num;
    btn.addEventListener('click', () => editHex(num));
    hexContent.appendChild(btn);
  }
  const back = document.createElement('button');
  back.className = 'menu-option';
  back.textContent = 'Back';
  back.addEventListener('click', showHexMenu);
  hexContent.appendChild(back);
}

async function editHex(num) {
  const all = await fetch('/api/hexes').then(r => r.json());
  let hx = all[num];
  if (!hx) {
    hx = await fetch('/api/hex/generate?hex=' + num).then(r => r.json());
  }
  hx.notes = hx.notes || '';
  hx.markers = hx.markers || {};
  hexContent.innerHTML = '';

  const form = document.createElement('form');

  const info = document.createElement('div');
  info.className = 'form-field';
  info.innerHTML = `
    <p>Biome: ${hx.biome}</p>
    <p>Terrain: ${hx.terrain}</p>
    <p>Quality: ${hx.quality}</p>
    <p>Flora: ${hx.flora}</p>
    <p>Fauna: ${hx.fauna}</p>
    <p>Fish: ${hx.fish}</p>
    <p>Animal Feature: ${hx.animalFeature}</p>
    <p>Flora Feature: ${hx.floraFeature}</p>
  `;
  form.appendChild(info);

  const noteField = document.createElement('div');
  noteField.className = 'form-field';
  noteField.innerHTML = `<label>Notes</label><input name="notes" value="${hx.notes}" />`;
  form.appendChild(noteField);

  const marks = [
    ['current_location', '#'],
    ['mission', 'X'],
    ['revealed_info', '!'],
    ['side_mission', '?'],
    ['traversed', '+']
  ];
  marks.forEach(([m, sym]) => {
    const d = document.createElement('div');
    d.className = 'form-field';
    const checked = hx.markers[m] ? 'checked' : '';
    d.innerHTML = `<label><input type="checkbox" name="mark-${m}" ${checked}/> ${sym}</label>`;
    form.appendChild(d);
  });

  const submit = document.createElement('button');
  submit.className = 'menu-option';
  submit.textContent = 'Save';
  form.appendChild(submit);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const data = {
      hex_number: num,
      biome: hx.biome,
      terrain: hx.terrain,
      quality: hx.quality,
      flora: hx.flora,
      fauna: hx.fauna,
      fish: hx.fish,
      animalFeature: hx.animalFeature,
      floraFeature: hx.floraFeature,
      notes: form.querySelector('[name="notes"]').value,
      markers: {}
    };
    marks.forEach(([m]) => {
      data.markers[m] = form.querySelector(`[name="mark-${m}"]`).checked;
    });
    await fetch('/api/hex/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    showHexList();
  });

  hexContent.appendChild(form);
  const back = document.createElement('button');
  back.className = 'menu-option';
  back.textContent = 'Back';
  back.addEventListener('click', showHexList);
  hexContent.appendChild(back);
}

async function showHexMap() {
  const hx = await fetch('/api/hexes').then(r => r.json());
  hexContent.innerHTML = '';
  const grid = document.createElement('div');
  grid.id = 'hex-grid';
  for (let r = 0; r < 5; r++) {
    const row = document.createElement('div');
    row.className = 'hex-row';
    if (r % 2 === 1) row.classList.add('offset');
    for (let c = 0; c < 5; c++) {
      const num = (r * 5 + c + 1).toString().padStart(3, '0');
      const cell = document.createElement('div');
      cell.className = 'hex-cell';
      const mark = getMarkerString(hx[num]?.markers);
      cell.textContent = mark || num;
      cell.addEventListener('click', () => editHex(num));
      row.appendChild(cell);
    }
    grid.appendChild(row);
  }
  hexContent.appendChild(grid);
  const back = document.createElement('button');
  back.className = 'menu-option';
  back.textContent = 'Back';
  back.addEventListener('click', showHexMenu);
  hexContent.appendChild(back);
}


async function showOffers() {
  storyPanel.style.display = 'none';
  output.style.display = '';
  output.innerHTML = '';
  if (!currentCharacter) {
    append('No character loaded.');
    return;
  }
  const name = currentCharacter.name;
  const offers = await fetch('/api/offers?name=' + encodeURIComponent(name)).then(r => r.json());
  if (!offers.length) {
    append('No offers available.');
  } else {
    offers.forEach((o, i) => {
      append(`Offer ${i + 1}: ${(o.items || []).join(', ')} ${o.gold ? 'Gold: ' + o.gold : ''}`);
      const btn = document.createElement('button');
      btn.className = 'menu-option';
      btn.textContent = 'Take';
      btn.addEventListener('click', async () => {
        await fetch('/api/offers/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, index: i })
        });
        const updated = await fetch('/api/characters?name=' + encodeURIComponent(name)).then(r => r.json());
        currentCharacter = { name, ...updated };
        showOffers();
      });
      output.appendChild(btn);
    });
  }
  const back = document.createElement('button');
  back.className = 'menu-option';
  back.textContent = 'Back';
  back.addEventListener('click', () => showMenu('character'));
  output.appendChild(back);
}

async function showStory() {
  output.style.display = 'none';
  creator.style.display = 'none';
  guideEdit.style.display = 'none';
  menu.style.display = 'flex';
  storyPanel.style.display = 'block';
  storyPanel.innerHTML = '';
  const res = await fetch('/api/story');
  const text = await res.text();
  const lines = text.trim() ? text.trim().split('\n') : [];
  lines.forEach(line => {
    const p = document.createElement('p');
    p.textContent = line;
    storyPanel.appendChild(p);
  });
  const form = document.createElement('form');
  form.id = 'story-form';
  const isGuide = !currentCharacter;
  form.innerHTML = `
    <div class="form-field">
      <select id="story-role">
        <option value="Player">Player</option>
        ${isGuide ? '<option value="Guide">Guide</option>' : ''}
        <option value="Character">Character</option>
        <option value="Story">Story</option>
      </select>
    </div>
    <div class="form-field">
      <input id="story-text" type="text" required />
    </div>
    <button class="menu-option" type="submit">Add Line</button>
  `;
  storyPanel.appendChild(form);
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const role = form.querySelector('#story-role').value;
    const txtEl = form.querySelector('#story-text');
    const line = txtEl.value.trim();
    if (!line) return;
    await fetch('/api/story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role, text: line })
    });
    const p = document.createElement('p');
    p.textContent = `${role}: ${line}`;
    storyPanel.insertBefore(p, form);
    txtEl.value = '';
  });
}

function handleAction(action) {
  output.innerHTML = '';
  switch (action) {
    case 'showPlayer':
      append('Player menu');
      showMenu('player');
      break;
    case 'showGuide':
      append('Guide menu');
      showMenu('guide');
      break;
    case 'showMain':
      showMenu('main');
      break;
    case 'showRulebook':
      window.open('rulebook.html', '_blank');
      break;
    case 'startPlayer':
      append('Starting new game...');
      break;
    case 'newPlayer':
      showCreatorForm();
      break;
    case 'loadPlayer':
      loadPlayer();
      break;
    case 'startGuide':
      append('Starting guide session...');
      break;
    case 'managePlayers':
      showPlayerManager();
      break;
    case 'showSheet':
      showSheet();
      break;
    case 'showInventory':
      showInventory();
      break;
    case 'showJournal':
      showJournal();
      break;
    case 'showMap':
      showMap();
      break;
    case 'showHexMenu':
      showHexMenu();
      break;
    case 'showOffers':
      showOffers();
      break;
    case 'showStory':
      showStory();
      break;
    case 'showParty':
      showParty();
      break;
    case 'clearCharacter':
      clearCharacter();
      break;
    default:
      append(`Unknown action: ${action}`);
  }
}

autoLoadPlayer().then(() => showMenu('main'));
