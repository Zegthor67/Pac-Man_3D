import * as THREE from 'three'
import {
  CELL, ROWS,
  GHOST_RADIUS,
  GHOST_SPEED_NORMAL, GHOST_SPEED_SCARED, GHOST_SPEED_EATEN,
  GHOST_SPAWN_STAGGER, GHOST_RESPAWN_MS,
  POWER_FLASH_MS,
} from '../config/constants.js'
import { gridToWorld } from '../world/MapBuilder.js'

const GHOST_CONFIGS = [
  { name: 'Blinky', color: 0xff0000, emissive: 0xaa0000 },
  { name: 'Pinky',  color: 0xff88ff, emissive: 0xcc44cc },
  { name: 'Inky',   color: 0x00ccff, emissive: 0x0088aa },
  { name: 'Clyde',  color: 0xff8800, emissive: 0xcc5500 },
]

const STATE = { SPAWN: 'spawn', CHASE: 'chase', SCARED: 'scared', EATEN: 'eaten' }

const DIRECTIONS = [
  new THREE.Vector3( 1, 0,  0),
  new THREE.Vector3(-1, 0,  0),
  new THREE.Vector3( 0, 0,  1),
  new THREE.Vector3( 0, 0, -1),
]

export class Ghost {
  constructor(scene, index, spawnPos, wallBoxes) {
    this.scene     = scene
    this.index     = index
    this.name      = GHOST_CONFIGS[index].name
    this.wallBoxes = wallBoxes

    this.position = spawnPos.clone()
    this.homePos  = spawnPos.clone()

    this.state            = STATE.SPAWN
    this.direction        = new THREE.Vector3(1, 0, 0)
    this._spawnCountdown  = index * GHOST_SPAWN_STAGGER

    this._buildMesh(index)
  }

  // ── Boucle ────────────────────────────────────────────────────────────────

  update(delta, playerPos, powerTimer) {
    switch (this.state) {
      case STATE.SPAWN:  this._waitToSpawn(delta);                         break
      case STATE.EATEN:  this._returnHome(delta);                          break
      case STATE.SCARED: this._fleePlayer(delta, playerPos, powerTimer);   break
      case STATE.CHASE:  this._chasePlayer(delta, playerPos);              break
    }
    this.group.position.copy(this.position)
  }

  // ── États ─────────────────────────────────────────────────────────────────

  _waitToSpawn(delta) {
    this._spawnCountdown -= delta * 1000
    if (this._spawnCountdown <= 0) this.state = STATE.CHASE
  }

  _returnHome(delta) {
    this._moveToward(this.homePos, delta, GHOST_SPEED_EATEN)
    if (this.position.distanceTo(this.homePos) < 0.4) {
      this.state           = STATE.SPAWN
      this._spawnCountdown = GHOST_RESPAWN_MS
      this._setMaterial(this._materials.normal)
    }
  }

  _fleePlayer(delta, playerPos, powerTimer) {
    const aboutToExpire = powerTimer > 0 && powerTimer < POWER_FLASH_MS
    const shouldFlash   = aboutToExpire && Math.sin(Date.now() / 150) > 0
    this._setMaterial(shouldFlash ? this._materials.flash : this._materials.scared)

    const awayFromPlayer = this.position.clone().sub(playerPos).normalize().multiplyScalar(CELL * 8)
    const fleeTarget     = this.position.clone().add(awayFromPlayer)
    this._moveToward(fleeTarget, delta, GHOST_SPEED_SCARED)
  }

  _chasePlayer(delta, playerPos) {
    this._moveToward(this._computeChaseTarget(playerPos), delta, GHOST_SPEED_NORMAL)
  }

  // ── Stratégies de ciblage (une par fantôme) ───────────────────────────────

  _computeChaseTarget(playerPos) {
    switch (this.index) {
      case 0: // Blinky — fonce droit sur le joueur
        return playerPos.clone()

      case 1: { // Pinky — vise 4 cases devant le joueur
        const playerFacing = this._guessPlayerFacingDir(playerPos)
        return playerPos.clone().addScaledVector(playerFacing, CELL * 4)
      }

      case 2: { // Inky — vise devant le joueur avec une déviation aléatoire
        const playerFacing = this._guessPlayerFacingDir(playerPos)
        const target       = playerPos.clone().addScaledVector(playerFacing, CELL * 2)
        target.x += (Math.random() - 0.5) * CELL * 4
        target.z += (Math.random() - 0.5) * CELL * 4
        return target
      }

      default: { // Clyde — fuit dans son coin quand il est trop proche
        const tooClose = this.position.distanceTo(playerPos) < CELL * 8
        return tooClose ? gridToWorld(1, ROWS - 2) : playerPos.clone()
      }
    }
  }

