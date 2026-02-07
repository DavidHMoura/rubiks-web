import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import "./style.css";

import {
  FACE_AXES,
  solvedState,
  applyMove,
  invertMove,
  moveToString,
  randomScramble,
  isSolved,
} from "./cube_state.js";

import { createCubeRenderer } from "./cube_render.js";

// ---------- scene ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f14);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(4, 4, 6);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// lights
scene.add(new THREE.AmbientLight(0xffffff, 0.9));
const dir = new THREE.DirectionalLight(0xffffff, 1.2);
dir.position.set(5, 10, 7);
scene.add(dir);

// orbit
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;

// ---------- UI ----------
const ui = document.createElement("div");
ui.style.position = "fixed";
ui.style.left = "16px";
ui.style.top = "16px";
ui.style.display = "flex";
ui.style.flexDirection = "column";
ui.style.gap = "10px";
ui.style.zIndex = "10";
ui.style.userSelect = "none";
document.body.appendChild(ui);

function makeBtn(label) {
  const b = document.createElement("button");
  b.textContent = label;
  b.style.padding = "10px 12px";
  b.style.borderRadius = "10px";
  b.style.border = "1px solid rgba(255,255,255,.12)";
  b.style.background = "rgba(20,24,32,.75)";
  b.style.color = "white";
  b.style.cursor = "pointer";
  b.style.backdropFilter = "blur(6px)";
  b.onmouseenter = () => (b.style.background = "rgba(30,36,48,.85)");
  b.onmouseleave = () => (b.style.background = "rgba(20,24,32,.75)");
  return b;
}

function makePanel() {
  const p = document.createElement("div");
  p.style.padding = "10px 12px";
  p.style.borderRadius = "10px";
  p.style.border = "1px solid rgba(255,255,255,.12)";
  p.style.background = "rgba(20,24,32,.55)";
  p.style.color = "rgba(255,255,255,.9)";
  p.style.backdropFilter = "blur(6px)";
  p.style.maxWidth = "420px";
  p.style.fontFamily =
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
  p.style.fontSize = "12px";
  p.style.lineHeight = "1.4";
  p.style.whiteSpace = "pre-wrap";
  return p;
}

const row = document.createElement("div");
row.style.display = "flex";
row.style.gap = "10px";
ui.appendChild(row);

const btnScramble = makeBtn("Embaralhar");
const btnReset = makeBtn("Reset");
const btnUndo = makeBtn("Undo");
const btnRedo = makeBtn("Redo");
row.appendChild(btnScramble);
row.appendChild(btnReset);
row.appendChild(btnUndo);
row.appendChild(btnRedo);

const panel = makePanel();
ui.appendChild(panel);

const badge = document.createElement("div");
badge.style.padding = "6px 10px";
badge.style.borderRadius = "999px";
badge.style.border = "1px solid rgba(255,255,255,.12)";
badge.style.background = "rgba(0,255,255,.12)";
badge.style.color = "rgba(255,255,255,.95)";
badge.style.fontFamily =
  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
badge.style.fontSize = "12px";
badge.style.display = "inline-block";
badge.style.width = "fit-content";
badge.textContent = "RESOLVIDO";
badge.style.visibility = "hidden";
ui.appendChild(badge);

// ---------- cube state ----------
let state = solvedState();
let scrambleMoves = [];
let userMoves = [];
const undoStack = [];
const redoStack = [];

function refreshPanel() {
  const scr = scrambleMoves.length ? scrambleMoves.map(moveToString).join(" ") : "-";
  const usr = userMoves.length ? userMoves.map(moveToString).join(" ") : "-";
  panel.textContent = `Scramble: ${scr}\nMoves:    ${usr}`;
  badge.style.visibility = isSolved(state) && userMoves.length ? "visible" : "hidden";
}

// ---------- cube renderer ----------
const spacing = 1.08;
const cube = createCubeRenderer(scene, spacing);
cube.updateFromState(state);
refreshPanel();

// ---------- move queue + animation ----------
let rotating = false;
const queue = [];

const AXIS_VEC = {
  x: new THREE.Vector3(1, 0, 0),
  y: new THREE.Vector3(0, 1, 0),
  z: new THREE.Vector3(0, 0, 1),
};

// CRÍTICO: no cubie-model (Kociemba), U/R/F clockwise = -90° no eixo positivo.
// D/L/B clockwise = +90° no eixo positivo.
function baseSignForFace(face) {
  return (face === "U" || face === "R" || face === "F") ? -1 : 1;
}

function setButtonsEnabled(enabled) {
  btnScramble.disabled = !enabled;
  btnReset.disabled = !enabled;
  btnUndo.disabled = !enabled;
  btnRedo.disabled = !enabled;
  const op = enabled ? "1" : "0.6";
  btnScramble.style.opacity = op;
  btnReset.style.opacity = op;
  btnUndo.style.opacity = op;
  btnRedo.style.opacity = op;
}

