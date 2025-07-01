const output = document.getElementById('output');
const menu = document.getElementById('menu');

function append(text) {
  const p = document.createElement('p');
  p.textContent = text;
  output.appendChild(p);
  output.scrollTop = output.scrollHeight;
}

async function createPlayer() {
  const name = prompt('Enter new player name:');
  if (!name) return;

  append(`Creating character '${name}'`);
  const builder = await fetch('/api/builder').then(r => r.json());
  const charData = {};

  const rel = builder.religious_belief;
  const relChoice = prompt(
    rel.description + '\n' +
      rel.options.map((o, i) => `${i + 1}) ${o.name}`).join('\n')
  );
  const relIdx = parseInt(relChoice, 10) - 1;
  const selectedRel = rel.options[relIdx] || rel.options[0];
  charData.religious_belief = selectedRel.name;
  charData.languages = selectedRel.languages;

  if (selectedRel.alignment && selectedRel.alignment.options) {
    const alignChoice = prompt(
      'Choose alignment:\n' +
        selectedRel.alignment.options
          .map((o, i) => `${i + 1}) ${o}`)
          .join('\n')
    );
    const alignIdx = parseInt(alignChoice, 10) - 1;
    charData.alignment =
      selectedRel.alignment.options[alignIdx] ||
      selectedRel.alignment.options[0];
  }

  const fam = builder.family_background;
  const famChoice = prompt(
    fam.description + '\n' +
      fam.options.map((o, i) => `${i + 1}) ${o.name}`).join('\n')
  );
  const famIdx = parseInt(famChoice, 10) - 1;
  const selectedFam = fam.options[famIdx] || fam.options[0];
  charData.family_background = selectedFam.name;
  charData.subclass_traits = selectedFam.subclass_traits;

  await fetch('/api/characters', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, data: charData })
  });

  append(`Character '${name}' created.`);
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
      createPlayer();
      break;
    case 'loadPlayer':
      append('Loading saved game...');
      break;
    case 'startGuide':
      append('Starting guide session...');
      break;
    default:
      append(`Unknown action: ${action}`);
  }
}

showMenu('main');
