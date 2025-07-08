# The BlocLand Lands

This repository provides a very small prototype for a text-based RPG system inspired by **Old School Essentials**. It includes a minimal HTTP server written without external frameworks and a few static HTML pages.

Run the server with:

```sh
node server.js
```

The site is split into a **Player** side and a **Dungeon Master** side. Both sides are extremely simple placeholders meant as starting points for future development.

- Player section: character creation and basic character sheet view.
- Dungeon Master section: links for editing characters, NPCs, items, bestiary, dungeons, and maps.

Game data is stored in JSON files under the `data/` directory.
