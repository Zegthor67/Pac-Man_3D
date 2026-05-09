import * as THREE from 'three'
import {
  CELL, ROWS,
  GHOST_RADIUS,
  GHOST_SPEED_NORMAL, GHOST_SPEED_SCARED, GHOST_SPEED_EATEN,
  GHOST_SPAWN_STAGGER, GHOST_RESPAWN_MS,
  POWER_FLASH_MS,
} from '../../constants.js'
import { gridToWorld } from '../map/builder.js'

const GHOST_DEFS = [
  { name: 'Blinky', color: 0xff0000, emissive: 0xaa0000 },
  { name: 'Pinky',  color: 0xff88ff, emissive: 0xcc44cc },
  { name: 'Inky',   color: 0x00ccff, emissive: 0x0088aa },
  { name: 'Clyde',  color: 0xff8800, emissive: 0xcc5500 },
]

const STATE = {
  SPAWN:  'spawn',
  CHASE:  'chase',
  SCARED: 'scared',
  EATEN:  'eaten',
}

const DIRS = [
  new THREE.Vector3( 1, 0,  0),
  new THREE.Vector3(-1, 0,  0),
  new THREE.Vector3( 0, 0,  1),
  new THREE.Vector3( 0, 0, -1),
]

export class Ghost {
  constructor(scene, index, spawnPos, wallBoxes) {
    this.scene     = scene
    this.index     = index
    this.name      = GHOST_DEFS[index].name
    this.wallBoxes = wallBoxes

    this.position = spawnPos.clone()
    this.homePos  = spawnPos.clone()

    this.state       = STATE.SPAWN
    this.dir         = new THREE.Vector3(1, 0, 0)
    this._spawnTimer = index * GHOST_SPAWN_STAGGER

    this._buildMesh(index)
  }

  // ── Mesh ──────────────────────────────────────────────────────────────────

  _buildMesh(index) {
    const cfg  = GHOST_DEFS[index]
    this.group = new THREE.Group()

    this._mats = {
      normal: new THREE.MeshStandardMaterial({
        color: cfg.color, emissive: cfg.emissive, emissiveIntensity: 0.5, roughness: 0.6,
      }),
      scared: new THREE.MeshStandardMaterial({
        color: 0x0000cc, emissive: 0x000044, emissiveIntensity: 0.3, roughness: 0.6,
      }),
      flash: new THREE.MeshStandardMaterial({
        color: 0xffffff, emissive: 0xaaaaaa, emissiveIntensity: 0.8,
      }),
      eaten: new THREE.MeshStandardMaterial({
        color: 0x666666, transparent: true, opacity: 0.2,
      }),
    }

    this._bodyTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      this._mats.normal
    )
    this._bodyTop.position.y = 0.35

