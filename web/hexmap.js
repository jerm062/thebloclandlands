const grid = document.getElementById('hex-grid');
const editor = document.getElementById('editor');
const noteField = document.getElementById('note');
let currentHex = null;
let hexData = {};

async function loadHexes() {
  try {
    const res = await fetch('/api/hexes');
    if (res.ok) hexData = await res.json();
  } catch (err) {
    console.error('Failed to load hex data');
  }
}

function renderGrid() {
  grid.innerHTML = '';
  for (let r = 0; r < 10; r++) {
    const row = document.createElement('div');
    row.className = 'hex-row';
    if (r % 2 === 1) row.classList.add('offset');
    for (let c = 0; c < 10; c++) {
      const num = (r * 10 + c + 1).toString().padStart(3, '0');
      const cell = document.createElement('div');
      cell.className = 'hex-cell';
      cell.dataset.hex = num;
      cell.textContent = num;
      const note = hexData[num]?.note;
      if (note) cell.title = note;
      cell.addEventListener('click', () => openEditor(num));
      row.appendChild(cell);
    }
    grid.appendChild(row);
  }
}

function openEditor(num) {
  currentHex = num;
  noteField.value = hexData[num]?.note || '';
  editor.style.display = 'block';
  noteField.focus();
}

document.getElementById('saveNote').addEventListener('click', async () => {
  if (!currentHex) return;
  const note = noteField.value.trim();
  try {
    await fetch('/api/hex/note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hex: currentHex, note })
    });
    hexData[currentHex] = { ...(hexData[currentHex] || {}), note };
    renderGrid();
  } catch (err) {
    console.error('Failed to save note');
  }
  editor.style.display = 'none';
});

document.getElementById('cancelNote').addEventListener('click', () => {
  editor.style.display = 'none';
});

loadHexes().then(renderGrid);