  _guessPlayerFacingDir(playerPos) {
    const dx = playerPos.x - this.position.x
    const dz = playerPos.z - this.position.z
    return Math.abs(dx) > Math.abs(dz)
      ? new THREE.Vector3(Math.sign(dx), 0, 0)
      : new THREE.Vector3(0, 0, Math.sign(dz))
  }

  // ── Navigation ────────────────────────────────────────────────────────────

  _moveToward(target, delta, speed) {
    const step     = speed * delta
    const nextPos  = this.position.clone().addScaledVector(this.direction, step)
    nextPos.y      = this.position.y

    if (!this._hitsWall(nextPos)) {
      this.position.copy(nextPos)
      if (Math.random() < 0.04) this._steerToward(target, step)
    } else {
      this._steerToward(target, step)
    }
  }

  _steerToward(target, step) {
    let bestDistance  = Infinity
    let bestDirection = null

    for (const direction of DIRECTIONS) {
      if (direction.dot(this.direction) < -0.9) continue  // interdit de faire demi-tour

      const nextPos = this.position.clone().addScaledVector(direction, step)
      nextPos.y     = this.position.y
      if (this._hitsWall(nextPos)) continue

      const distanceToTarget = nextPos.distanceTo(target)
      if (distanceToTarget < bestDistance) {
        bestDistance  = distanceToTarget
        bestDirection = direction
      }
    }

    if (bestDirection) {
      this.direction.copy(bestDirection)
      this.position.addScaledVector(bestDirection, step)
      this.position.y = this.homePos.y
    }
  }

  _hitsWall(position) {
    const radius = GHOST_RADIUS * 0.85
    const box    = new THREE.Box3(
      new THREE.Vector3(position.x - radius, position.y - radius, position.z - radius),
      new THREE.Vector3(position.x + radius, position.y + radius, position.z + radius)
    )
    return this.wallBoxes.some(wall => box.intersectsBox(wall))
  }

  // ── API publique ──────────────────────────────────────────────────────────

  scare() {
    if (this.state === STATE.EATEN || this.state === STATE.SPAWN) return
    this.state = STATE.SCARED
    this._setMaterial(this._materials.scared)
  }

  unscare() {
    if (this.state !== STATE.SCARED) return
    this.state = STATE.CHASE
    this._setMaterial(this._materials.normal)
  }

  getEaten() {
    this.state = STATE.EATEN
    this._setMaterial(this._materials.eaten)
  }

  resetForRespawn() {
    this.position.copy(this.homePos)
    this.state           = STATE.SPAWN
    this._spawnCountdown = GHOST_RESPAWN_MS
    this._setMaterial(this._materials.normal)
  }

  isScared() { return this.state === STATE.SCARED }
  isEaten()  { return this.state === STATE.EATEN  }

  dispose() { this.scene.remove(this.group) }

  // ── Mesh ──────────────────────────────────────────────────────────────────

  _buildMesh(index) {
    const config   = GHOST_CONFIGS[index]
    this.group     = new THREE.Group()

    this._materials = {
      normal: new THREE.MeshStandardMaterial({
        color: config.color, emissive: config.emissive, emissiveIntensity: 0.5, roughness: 0.6,
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
      this._materials.normal
    )
    this._bodyTop.position.y = 0.35

    this._bodyBottom = new THREE.Mesh(
      new THREE.CylinderGeometry(0.7, 0.7, 0.7, 16),
      this._materials.normal
    )
    this._bodyBottom.position.y = 0

    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI - Math.PI / 6
      const foot  = new THREE.Mesh(
        new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        this._materials.normal
      )
      foot.rotation.x = Math.PI
      foot.position.set(Math.cos(angle) * 0.5, 0, Math.sin(angle) * 0.5)
      this.group.add(foot)
    }

    const whiteEyeMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff })
    const blueEyeMaterial  = new THREE.MeshStandardMaterial({
      color: 0x0044ff, emissive: 0x0022bb, emissiveIntensity: 0.8,
    })
    for (const side of [-1, 1]) {
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), whiteEyeMaterial)
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.10, 8, 8), blueEyeMaterial)
      white.position.set(side * 0.25, 0.72, 0.55)
      pupil.position.set(side * 0.25, 0.70, 0.68)
      this.group.add(white, pupil)
    }

    this.group.add(this._bodyTop, this._bodyBottom)
    this.group.position.copy(this.position)
    this.scene.add(this.group)
  }

  _setMaterial(material) {
    this._bodyTop.material    = material
    this._bodyBottom.material = material
  }
}
