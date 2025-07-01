# The Bloc Land Lands

This repository provides simple terminal interfaces with persistent storage.

## Getting Started

The terminals store session logs in the `data` directory by default. To run a terminal:

```bash
node terminals/player.js
```

or

```bash
node terminals/guide.js
```

Each line you enter is appended to `session.log` inside the respective data folder. Type `exit` to close the terminal.

Set the `DATA_DIR` environment variable to change where data is stored (defaults to `./data`).
