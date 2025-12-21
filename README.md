# html_games
A collection of simple and interactive games built using HTML, CSS, and JavaScript. This repository focuses on learning core web development concepts through small, playable game projects.

## Flappy Bird (HTML + JS)

A simple, self-contained Flappy Bird clone using the HTML5 Canvas. Files added:

- `index.html` — game page.
- `style.css` — basic layout and styling.
- `game.js` — game logic: physics, pipes, collision, scoring, and controls.

How to run:

1. Open `index.html` in a web browser (double-click or use a simple static server).
2. Press Space, click, or tap to make the bird flap.

Controls:

- Spacebar or mouse click/tap: flap/jump.
- After game over: press Space or click to restart.

Files are intentionally dependency-free and work by opening `index.html` directly.

## Chess (HTML + JS)

A lightweight, playable chess board implemented with DOM + JavaScript. Features:

- Click pieces to see legal moves and execute captures.
- Move history and basic check/checkmate and stalemate detection.
- Promotion to queen automatically when pawns reach the last rank.

How to run:

1. Open `chess/index.html` in a web browser.
2. Click a piece then click a highlighted square to move.

Notes: Castling and en-passant are not implemented yet. No AI engine included — moves are two-player local.
This chess page now includes an optional Bot opponent. Choose "Play vs Bot" from the homepage or on the chess page, pick difficulty (Easy = random moves, Medium = shallow minimax), and choose whether the bot plays White or Black.

## Pac‑Man (HTML + JS)

A compact Pac‑Man clone implemented with Canvas. Features:

- Tile-based maze, pellets, simple ghost AI, scoring and lives.
- Controls: Arrow keys or WASD to move.
- Open `pacman/index.html` to play.

This is a lightweight demo, intended to be dependency-free and playable by opening the HTML file in a browser.
