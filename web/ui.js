const output = document.getElementById('output');

function append(text) {
  const p = document.createElement('p');
  p.textContent = text;
  output.appendChild(p);
  output.scrollTop = output.scrollHeight;
}

document.querySelectorAll('.menu-option').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    append(`Selected: ${btn.textContent}`);
    if (action === 'exit') {
      append('Thank you for playing.');
    }
  });
});
