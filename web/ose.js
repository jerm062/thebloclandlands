const API = '';

const landing = document.getElementById('landing');
const playerPanel = document.getElementById('player');
const dmPanel = document.getElementById('dm');

document.getElementById('to-player').onclick = () => {
  landing.style.display = 'none';
  showPlayerCreate();
};

document.getElementById('to-dm').onclick = () => {
  landing.style.display = 'none';
  showDmMenu();
};

function api(path, opts) {
  return fetch(API + path, opts);
}

function showPlayerCreate() {
  playerPanel.style.display = 'block';
  dmPanel.style.display = 'none';
  playerPanel.innerHTML = `
    <h3>Create Character</h3>
    <input id="pc-name" placeholder="Name" class="menu-option" />
    <button id="pc-create" class="menu-option">Create</button>
  `;
  document.getElementById('pc-create').onclick = async () => {
    const name = document.getElementById('pc-name').value.trim();
    if (!name) return;
    await api('/api/characters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: { hp: 1, inventory: [] } })
    });
    showPlayerMain(name);
  };
}

function showPlayerMain(name) {
  playerPanel.innerHTML = '';
  playerPanel.style.display = 'block';
  dmPanel.style.display = 'none';
  playerPanel.innerHTML = `
    <h3>${name}</h3>
    <div id="sheet"></div>
    <div id="chat"></div>
    <div id="journal"></div>
    <button id="back" class="menu-option">Back</button>
  `;
  document.getElementById('back').onclick = () => {
    playerPanel.style.display = 'none';
    landing.style.display = 'block';
  };
  loadCharacter(name);
}

async function loadCharacter(name) {
  const res = await api('/api/characters?name=' + encodeURIComponent(name));
  if (!res.ok) return;
  const data = await res.json();
  const sheet = document.getElementById('sheet');
  sheet.textContent = JSON.stringify(data, null, 2);
}

function showDmMenu() {
  dmPanel.style.display = 'block';
  playerPanel.style.display = 'none';
  dmPanel.innerHTML = `
    <h3>Dungeon Master</h3>
    <button id="edit-chars" class="menu-option">Characters</button>
    <button id="edit-npcs" class="menu-option">NPCs</button>
    <button id="edit-items" class="menu-option">Items</button>
    <button id="edit-bestiary" class="menu-option">Bestiary</button>
    <button id="edit-dungeons" class="menu-option">Dungeons</button>
    <button id="edit-maps" class="menu-option">Maps</button>
    <button id="dm-back" class="menu-option">Back</button>
  `;
  document.getElementById('dm-back').onclick = () => {
    dmPanel.style.display = 'none';
    landing.style.display = 'block';
  };
  document.getElementById('edit-chars').onclick = listCharacters;
  document.getElementById('edit-npcs').onclick = () => listYaml('npcs');
  document.getElementById('edit-items').onclick = () => listYaml('items');
  document.getElementById('edit-bestiary').onclick = () => listYaml('bestiary');
  document.getElementById('edit-dungeons').onclick = () => listYaml('dungeons');
  document.getElementById('edit-maps').onclick = () => listYaml('maps');
}

async function listCharacters() {
  const res = await api('/api/characters');
  const data = await res.json();
  dmPanel.innerHTML = '<h3>Characters</h3>';
  Object.keys(data).forEach(n => {
    const div = document.createElement('div');
    div.textContent = n;
    dmPanel.appendChild(div);
  });
  const back = document.createElement('button');
  back.textContent = 'Back';
  back.className = 'menu-option';
  back.onclick = showDmMenu;
  dmPanel.appendChild(back);
}

async function listYaml(type) {
  const res = await api(`/api/${type}`);
  const data = await res.json();
  dmPanel.innerHTML = `<h3>${type}</h3>`;
  Object.keys(data).forEach(n => {
    const div = document.createElement('div');
    div.textContent = n;
    dmPanel.appendChild(div);
  });
  const back = document.createElement('button');
  back.className = 'menu-option';
  back.textContent = 'Back';
  back.onclick = showDmMenu;
  dmPanel.appendChild(back);
}
