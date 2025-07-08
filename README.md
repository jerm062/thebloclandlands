# The BlocLand Lands

This repository provides a very small prototype for a text-based RPG system inspired by **Old School Essentials**. It includes a minimal HTTP server written without external frameworks and a few static HTML pages. The UI uses a simple dark theme reminiscent of classic cRPGs.

Run the server with:

```sh
node server.js
```

The site is split into a **Player** side and a **Dungeon Master** side. Both sides are extremely simple placeholders meant as starting points for future development.

- Player section: character creation and basic character sheet view. When a requested character does not exist you are redirected back to the creation form.
- Dungeon Master section: editors for characters, NPCs, items, bestiary, dungeons, and maps. Maps can be drawn using a small grid based editor.

Game data is stored in JSON files under the `data/` directory.
