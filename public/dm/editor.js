const resource = document.body.dataset.resource;
const list = document.getElementById('list');
const form = document.getElementById('form');
const nameInput = document.getElementById('name');
const dataInput = document.getElementById('data');

async function load() {
  const res = await fetch('/api/' + resource);
  const data = await res.json();
  list.innerHTML = '';
  for (const [name, val] of Object.entries(data)) {
    const row = document.createElement('div');
    const edit = document.createElement('button');
    edit.textContent = 'Edit';
    edit.onclick = () => {
      nameInput.value = name;
      dataInput.value = JSON.stringify(val, null, 2);
    };
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.onclick = async () => {
      await fetch('/api/' + resource + '?name=' + encodeURIComponent(name), { method: 'DELETE' });
      load();
    };
    row.appendChild(edit);
    row.appendChild(del);
    row.appendChild(document.createTextNode(' ' + name));
    list.appendChild(row);
  }
}

form.onsubmit = async (e) => {
  e.preventDefault();
  try {
    const name = nameInput.value;
    const val = JSON.parse(dataInput.value || '{}');
    await fetch('/api/' + resource, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, data: val })
    });
    nameInput.value = '';
    dataInput.value = '';
    load();
  } catch {
    alert('Invalid JSON');
  }
};

load();
