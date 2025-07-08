const resource = document.body.dataset.resource;
const list = document.getElementById('list');
const form = document.getElementById('form');
const nameInput = document.getElementById('name');
const dataInput = document.getElementById('data');

async function load() {
  const res = await fetch('/api/' + resource);
  const data = await res.json();
  list.textContent = JSON.stringify(data, null, 2);
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
