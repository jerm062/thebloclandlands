# The Bloc Land Lands

This repository provides simple terminal interfaces with persistent storage.

## Install Dependencies

The project uses Yarn as the package manager. Install modules with:

```bash
yarn install --immutable
```

## Getting Started

The terminals store session logs in the `data` directory by default. To run a terminal:

```bash
node terminals/player.js
```

or

```bash
node terminals/guide.js
```

To collaboratively record the story, run:

```bash
node terminals/story.js
```

Each line you enter is appended to `session.log` inside the respective data folder. Type `exit` to close the terminal.

Set the `DATA_DIR` environment variable to change where data is stored (defaults to `./data`).

## Character Builder

Player characters are stored in `data/characters.yaml`. When `player.js` runs,
enter a character name. If the name is not found, the character builder will
prompt for choices defined in `data/character_builder.yaml` and save the new
character before starting the player terminal.

## Web UI

A basic web interface is provided in the `web` directory. Open `web/index.html`
in a browser to try a simple menu styled in the spirit of classic text RPGs.
The UI uses the [Jacquard 24](https://fonts.google.com/specimen/Jacquard+24)
font from Google Fonts.

**Note:** Features like creating new characters require the API endpoints
served by `server.js`. Make sure the server is running before using these
options.

## Running the Web Server

You can launch a simple HTTP server that serves the `web` directory. Start it
with:

```bash
node server.js
```

The server listens on the port defined by the `PORT` environment variable (or
`3000` by default) and provides a landing page with links to the player and
guide options.
