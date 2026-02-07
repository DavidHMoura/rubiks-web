import * as THREE from "three";

const FACE_TO_MAT = { R: 0, L: 1, U: 2, D: 3, F: 4, B: 5 };

const COLORS = {
  U: 0xffffff,
  D: 0xffd500,
  F: 0x00b140,
  B: 0x0046ad,
  R: 0xb71234,
  L: 0xff5800,
  X: 0x0a0d12,
};

const CORNER_COLORS = [
  ["U","R","F"], ["U","F","L"], ["U","L","B"], ["U","B","R"],
  ["D","F","R"], ["D","L","F"], ["D","B","L"], ["D","R","B"],
];

const EDGE_COLORS = [
  ["U","R"], ["U","F"], ["U","L"], ["U","B"],
  ["D","R"], ["D","F"], ["D","L"], ["D","B"],
  ["F","R"], ["F","L"], ["B","L"], ["B","R"],
];

const CORNER_POS_FACES = [
  ["U","R","F"], ["U","F","L"], ["U","L","B"], ["U","B","R"],
  ["D","F","R"], ["D","L","F"], ["D","B","L"], ["D","R","B"],
];

const EDGE_POS_FACES = [
  ["U","R"], ["U","F"], ["U","L"], ["U","B"],
  ["D","R"], ["D","F"], ["D","L"], ["D","B"],
  ["F","R"], ["F","L"], ["B","L"], ["B","R"],
];

const CORNER_POS = [
  [ 1, 1, 1], [-1, 1, 1], [-1, 1,-1], [ 1, 1,-1],
  [ 1,-1, 1], [-1,-1, 1], [-1,-1,-1], [ 1,-1,-1],
];

const EDGE_POS = [
  [ 1, 1, 0], [ 0, 1, 1], [-1, 1, 0], [ 0, 1,-1],
  [ 1,-1, 0], [ 0,-1, 1], [-1,-1, 0], [ 0,-1,-1],
  [ 1, 0, 1], [-1, 0, 1], [-1, 0,-1], [ 1, 0,-1],
];

const CENTER_POS = {
  U: [0, 1, 0],
  D: [0,-1, 0],
  F: [0, 0, 1],
  B: [0, 0,-1],
  R: [1, 0, 0],
  L: [-1,0, 0],
};

function mkMaterials() {
  const mats = new Array(6);
  for (let i = 0; i < 6; i++) {
    mats[i] = new THREE.MeshStandardMaterial({
      color: COLORS.X,
      roughness: 0.45,
      metalness: 0.05,
    });
  }
  return mats;
}

function setFaceColor(mats, faceLetter, colorLetter) {
  const idx = FACE_TO_MAT[faceLetter];
  if (idx == null) return;
  mats[idx].color.setHex(COLORS[colorLetter]);
}

function makePieceMesh(size) {
  const geo = new THREE.BoxGeometry(size, size, size);
  const mats = mkMaterials();
  const mesh = new THREE.Mesh(geo, mats);

  const edges = new THREE.EdgesGeometry(geo, 30);
  const outline = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
  mesh.add(outline);

  mesh.userData.mats = mats;
  return mesh;
}

function cornerColorMap(pieceId, ori) {
  const [a,b,c] = CORNER_COLORS[pieceId];
  if (ori === 0) return [a,b,c];
  if (ori === 1) return [c,a,b];
  return [b,c,a];
}

function edgeColorMap(pieceId, ori) {
  const [a,b] = EDGE_COLORS[pieceId];
  return ori === 0 ? [a,b] : [b,a];
}

export function createCubeRenderer(scene, spacing = 1.08) {
  const cornerMeshes = Array.from({ length: 8 }, () => makePieceMesh(0.98));
  const edgeMeshes   = Array.from({ length: 12 }, () => makePieceMesh(0.98));
  const centerMeshes = {
    U: makePieceMesh(0.98),
    D: makePieceMesh(0.98),
    F: makePieceMesh(0.98),
    B: makePieceMesh(0.98),
    R: makePieceMesh(0.98),
    L: makePieceMesh(0.98),
  };

  for (const m of cornerMeshes) scene.add(m);
  for (const m of edgeMeshes) scene.add(m);
  for (const k of Object.keys(centerMeshes)) scene.add(centerMeshes[k]);

  function setMeshAtGrid(mesh, gx, gy, gz) {
    mesh.position.set(gx * spacing, gy * spacing, gz * spacing);
  }

  function updateFromState(state) {
    // corners
    for (let pos = 0; pos < 8; pos++) {
      const pieceId = state.cp[pos];
      const ori = state.co[pos];

      const mesh = cornerMeshes[pieceId];
      const mats = mesh.userData.mats;
      for (let i = 0; i < 6; i++) mats[i].color.setHex(COLORS.X);

      const facesAtPos = CORNER_POS_FACES[pos];
      const cols = cornerColorMap(pieceId, ori);

      setFaceColor(mats, facesAtPos[0], cols[0]);
      setFaceColor(mats, facesAtPos[1], cols[1]);
      setFaceColor(mats, facesAtPos[2], cols[2]);

      const [x,y,z] = CORNER_POS[pos];
      setMeshAtGrid(mesh, x, y, z);
      mesh.quaternion.identity();
    }

    // edges
    for (let pos = 0; pos < 12; pos++) {
      const pieceId = state.ep[pos];
      const ori = state.eo[pos];

      const mesh = edgeMeshes[pieceId];
      const mats = mesh.userData.mats;
      for (let i = 0; i < 6; i++) mats[i].color.setHex(COLORS.X);

      const facesAtPos = EDGE_POS_FACES[pos];
      const cols = edgeColorMap(pieceId, ori);

      setFaceColor(mats, facesAtPos[0], cols[0]);
      setFaceColor(mats, facesAtPos[1], cols[1]);

      const [x,y,z] = EDGE_POS[pos];
      setMeshAtGrid(mesh, x, y, z);
      mesh.quaternion.identity();
    }

    // centers
    for (const face of ["U","D","F","B","R","L"]) {
      const m = centerMeshes[face];
      const mats = m.userData.mats;
      for (let i = 0; i < 6; i++) mats[i].color.setHex(COLORS.X);
      setFaceColor(mats, face, face);

      const [x,y,z] = CENTER_POS[face];
      setMeshAtGrid(m, x, y, z);
      m.quaternion.identity();
    }
  }

  function meshesOnLayer(axisKey, layerValue) {
    const eps = 1e-3;
    const all = [
      ...cornerMeshes,
      ...edgeMeshes,
      ...Object.values(centerMeshes),
    ];

    return all.filter((m) => {
      if (axisKey === "x") return Math.abs(m.position.x - layerValue * spacing) < eps;
      if (axisKey === "y") return Math.abs(m.position.y - layerValue * spacing) < eps;
      return Math.abs(m.position.z - layerValue * spacing) < eps;
    });
  }

  return {
    cornerMeshes,
    edgeMeshes,
    centerMeshes,
    updateFromState,
    meshesOnLayer,
  };
}