function animateFaceTurn(move, record) {
  const face = move.face;
  const amount = move.amount; // 1,2,3
  const { axis, layer } = FACE_AXES[face];

  const pieces = cube.meshesOnLayer(axis, layer);

  const pivot = new THREE.Object3D();
  scene.add(pivot);

  if (axis === "x") pivot.position.x = layer * spacing;
  if (axis === "y") pivot.position.y = layer * spacing;
  if (axis === "z") pivot.position.z = layer * spacing;

  for (const m of pieces) pivot.attach(m);

  // amount -> sentido no modelo:
  // 1 = clockwise (definição do cubo)
  // 3 = anti-clockwise (prime)
  // 2 = 180
  const sBase = baseSignForFace(face);
  const dirTurn = (amount === 3) ? -1 : 1;
  const turns = (amount === 2) ? 2 : 1;

  // ângulo final em termos do eixo positivo (x/y/z)
  const angleTarget = (Math.PI / 2) * sBase * dirTurn * turns;

  const axisV = AXIS_VEC[axis];
  const durationMs = 140 + (turns === 2 ? 70 : 0);
  const start = performance.now();

  rotating = true;
  controls.enabled = false;

  function tick(now) {
    const t = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - t, 3);

    pivot.quaternion.setFromAxisAngle(axisV, angleTarget * eased);

    if (t < 1) return requestAnimationFrame(tick);

    pivot.quaternion.setFromAxisAngle(axisV, angleTarget);

    for (const m of pieces) scene.attach(m);
    scene.remove(pivot);

    // mecânica real
    applyMove(state, move);
    cube.updateFromState(state);

    rotating = false;
    controls.enabled = true;

    if (record) {
      userMoves.push(move);
      undoStack.push(move);
      redoStack.length = 0;
    }

    refreshPanel();
    flushQueue();
  }

  requestAnimationFrame(tick);
}

function flushQueue() {
  if (rotating) return;
  if (!queue.length) return setButtonsEnabled(true);

  setButtonsEnabled(false);
  const { move, record } = queue.shift();
  animateFaceTurn(move, record);
}

function enqueueMove(move, record = true) {
  queue.push({ move, record });
  flushQueue();
}

// ---------- buttons ----------
btnScramble.addEventListener("click", () => {
  if (rotating || queue.length) return;

  scrambleMoves = randomScramble(25);
  userMoves = [];

  state = solvedState();
  cube.updateFromState(state);

  undoStack.length = 0;
  redoStack.length = 0;
  refreshPanel();

  for (const m of scrambleMoves) enqueueMove(m, false);
});

btnReset.addEventListener("click", () => {
  if (rotating || queue.length) return;

  state = solvedState();
  cube.updateFromState(state);

  scrambleMoves = [];
  userMoves = [];
  undoStack.length = 0;
  redoStack.length = 0;
  refreshPanel();
});

btnUndo.addEventListener("click", () => {
  if (rotating || queue.length) return;
  if (!undoStack.length) return;

  const last = undoStack.pop();
  const inv = invertMove(last);
  redoStack.push(last);

  userMoves.pop();
  enqueueMove(inv, false);
});

btnRedo.addEventListener("click", () => {
  if (rotating || queue.length) return;
  if (!redoStack.length) return;

  const m = redoStack.pop();
  undoStack.push(m);

  enqueueMove(m, true);
});

// ---------- interaction (push a row) ----------
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();

let pointerDown = false;
let startX = 0;
let startY = 0;

let pickedMesh = null;
const pickedFaceNormalWorld = new THREE.Vector3();

function setNDCFromEvent(e) {
  const rect = renderer.domElement.getBoundingClientRect();
  ndc.set(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -(((e.clientY - rect.top) / rect.height) * 2 - 1)
  );
}

function pick(e) {
  setNDCFromEvent(e);
  raycaster.setFromCamera(ndc, camera);

  const allMeshes = [
    ...cube.cornerMeshes,
    ...cube.edgeMeshes,
    ...Object.values(cube.centerMeshes),
  ];

  const hits = raycaster.intersectObjects(allMeshes, false);
  if (!hits.length) return null;

  const hit = hits[0];
  const mesh = hit.object;

  const nLocal = hit.face?.normal?.clone();
  if (!nLocal) return null;

  const nWorld = nLocal
    .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld))
    .normalize();

  return { mesh, normalWorld: nWorld };
}

// vetor de arrasto em mundo (plano da câmera)
function dragWorldDirection(dx, dy) {
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);

  const up = camera.up.clone().normalize();
  const right = new THREE.Vector3().crossVectors(camDir, up).normalize();

  return new THREE.Vector3()
    .addScaledVector(right, dx)
    .addScaledVector(up, -dy);
}

