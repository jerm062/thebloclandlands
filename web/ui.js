const output = document.getElementById('output');
const menu = document.getElementById('menu');
const creator = document.getElementById('creator');
const guideEdit = document.getElementById('guide-edit');

let builderData = null;
let currentCharacter = null;

function append(text) {
  const p = document.createElement('p');
  p.textContent = text;
  output.appendChild(p);
  output.scrollTop = output.scrollHeight;
}

async function showCreatorForm() {
  output.style.display = 'none';
  menu.style.display = 'none';
  creator.style.display = 'block';
  guideEdit.style.display = 'none';
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

  Object.entries(builderData.item_shop).forEach(([cat, items]) => {
    const field = document.createElement('div');
    field.className = 'form-field';
    const label = document.createElement('label');
    label.textContent = `Choose ${cat}`;
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
  });

  const finishBtn = document.createElement('button');
  finishBtn.className = 'menu-option';
  finishBtn.textContent = 'Finish';
  form.appendChild(finishBtn);
  creator.appendChild(form);

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let idx = 0;
    Object.entries(builderData.item_shop).forEach(([cat, items]) => {
      const select = form.querySelectorAll('select')[idx++];
      const choice = select.value;
      if (choice) {
        const item = items[parseInt(choice, 10)];
        if (item) charData.inventory.push(item.name);
      }
    });

    await fetch('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: charData })
    });

    currentCharacter = { name, ...charData };
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
  currentCharacter = { name, ...data };
  append(`Loaded ${name}.`);
  showMenu('character');
}

async function showPlayerManager() {
  output.style.display = 'none';
  menu.style.display = 'none';
  guideEdit.style.display = 'block';
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
  const invField = document.createElement('div');
  invField.className = 'form-field';
  invField.innerHTML = `<label>Inventory</label><input id="inv" type="text" value="${(data.inventory || []).join(', ')}" />`;
  form.appendChild(hpField);
  form.appendChild(spField);
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
    { text: 'Back', action: 'showMain' }
  ],
  guide: [
    { text: 'Start Guide Session', action: 'startGuide' },
    { text: 'Manage Players', action: 'managePlayers' },
    { text: 'Back', action: 'showMain' }
  ],
  character: [
    { text: 'Character Sheet', action: 'showSheet' },
    { text: 'Inventory', action: 'showInventory' },
    { text: 'Journal', action: 'showJournal' },
    { text: 'Map', action: 'showMap' },
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
  output.innerHTML = '';
  const items = currentCharacter.inventory || [];
  append('Inventory: ' + (items.length ? items.join(', ') : 'Empty'));
}

function showJournal() {
  output.innerHTML = '';
  append('Journal feature coming soon.');
}

function showMap() {
  output.innerHTML = '';
  append('Map feature coming soon.');
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
    default:
      append(`Unknown action: ${action}`);
  }
}

showMenu('main');
