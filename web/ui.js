const output = document.getElementById('output');
const menu = document.getElementById('menu');
const creator = document.getElementById('creator');

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
    level: 1,
    inventory: []
  };

  if (alignment) charData.alignment = alignment;

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
  append('--- Character Sheet ---');
  Object.entries(currentCharacter).forEach(([k, v]) => {
    if (k === 'inventory') return;
    const val = Array.isArray(v) ? v.join(', ') : v;
    append(`${k}: ${val}`);
  });
}

function showInventory() {
  if (!currentCharacter) {
    append('No character loaded.');
    return;
  }
  const items = currentCharacter.inventory || [];
  append('Inventory: ' + (items.length ? items.join(', ') : 'Empty'));
}

function showJournal() {
  append('Journal feature coming soon.');
}

function showMap() {
  append('Map feature coming soon.');
}

function handleAction(action) {
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
      append('Loading saved game...');
      break;
    case 'startGuide':
      append('Starting guide session...');
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
