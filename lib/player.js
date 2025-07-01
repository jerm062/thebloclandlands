const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const readline = require('readline');
const runTerminal = require('./terminal');

function loadYaml(filePath, defaultValue) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return yaml.load(data) || defaultValue;
  } catch (err) {
    return defaultValue;
  }
}

function saveYaml(filePath, data) {
  const yamlStr = yaml.dump(data);
  fs.writeFileSync(filePath, yamlStr, 'utf8');
}

function ask(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer.trim()));
  });
}

async function buildCharacter(name, builder, charactersPath, characters, rl) {
  const charData = { inventory: [] };

  const rel = builder.religious_belief;
  console.log(rel.description);
  rel.options.forEach((opt, i) => {
    console.log(`${i + 1}) ${opt.name}`);
  });
  let choice = await ask(rl, 'Choose religious belief: ');
  let idx = parseInt(choice, 10) - 1;
  let selectedRel = rel.options[idx] || rel.options[0];
  charData.religious_belief = selectedRel.name;
  charData.languages = selectedRel.languages;

  if (selectedRel.alignment && selectedRel.alignment.options) {
    selectedRel.alignment.options.forEach((opt, i) => {
      console.log(`${i + 1}) ${opt}`);
    });
    choice = await ask(rl, 'Choose alignment: ');
    idx = parseInt(choice, 10) - 1;
    charData.alignment = selectedRel.alignment.options[idx] || selectedRel.alignment.options[0];
  }

  const fam = builder.family_background;
  console.log(fam.description);
  fam.options.forEach((opt, i) => {
    console.log(`${i + 1}) ${opt.name}`);
  });
  choice = await ask(rl, 'Choose family background: ');
  idx = parseInt(choice, 10) - 1;
  const selectedFam = fam.options[idx] || fam.options[0];
  charData.family_background = selectedFam.name;
  charData.subclass_traits = selectedFam.subclass_traits;

  const allTraits = new Set();
  fam.options.forEach(opt => {
    (opt.subclass_traits || []).forEach(t => allTraits.add(t));
  });
  charData.traits = {};
  allTraits.forEach(t => {
    charData.traits[t] = 6;
  });
  selectedFam.subclass_traits.forEach(t => {
    charData.traits[t] = 5;
  });

  if (builder.item_shop) {
    console.log('--- Item Shop ---');
    for (const [category, items] of Object.entries(builder.item_shop)) {
      console.log(category.toUpperCase());
      items.forEach((it, i) => {
        const desc = it.damage ? `damage ${it.damage}` : it.ac_bonus ? `AC ${it.ac_bonus}` : '';
        console.log(`${i + 1}) ${it.name} ${desc} (${it.cost_skott} Skott)`);
      });
      choice = await ask(rl, `Choose ${category} (0 for none): `);
      idx = parseInt(choice, 10) - 1;
      if (idx >= 0 && idx < items.length) {
        charData.inventory.push(items[idx].name);
      }
    }
  }

  characters[name] = charData;
  saveYaml(charactersPath, characters);
  console.log(`Character '${name}' created.`);
}

async function start() {
  const baseDir = process.env.DATA_DIR || path.resolve(__dirname, '../data');
  const builderPath = path.join(baseDir, 'character_builder.yaml');
  const charactersPath = path.join(baseDir, 'characters.yaml');

  const builderData = loadYaml(builderPath, {});
  const characters = loadYaml(charactersPath, {});

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const name = await ask(rl, 'Enter character name: ');

  if (characters[name]) {
    console.log(`Welcome back, ${name}!`);
    console.log('Loaded character:', JSON.stringify(characters[name], null, 2));
  } else {
    console.log(`Creating new character '${name}'.`);
    await buildCharacter(name, builderData.character_builder, charactersPath, characters, rl);
  }

  rl.close();
  runTerminal('player');
}

module.exports = start;