function axisKeyFromVector(v) {
  const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z);
  if (ay >= ax && ay >= az) return "y";
  if (az >= ax && az >= ay) return "z";
  return "x";
}

function faceFromAxisAndLayer(axisKey, layerSign) {
  if (axisKey === "x") return layerSign > 0 ? "R" : "L";
  if (axisKey === "y") return layerSign > 0 ? "U" : "D";
  return layerSign > 0 ? "F" : "B";
}

// Converte rotação “+90 ao redor do eixo positivo” (rotSign=+1)
// para move amount (1 = clockwise, 3 = prime) para a face escolhida.
// Usando a mesma convenção do cubie-model:
function amountFromRotSign(face, rotSign) {
  // Para faces U/R/F: clockwise = -90 no eixo positivo.
  // Para D/L/B: clockwise = +90 no eixo positivo.
  const sBase = baseSignForFace(face); // -1 (URF) ou +1 (DLB)

  // Queremos achar amount tal que:
  // angleSign (no eixo positivo) = sBase * dirTurn
  // onde dirTurn = +1 para amount=1 (clockwise), -1 para amount=3 (prime)
  // Se rotSign = +1, então precisamos de sBase*dirTurn = +1 => dirTurn = +1/sBase
  // Como sBase é ±1:
  // rotSign == sBase -> amount=1 ; rotSign == -sBase -> amount=3
  return (rotSign === sBase) ? 1 : 3;
}

function moveFromFaceDrag(mesh, faceNormalWorld, dx, dy) {
  const dragW = dragWorldDirection(dx, dy);
  if (dragW.lengthSq() < 1e-8) return null;

  // eixo do giro pelo gesto (igual seu grid antigo):
  // axisW aponta no sentido da rotação (regra da mão direita)
  const axisW = new THREE.Vector3().crossVectors(faceNormalWorld, dragW);
  if (axisW.lengthSq() < 1e-8) return null;

  axisW.normalize();
  const axisKey = axisKeyFromVector(axisW);

  // só outer layers (como cubo real)
  // decidimos layer pelo lado do mesh naquele eixo (posição atual)
  const pos = mesh.position;
  const eps = 0.2 * spacing;

  let layerSign = 0;
  if (axisKey === "x") layerSign = pos.x > eps ? 1 : pos.x < -eps ? -1 : 0;
  if (axisKey === "y") layerSign = pos.y > eps ? 1 : pos.y < -eps ? -1 : 0;
  if (axisKey === "z") layerSign = pos.z > eps ? 1 : pos.z < -eps ? -1 : 0;

  // se clicou numa peça do meio no eixo escolhido, ignora (não é face externa)
  if (layerSign === 0) return null;

  const face = faceFromAxisAndLayer(axisKey, layerSign);

  // sinal de rotação no eixo positivo (x/y/z):
  const comp = axisKey === "x" ? axisW.x : axisKey === "y" ? axisW.y : axisW.z;
  const rotSign = Math.sign(comp) || 1; // +1 = +90 no eixo positivo, -1 = -90

  const dragLen = Math.hypot(dx, dy);
  if (dragLen > 170) return { face, amount: 2 }; // 180

  const amount = amountFromRotSign(face, rotSign);
  return { face, amount };
}

// pointer handlers (capture para não virar câmera)
renderer.domElement.addEventListener(
  "pointerdown",
  (e) => {
    if (rotating || queue.length) return;

    const hit = pick(e);
    if (!hit) {
      controls.enabled = true;
      pointerDown = false;
      pickedMesh = null;
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    renderer.domElement.setPointerCapture(e.pointerId);

    pointerDown = true;
    startX = e.clientX;
    startY = e.clientY;

    pickedMesh = hit.mesh;
    pickedFaceNormalWorld.copy(hit.normalWorld);

    controls.enabled = false;
  },
  true
);

renderer.domElement.addEventListener(
  "pointermove",
  (e) => {
    if (!pointerDown || rotating || queue.length || !pickedMesh) return;

    e.preventDefault();
    e.stopPropagation();

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // deadzone
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;

    pointerDown = false;

    const mv = moveFromFaceDrag(pickedMesh, pickedFaceNormalWorld, dx, dy);

    pickedMesh = null;

    if (!mv) {
      controls.enabled = true;
      return;
    }

    enqueueMove(mv, true);
  },
  true
);

renderer.domElement.addEventListener(
  "pointerup",
  (e) => {
    if (pointerDown) {
      e.preventDefault();
      e.stopPropagation();
    }

    pointerDown = false;
    pickedMesh = null;

    try {
      renderer.domElement.releasePointerCapture(e.pointerId);
    } catch {}

    if (!rotating && !queue.length) controls.enabled = true;
  },
  true
);

// ---------- loop ----------
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
