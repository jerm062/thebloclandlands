const fs = require('fs');
const path = require('path');
const readline = require('readline');

function runStory() {
  const baseDir = process.env.DATA_DIR || path.resolve(__dirname, '../data');
  const storyPath = path.join(baseDir, 'story.txt');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log('Enter story text. Type "exit" to quit.');

  async function promptRole() {
    return new Promise(res => rl.question('Role (p/g): ', ans => res(ans.trim().toLowerCase())));
  }

  async function promptText(role) {
    return new Promise(res => rl.question(role + '> ', ans => res(ans.trim())));
  }

  (async function loop() {
    while (true) {
      const role = await promptRole();
      if (role === 'exit') break;
      const label = role === 'g' ? 'Guide' : 'Player';
      const text = await promptText(label);
      if (text === 'exit') break;
      fs.appendFileSync(storyPath, `${label}: ${text}\n`);
      console.log('Saved.');
    }
    rl.close();
  })();

  rl.on('close', () => {
    console.log('Story session ended.');
    process.exit(0);
  });
}

module.exports = runStory;
