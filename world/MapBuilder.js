import * as THREE from 'three'
import { PACMAN_MAP, COLS, ROWS, CELL, WALL_HEIGHT } from '../config/mapLayout.js'

// ── Coordonnées ───────────────────────────────────────────────────────────────

export function gridToWorld(col, row) {
  return new THREE.Vector3(
    (col - COLS / 2 + 0.5) * CELL,
    0,
    (row - ROWS / 2 + 0.5) * CELL
  )
}

// ── Construction de la scène ──────────────────────────────────────────────────

export function buildMap(scene) {
  const disposables = []
  const wallBoxes   = []
  const pelletsPos  = []
  const powerPos    = []
  const ghostSpawns = []
  let   spawnPos    = null

  const materials = _createMaterials()

  _buildFloorAndCeiling(scene, materials, disposables)
  _buildWallsAndItems(scene, materials, wallBoxes, pelletsPos, powerPos, ghostSpawns, disposables,
    (pos) => { spawnPos = pos })
  const neonMats = _buildNeonLighting(scene, materials, disposables)

  return { wallBoxes, pelletsPos, powerPos, spawnPos, ghostSpawns, neonMats, disposables }
}

// ── Sol & Plafond ─────────────────────────────────────────────────────────────

function _buildFloorAndCeiling(scene, { floor: floorMaterial, ceil: ceilingMaterial }, disposables) {
  const totalWidth = COLS * CELL
  const totalDepth = ROWS * CELL

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(totalWidth, totalDepth), floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  disposables.push(floor)

  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(totalWidth, totalDepth), ceilingMaterial)
  ceiling.rotation.x = Math.PI / 2
  ceiling.position.y = WALL_HEIGHT
  scene.add(ceiling)
  disposables.push(ceiling)
}

// ── Murs & Items ──────────────────────────────────────────────────────────────

function _buildWallsAndItems(scene, { wall: wallMaterial }, wallBoxes, pelletsPos, powerPos,
  ghostSpawns, disposables, onSpawn) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cellValue = PACMAN_MAP[row][col]
      const position  = gridToWorld(col, row)

      if      (cellValue === 1)   _addWall(scene, position, wallMaterial, wallBoxes, disposables)
      else if (cellValue === 2)   pelletsPos.push(position.clone())
      else if (cellValue === 3)   powerPos.push(position.clone())
      else if (cellValue === 'G') ghostSpawns.push(position.clone())
      else if (cellValue === 'P') onSpawn(position.clone().setY(1.0))
    }
  }
}

function _addWall(scene, position, material, wallBoxes, disposables) {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(CELL, WALL_HEIGHT, CELL), material)
  wall.position.set(position.x, WALL_HEIGHT / 2, position.z)
  wall.castShadow    = true
  wall.receiveShadow = true
  scene.add(wall)
  wallBoxes.push(new THREE.Box3().setFromObject(wall))
  disposables.push(wall)
}

// ── Éclairage néon ────────────────────────────────────────────────────────────

function _buildNeonLighting(scene, { neonStrip: stripMaterial, neonGrid: gridMaterial }, disposables) {
  const neighborOffsets = [
    { rowDelta: -1, colDelta:  0 },
    { rowDelta:  1, colDelta:  0 },
    { rowDelta:  0, colDelta: -1 },
    { rowDelta:  0, colDelta:  1 },
  ]

  // Map from "rowDelta,colDelta" string to the Y-rotation angle for the neon plane
  const rotationByDirection = { '-10': 0, '10': Math.PI, '0-1': Math.PI / 2, '01': -Math.PI / 2 }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (PACMAN_MAP[row][col] === 1) continue
      const cellCenter = gridToWorld(col, row)

      for (const { rowDelta, colDelta } of neighborOffsets) {
        const neighborRow = row + rowDelta
        const neighborCol = col + colDelta
        if (neighborRow < 0 || neighborRow >= ROWS || neighborCol < 0 || neighborCol >= COLS) continue
        if (PACMAN_MAP[neighborRow][neighborCol] !== 1) continue

        // Position the neon strip flush against the wall face
        const stripX = cellCenter.x + colDelta * (CELL / 2 - 0.03)
        const stripZ = cellCenter.z + rowDelta * (CELL / 2 - 0.03)

        // The strip is thin on the side facing the wall, and spans a full cell on the other axis
        const stripWidth = colDelta !== 0 ? 0.05 : CELL
        const stripDepth = colDelta !== 0 ? CELL  : 0.05

        const bottomStrip = new THREE.Mesh(new THREE.BoxGeometry(stripWidth, 0.06, stripDepth), stripMaterial)
        bottomStrip.position.set(stripX, 0.06, stripZ)
        scene.add(bottomStrip)
        disposables.push(bottomStrip)

        const topStrip = new THREE.Mesh(new THREE.BoxGeometry(stripWidth, 0.06, stripDepth), stripMaterial)
        topStrip.position.set(stripX, WALL_HEIGHT - 0.06, stripZ)
        scene.add(topStrip)
        disposables.push(topStrip)

        const gridPlane = new THREE.Mesh(new THREE.PlaneGeometry(CELL, WALL_HEIGHT), gridMaterial)
        gridPlane.position.set(stripX, WALL_HEIGHT / 2, stripZ)
        gridPlane.rotation.y = rotationByDirection[`${rowDelta}${colDelta}`]
        scene.add(gridPlane)
        disposables.push(gridPlane)
      }
    }
  }

  return { matStrip: stripMaterial, matGrid: gridMaterial }
}

