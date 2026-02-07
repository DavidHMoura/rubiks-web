# Rubik's Web Cube 🧊

A Rubik’s Cube simulator built with **Vanilla JavaScript** and **Three.js**, focused on replicating the real cube mechanics (cubie model), including **piece permutation and orientation**.

The goal of this project is to provide a smooth interactive experience in the browser, allowing users to rotate layers naturally by dragging on cube faces.

---

## 🚀 Live Demo

After deploying with GitHub Pages:

https://davidhmoura.github.io/rubiks-web/

---

## ✨ Features

- Real Rubik’s Cube mechanical logic (cubie model)
- Drag-to-rotate layer interaction (similar to a real cube)
- Smooth layer animation
- Orbit camera control
- Scramble button (random shuffle)
- Reset button
- Undo / Redo system
- Solved state detection

---

## 🧠 How it works

This project is divided into two main parts:

### **1) Cube State (Logic)**
The cube is represented using a cubie model:
- `cp` (corner permutation)
- `co` (corner orientation)
- `ep` (edge permutation)
- `eo` (edge orientation)

Moves (`U, D, R, L, F, B`) are applied by updating these arrays using predefined transformation tables.

File:
- `src/cube_state.js`

### **2) Cube Rendering (Three.js)**
The cube is rendered using multiple meshes representing:
- corners
- edges
- centers

The renderer updates mesh positions and face colors based on the cube state.

File:
- `src/cube_render.js`

### **3) Interaction System**
When the user clicks a face and drags:
- the drag direction is projected into 3D space
- the rotation axis is computed using cross products
- the correct layer is selected (outer layers only)
- the corresponding move is applied to the state and animated

File:
- `src/main.js`

---

## 🕹️ Controls

- **Drag on the cube** → rotates a layer
- **Drag outside the cube** → rotates the camera
- **Scroll wheel** → zoom

---

## 📦 Installation

Clone the repository:

```bash
git clone https://github.com/davidhmoura/rubiks-web.git
cd rubiks-web
Install dependencies:

npm install
Run locally:

npm run dev
Build for production:

npm run build
Preview build:

npm run preview
🌍 Deploy to GitHub Pages (Vite)
This project is compatible with GitHub Pages.

Make sure your vite.config.js contains:

import { defineConfig } from "vite";

export default defineConfig({
  base: "/rubiks-web/",
});
Then deploy using GitHub Actions or a manual dist deployment.

📁 Project Structure
rubiks-web/
│── public/
│── src/
│   ├── cube_state.js     # cube mechanics / cubie model
│   ├── cube_render.js    # Three.js cube rendering
│   ├── main.js           # interaction + animation + UI
│   └── style.css
│── index.html
│── vite.config.js
│── package.json
│── README.md
