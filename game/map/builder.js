import * as THREE from 'three'
import { PACMAN_MAP, COLS, ROWS, CELL, WALL_HEIGHT } from './layout.js'

export function gridToWorld(col, row) {
  return new THREE.Vector3(
    (col - COLS / 2 + 0.5) * CELL,
    0,
    (row - ROWS / 2 + 0.5) * CELL
  )
}

export function buildMap(scene) {
  const disposables = []
  const wallBoxes   = []
  const pelletsPos  = []
  const powerPos    = []
  let   spawnPos    = null
  const ghostSpawns = []

  const wallMat  = _createWallMaterial()
  const floorMat = _createFloorMaterial()
  const ceilMat  = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 1.0 })
  const NEON_COLOR = 0x2277ff
  const { matStrip, matGrid } = _createNeonMaterials(NEON_COLOR)

  const totalW = COLS * CELL
  const totalD = ROWS * CELL

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(totalW, totalD), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)
  disposables.push(floor)

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(totalW, totalD), ceilMat)
  ceil.rotation.x = Math.PI / 2
  ceil.position.y = WALL_HEIGHT
  scene.add(ceil)
  disposables.push(ceil)

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cell = PACMAN_MAP[row][col]
      const pos  = gridToWorld(col, row)

      if (cell === 1) {
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(CELL, WALL_HEIGHT, CELL),
          wallMat
        )
        wall.position.set(pos.x, WALL_HEIGHT / 2, pos.z)
        wall.castShadow    = true
        wall.receiveShadow = true
        scene.add(wall)
        wallBoxes.push(new THREE.Box3().setFromObject(wall))
        disposables.push(wall)

      } else if (cell === 2) {
        pelletsPos.push(pos.clone())
      } else if (cell === 3) {
        powerPos.push(pos.clone())
      } else if (cell === 'P') {
        spawnPos = pos.clone()
        spawnPos.y = 1.0
      } else if (cell === 'G') {
        ghostSpawns.push(pos.clone())
      }
    }
  }

  _buildNeonLighting(scene, matStrip, matGrid, disposables)

  return { wallBoxes, pelletsPos, powerPos, spawnPos, ghostSpawns, neonMats: { matStrip, matGrid }, disposables }
}

function _createWallMaterial() {
  const canvas = document.createElement('canvas')
  canvas.width  = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#00003a'
  ctx.fillRect(0, 0, 128, 128)

  ctx.strokeStyle = '#2255cc'
  ctx.lineWidth   = 1.8
  ctx.globalAlpha = 0.65
  const gap = 32
  for (let i = 0; i <= 128; i += gap) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1, 1)

  return new THREE.MeshStandardMaterial({
    map:               tex,
    color:             0x1133cc,
    emissive:          0x000844,
    emissiveIntensity: 0.5,
    roughness:         0.85,
    metalness:         0.1,
  })
}

function _createFloorMaterial() {
  const canvas = document.createElement('canvas')
  canvas.width  = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = '#020208'
  ctx.fillRect(0, 0, 64, 64)

  ctx.strokeStyle = '#080820'
  ctx.lineWidth   = 0.8
  ctx.globalAlpha = 0.5
  for (let i = 0; i <= 64; i += 16) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 64); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(64, i); ctx.stroke()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(COLS / 2, ROWS / 2)

  return new THREE.MeshStandardMaterial({ map: tex, roughness: 1.0, metalness: 0.0 })
}

function _createNeonMaterials(color) {
  const matStrip = new THREE.MeshStandardMaterial({
    color:             color,
    emissive:          color,
    emissiveIntensity: 1.8,
    transparent:       true,
    opacity:           0.95,
  })

  const canvas = document.createElement('canvas')
  canvas.width  = 128
  canvas.height = 128
  const ctx = canvas.getContext('2d')
  const hex = '#' + color.toString(16).padStart(6, '0')
  ctx.clearRect(0, 0, 128, 128)
  ctx.strokeStyle = hex
  ctx.lineWidth   = 1.8
  ctx.globalAlpha = 0.65
  const gap = 32
  for (let i = 0; i <= 128; i += gap) {
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 128); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(128, i); ctx.stroke()
  }
  const texGrid = new THREE.CanvasTexture(canvas)
  texGrid.wrapS = texGrid.wrapT = THREE.RepeatWrapping
  texGrid.repeat.set(2, 2)

  const matGrid = new THREE.MeshBasicMaterial({
    map:         texGrid,
    transparent: true,
    opacity:     0.55,
    depthWrite:  false,
    side:        THREE.FrontSide,
  })

  return { matStrip, matGrid }
}

function _buildNeonLighting(scene, matStrip, matGrid, disposables) {
  const neighbors = [
    { dl: -1, dc:  0 },
    { dl:  1, dc:  0 },
    { dl:  0, dc: -1 },
    { dl:  0, dc:  1 },
  ]

  const rotationY = { '-10': 0, '10': Math.PI, '0-1': Math.PI / 2, '01': -Math.PI / 2 }

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      if (PACMAN_MAP[row][col] === 1) continue

      const coords = gridToWorld(col, row)

      for (const { dl, dc } of neighbors) {
        const vr = row + dl
        const vc = col + dc

        if (vr < 0 || vr >= ROWS || vc < 0 || vc >= COLS) continue
        if (PACMAN_MAP[vr][vc] !== 1) continue

        const sx   = coords.x + dc * (CELL / 2 - 0.03)
        const sz   = coords.z + dl * (CELL / 2 - 0.03)
        const geoW = dc !== 0 ? 0.05 : CELL
        const geoD = dc !== 0 ? CELL  : 0.05

        const stripBottom = new THREE.Mesh(new THREE.BoxGeometry(geoW, 0.06, geoD), matStrip)
        stripBottom.position.set(sx, 0.06, sz)
        scene.add(stripBottom)
        disposables.push(stripBottom)

        const stripTop = new THREE.Mesh(new THREE.BoxGeometry(geoW, 0.06, geoD), matStrip)
        stripTop.position.set(sx, WALL_HEIGHT - 0.06, sz)
        scene.add(stripTop)
        disposables.push(stripTop)

        const plane = new THREE.Mesh(new THREE.PlaneGeometry(CELL, WALL_HEIGHT), matGrid)
        plane.position.set(sx, WALL_HEIGHT / 2, sz)
        plane.rotation.y = rotationY[`${dl}${dc}`]
        scene.add(plane)
        disposables.push(plane)
      }
    }
  }
}
