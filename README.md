# AirDraw AI

A modern, web-browser based "Air Drawing System" powered by Google MediaPipe Tasks-Vision. Turn your webcam into an interactive AI canvas using just your hands!

## Features

- **Draw (One Finger)**: Extended index finger draws a continuous line on the canvas.
- **Erase (Open Palm)**: Clears overlapping paths seamlessly when all fingers are extended.
- **Move (Pinch)**: Thumb and index finger pinch allows you to "grab" the drawn canvas and pan your art around.
- **Pause (Fist)**: Curled fingers stop the drawing cursor entirely, preventing unwanted lines.
- **Custom UI**: Beautiful dark-mode Glassmorphism dashboard with adjustable Brush Color and Size settings.

## Setup Instructions

This project uses modern JavaScript Modules (`.mjs`) and WebAssembly (WASM) for MediaPipe Tasks running directly in the browser. Due to strict CORS (Cross-Origin Resource Sharing) policies in modern web browsers, the files **must be served via a local web server**. 

If you try to simply double-click the `index.html` file, you will run into errors loading the AI models.

### Step-by-Step

1. First, make sure you have the files locally (or clone the repository).
2. Serve the directory with a local HTTP server. 
   - **Using VS Code**: Install the extension "Live Server", right click `index.html`, and select "Open with Live Server".
   - **Using Python**: Open your terminal, navigate to this folder, and run: `python3 -m http.server 8000`
   - **Using Node.js**: Run `npx http-server`
3. Navigate to the server URL (e.g. `http://localhost:8000`) in your web browser.
4. Allow your browser access to your Webcam when prompted.
5. Wait for the AI models to load.
6. Start drawing!

## Tech Stack
- HTML5 Canvas (dual-canvas layering for separated UI & Art frames)
- CSS3 (Variables, Gradients, Glassmorphism Backdrop Filter, CSS Transformations)
- Vanilla JavaScript (ES6+ Modules, RequestAnimationFrame, Dual-buffer Panning logic)
- Google MediaPipe Tasks Vision (`@mediapipe/tasks-vision`) loaded dynamically via CDN.
