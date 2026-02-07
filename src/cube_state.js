// Modelo mecânico (cubie model) baseado nas definições do Herbert Kociemba.
// Posições:
//  corners: URF,UFL,ULB,UBR,DFR,DLF,DBL,DRB  (0..7)
//  edges:   UR,UF,UL,UB,DR,DF,DL,DB,FR,FL,BL,BR (0..11)
//
// Estado:
//  cp[pos] = qual canto está naquela posição
//  co[pos] = orientação do canto (0..2)
//  ep[pos] = qual aresta está naquela posição
//  eo[pos] = orientação da aresta (0..1)

export const CORNERS = ["URF","UFL","ULB","UBR","DFR","DLF","DBL","DRB"];
export const EDGES   = ["UR","UF","UL","UB","DR","DF","DL","DB","FR","FL","BL","BR"];

export const FACE_AXES = {
  U: { axis: "y", layer:  1 },
  D: { axis: "y", layer: -1 },
  R: { axis: "x", layer:  1 },
  L: { axis: "x", layer: -1 },
  F: { axis: "z", layer:  1 },
  B: { axis: "z", layer: -1 },
};

export function solvedState() {
  return {
    cp: [0,1,2,3,4,5,6,7],
    co: [0,0,0,0,0,0,0,0],
    ep: [0,1,2,3,4,5,6,7,8,9,10,11],
    eo: [0,0,0,0,0,0,0,0,0,0,0,0],
  };
}

export function cloneState(s) {
  return {
    cp: s.cp.slice(),
    co: s.co.slice(),
    ep: s.ep.slice(),
    eo: s.eo.slice(),
  };
}

export function isSolved(s) {
  for (let i = 0; i < 8; i++) if (s.cp[i] !== i || s.co[i] !== 0) return false;
  for (let i = 0; i < 12; i++) if (s.ep[i] !== i || s.eo[i] !== 0) return false;
  return true;
}

// ===== Moves (U,R,F,D,L,B) =====
// Formato "replaced by" da página CubeDefs.htm do Kociemba.
// Para cada posição de destino i:
//  new.cp[i] = old.cp[ srcPos ]
//  new.co[i] = (old.co[srcPos] + oriInc) mod 3
const MOVE_CORNER_SRC = {
  U: [3,0,1,2,4,5,6,7],
  R: [4,1,2,0,7,5,6,3],
  F: [1,5,2,3,0,4,6,7],
  D: [0,1,2,3,5,6,7,4],
  L: [0,2,6,3,4,1,5,7],
  B: [0,1,3,7,4,5,2,6],
};

const MOVE_CORNER_OINC = {
  U: [0,0,0,0,0,0,0,0],
  R: [2,0,0,1,1,0,0,2],
  F: [1,2,0,0,2,1,0,0],
  D: [0,0,0,0,0,0,0,0],
  L: [0,1,2,0,0,2,1,0],
  B: [0,0,1,2,0,0,2,1],
};

const MOVE_EDGE_SRC = {
  U: [3,0,1,2,4,5,6,7,8,9,10,11],
  R: [8,1,2,3,11,5,6,7,4,9,10,0],
  F: [0,9,2,3,4,8,6,7,1,5,10,11],
  D: [0,1,2,3,5,6,7,4,8,9,10,11],
  L: [0,1,10,3,4,5,9,7,8,2,6,11],
  B: [0,1,2,11,4,5,6,10,8,9,3,7],
};

const MOVE_EDGE_OINC = {
  U: [0,0,0,0,0,0,0,0,0,0,0,0],
  R: [0,0,0,0,0,0,0,0,0,0,0,0],
  F: [0,1,0,0,0,1,0,0,1,1,0,0],
  D: [0,0,0,0,0,0,0,0,0,0,0,0],
  L: [0,0,0,0,0,0,0,0,0,0,0,0],
  B: [0,0,0,1,0,0,0,1,0,0,1,1],
};

function applyFaceTurnOnce(s, face) {
  const cp2 = new Array(8);
  const co2 = new Array(8);
  const ep2 = new Array(12);
  const eo2 = new Array(12);

  const cs = MOVE_CORNER_SRC[face];
  const co = MOVE_CORNER_OINC[face];
  for (let i = 0; i < 8; i++) {
    const src = cs[i];
    cp2[i] = s.cp[src];
    co2[i] = (s.co[src] + co[i]) % 3;
  }

  const es = MOVE_EDGE_SRC[face];
  const eo = MOVE_EDGE_OINC[face];
  for (let i = 0; i < 12; i++) {
    const src = es[i];
    ep2[i] = s.ep[src];
    eo2[i] = (s.eo[src] + eo[i]) & 1; // mod 2
  }

  s.cp = cp2;
  s.co = co2;
  s.ep = ep2;
  s.eo = eo2;
}

export function applyMove(s, move) {
  // move: { face:'R', amount:1|2|3 }  (3 = prime)
  const face = move.face;
  const times = move.amount; // 1,2,3
  for (let i = 0; i < times; i++) applyFaceTurnOnce(s, face);
}

export function invertMove(move) {
  // inverso: x -> x' ; x' -> x ; x2 -> x2
  if (move.amount === 2) return { face: move.face, amount: 2 };
  return { face: move.face, amount: move.amount === 1 ? 3 : 1 };
}

export function moveToString(move) {
  if (move.amount === 1) return move.face;
  if (move.amount === 2) return `${move.face}2`;
  return `${move.face}'`;
}

export function parseMoveToken(tok) {
  const t = tok.trim();
  if (!t) return null;
  const face = t[0].toUpperCase();
  if (!"URFDLB".includes(face)) return null;
  const suf = t.slice(1);
  if (suf === "2") return { face, amount: 2 };
  if (suf === "'") return { face, amount: 3 };
  if (suf === "") return { face, amount: 1 };
  return null;
}

export function randomScramble(len = 25) {
  // regra simples e “humana”: não repetir a mesma face e não repetir o mesmo eixo em sequência
  const faces = ["U","R","F","D","L","B"];
  const axisOf = (f) => FACE_AXES[f].axis;

  const out = [];
  let lastFace = null;
  let lastAxis = null;

  for (let i = 0; i < len; i++) {
    let f = faces[(Math.random() * faces.length) | 0];
    while (f === lastFace || axisOf(f) === lastAxis) {
      f = faces[(Math.random() * faces.length) | 0];
    }
    lastFace = f;
    lastAxis = axisOf(f);

    const r = Math.random();
    const amount = r < 0.72 ? 1 : r < 0.86 ? 2 : 3; // mais 90° que 2/prime
    out.push({ face: f, amount });
  }

  return out;
}
