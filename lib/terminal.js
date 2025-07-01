const fs = require('fs');
const path = require('path');
const readline = require('readline');

function run(role) {
  const baseDir = process.env.DATA_DIR || path.resolve(__dirname, '../data');
  const roleDir = path.join(baseDir, role);
  fs.mkdirSync(roleDir, { recursive: true });
  const logPath = path.join(roleDir, 'session.log');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: role.toUpperCase() + '> '
  });

  rl.prompt();

  rl.on('line', line => {
    const entry = line.trim();
    if (entry === 'exit') {
      rl.close();
      return;
    }
    fs.appendFileSync(logPath, entry + '\n');
    console.log('Saved:', entry);
    rl.prompt();
  }).on('close', () => {
    console.log(`${role} terminal closed.`);
    process.exit(0);
  });
}

module.exports = run;