    this._bodyBot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.7, 16),
      this._mats.normal
    )
    this._bodyBot.position.y = 0

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI - Math.PI / 6
      const foot  = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        this._mats.normal
      )
      foot.rotation.x = Math.PI
      foot.position.set(Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5)
      this.group.add(foot)
    }

    const eyeWhite = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const eyeBlue  = new THREE.MeshStandardMaterial({
      color: 0x0044ff, emissive: 0x0022bb, emissiveIntensity: 0.8,
    })
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), eyeWhite)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), eyeBlue)
      white.position.set(side * 0.25, 0.72, 0.55)
      pupil.position.set(side * 0.25, 0.70, 0.68)
      this.group.add(white, pupil)
    }

    this.group.add(this._bodyTop, this._bodyBot)
    this.group.position.copy(this.position)
    this.scene.add(this.group)
  }

  // ── Update ────────────────────────────────────────────────────────────────

  update(delta, playerPos, powerTimer) {
    switch (this.state) {
      case STATE.SPAWN:  this._updateSpawn(delta);                         break
      case STATE.EATEN:  this._updateEaten(delta);                         break
      case STATE.SCARED: this._updateScared(delta, playerPos, powerTimer); break
      case STATE.CHASE:  this._updateChase(delta, playerPos);              break
    }
    this.group.position.copy(this.position)
  }

  _updateSpawn(delta) {
    this._spawnTimer -= delta * 1000
    if (this._spawnTimer <= 0) this.state = STATE.CHASE
  }

  _updateEaten(delta) {
    this._moveTo(this.homePos, delta, GHOST_SPEED_EATEN)
    if (this.position.distanceTo(this.homePos) < 0.4) {
      this.state       = STATE.SPAWN
      this._spawnTimer = GHOST_RESPAWN_MS
      this._applyMat(this._mats.normal)
    }
  }

  _updateScared(delta, playerPos, powerTimer) {
    const shouldFlash = powerTimer > 0 && powerTimer < POWER_FLASH_MS
    const flash       = shouldFlash && Math.sin(Date.now() / 150) > 0
    this._applyMat(flash ? this._mats.flash : this._mats.scared)

    const away   = this.position.clone().sub(playerPos).normalize().multiplyScalar(CELL * 8)
    const target = this.position.clone().add(away)
    this._moveTo(target, delta, GHOST_SPEED_SCARED)
  }

  _updateChase(delta, playerPos) {
    this._moveTo(this._getChaseTarget(playerPos), delta, GHOST_SPEED_NORMAL)
  }

  // ── IA de ciblage ─────────────────────────────────────────────────────────

  _getChaseTarget(playerPos) {
    switch (this.index) {
      case 0:
        return playerPos.clone()

      case 1: {
        const dir = this._facingDir(playerPos)
        return playerPos.clone().addScaledVector(dir, CELL * 4)
      }

      case 2: {
        const dir   = this._facingDir(playerPos)
        const ahead = playerPos.clone().addScaledVector(dir, CELL * 2)
        ahead.x += (Math.random() - 0.5) * CELL * 4
        ahead.z += (Math.random() - 0.5) * CELL * 4
        return ahead
      }

      case 3:
      default: {
        const tooClose = this.position.distanceTo(playerPos) < CELL * 8
        return tooClose ? gridToWorld(1, ROWS - 2) : playerPos.clone()
      }
    }
  }

  _facingDir(playerPos) {
    const dx = playerPos.x - this.position.x
    const dz = playerPos.z - this.position.z
    return Math.abs(dx) > Math.abs(dz)
      ? new THREE.Vector3(Math.sign(dx), 0, 0)
      : new THREE.Vector3(0, 0, Math.sign(dz))
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  _moveTo(target, delta, speed) {
    const step = speed * delta
    const next = this.position.clone().addScaledVector(this.dir, step)
    next.y     = this.position.y

    if (!this._hitsWall(next)) {
      this.position.copy(next)
      if (Math.random() < 0.04) this._pickBestDir(target, step)
    } else {
      this._pickBestDir(target, step)
    }
  }

  _pickBestDir(target, step) {
    let bestDist = Infinity
    let bestDir  = null

    for (const dir of DIRS) {
      if (dir.dot(this.dir) < -0.9) continue
      const next = this.position.clone().addScaledVector(dir, step)
      next.y     = this.position.y
      if (this._hitsWall(next)) continue
      const dist = next.distanceTo(target)
      if (dist < bestDist) { bestDist = dist; bestDir = dir }
    }

    if (bestDir) {
      this.dir.copy(bestDir)
      this.position.addScaledVector(bestDir, step)
      this.position.y = this.homePos.y
    }
  }

  _hitsWall(pos) {
    const r   = GHOST_RADIUS * 0.85
    const box = new THREE.Box3(
      new THREE.Vector3(pos.x - r, pos.y - r, pos.z - r),
      new THREE.Vector3(pos.x + r, pos.y + r, pos.z + r)
    )
    return this.wallBoxes.some(w => box.intersectsBox(w))
  }

  // ── API publique ──────────────────────────────────────────────────────────

  scare() {
    if (this.state === STATE.EATEN || this.state === STATE.SPAWN) return
    this.state = STATE.SCARED
    this._applyMat(this._mats.scared)
  }

  unscare() {
    if (this.state !== STATE.SCARED) return
    this.state = STATE.CHASE
    this._applyMat(this._mats.normal)
  }

  getEaten() {
    this.state = STATE.EATEN
    this._applyMat(this._mats.eaten)
  }

  resetForRespawn() {
    this.position.copy(this.homePos)
    this.state       = STATE.SPAWN
    this._spawnTimer = GHOST_RESPAWN_MS
    this._applyMat(this._mats.normal)
  }

  isScared() { return this.state === STATE.SCARED }
  isEaten()  { return this.state === STATE.EATEN  }
  isActive() { return this.state !== STATE.SPAWN && this.state !== STATE.EATEN }

  _applyMat(mat) {
    this._bodyTop.material = mat
    this._bodyBot.material = mat
  }

  dispose() {
    this.scene.remove(this.group)
  }
}