// ── Matériaux ─────────────────────────────────────────────────────────────────

function _createMaterials() {
  return {
    wall:      _wallMaterial(),
    floor:     _floorMaterial(),
    ceil:      new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0 }),
    neonStrip: _neonStripMaterial(0x2277ff),
    neonGrid:  _neonGridMaterial(0x2277ff),
  }
}

function _wallMaterial() {
  const canvas = _createCanvas(128, 128, (ctx) => {
    ctx.fillStyle = '#00003a'
    ctx.fillRect(0, 0, 128, 128)
    ctx.strokeStyle = '#2255cc'
    ctx.lineWidth   = 1.8
    ctx.globalAlpha = 0.65
    for (let i = 0; i <= 128; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0);   ctx.lineTo(i, 128); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i);   ctx.lineTo(128, i); ctx.stroke()
    }
  })

  const texture = new THREE.CanvasTexture(canvas.canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping

  return new THREE.MeshStandardMaterial({
    map: texture, color: 0x1133cc, emissive: 0x000844,
    emissiveIntensity: 0.5, roughness: 0.85, metalness: 0.1,
  })
}

function _floorMaterial() {
  const canvas = _createCanvas(64, 64, (ctx) => {
    ctx.fillStyle = '#020208'
    ctx.fillRect(0, 0, 64, 64)
    ctx.strokeStyle = '#080820'
    ctx.lineWidth   = 0.8
    ctx.globalAlpha = 0.5
    for (let i = 0; i <= 64; i += 16) {
      ctx.beginPath(); ctx.moveTo(i, 0);  ctx.lineTo(i, 64); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i);  ctx.lineTo(64, i); ctx.stroke()
    }
  })

  const texture = new THREE.CanvasTexture(canvas.canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(COLS / 2, ROWS / 2)

  return new THREE.MeshStandardMaterial({ map: texture, roughness: 1.0, metalness: 0.0 })
}

function _neonStripMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: 1.8,
    transparent: true, opacity: 0.95,
  })
}

function _neonGridMaterial(color) {
  const hexColor = '#' + color.toString(16).padStart(6, '0')
  const canvas = _createCanvas(128, 128, (ctx) => {
    ctx.clearRect(0, 0, 128, 128)
    ctx.strokeStyle = hexColor
    ctx.lineWidth   = 1.8
    ctx.globalAlpha = 0.65
    for (let i = 0; i <= 128; i += 32) {
      ctx.beginPath(); ctx.moveTo(i, 0);   ctx.lineTo(i, 128); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, i);   ctx.lineTo(128, i); ctx.stroke()
    }
  })

  const texture = new THREE.CanvasTexture(canvas.canvas)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(2, 2)

  return new THREE.MeshBasicMaterial({
    map: texture, transparent: true, opacity: 0.55,
    depthWrite: false, side: THREE.FrontSide,
  })
}

// ── Utilitaire ────────────────────────────────────────────────────────────────

function _createCanvas(width, height, draw) {
  const canvas = document.createElement('canvas')
  canvas.width  = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  draw(ctx)
  return ctx
}
