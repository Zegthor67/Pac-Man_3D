import * as THREE from 'three'
import { COLS, CELL, PLAYER_SPEED, PLAYER_RADIUS, PLAYER_Y } from '../../constants.js'

const JAW_MAX   = 0.38
const JAW_SPEED = 4.2

export class Player {
  constructor(scene, startPos, input) {
    this._scene   = scene
    this._input   = input
    this.startPos = startPos.clone()

    this.position   = startPos.clone()
    this.wantedDir  = new THREE.Vector3(1, 0, 0)
    this.currentDir = new THREE.Vector3(1, 0, 0)
    this.moving     = false

    this._jawAngle = 0
    this._jawDir   = 1

    this._buildMesh()
  }

  _buildMesh() {
    this.group = new THREE.Group()

    const mat = new THREE.MeshStandardMaterial({
      color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 0.5,
      roughness: 0.4, metalness: 0.05,
    })

    this.jawTop = new THREE.Mesh(
      new THREE.SphereGeometry(PLAYER_Y, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat
    )
    this.jawBottom = new THREE.Mesh(
      new THREE.SphereGeometry(PLAYER_Y, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat
    )

    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x000000 })
    )
    eye.position.set(0.3, 0.42, -0.38)
    this.jawTop.add(eye)

    this.group.add(this.jawTop, this.jawBottom)
    this.group.position.copy(this.position)
    this.group.rotation.y = -Math.PI / 2
    this._scene.add(this.group)
  }

  update(delta, wallBoxes) {
    this._readInput()
    this._move(delta, wallBoxes)
    this._wrapTunnel()
    this._animateJaw(delta)
    this.group.position.copy(this.position)
  }

  _readInput() {
    if (this._input.up)    this.wantedDir.set( 0, 0, -1)
    if (this._input.down)  this.wantedDir.set( 0, 0,  1)
    if (this._input.left)  this.wantedDir.set(-1, 0,  0)
    if (this._input.right) this.wantedDir.set( 1, 0,  0)
  }

  _move(delta, wallBoxes) {
    const step = PLAYER_SPEED * delta
    for (const dir of [this.wantedDir, this.currentDir]) {
      const next = this.position.clone().addScaledVector(dir, step)
      next.y = this.position.y
      if (!this._hitsWall(next, wallBoxes)) {
        this.position.copy(next)
        this.currentDir.copy(dir)
        this.moving = true
        if (dir.x !== 0 || dir.z !== 0) this.group.rotation.y = Math.atan2(-dir.z, dir.x)
        return
      }
    }
    this.moving = false
  }

  _hitsWall(pos, wallBoxes) {
    const r   = PLAYER_RADIUS
    const box = new THREE.Box3(
      new THREE.Vector3(pos.x - r, pos.y - r, pos.z - r),
      new THREE.Vector3(pos.x + r, pos.y + r, pos.z + r)
    )
    return wallBoxes.some(w => box.intersectsBox(w))
  }

  _wrapTunnel() {
    const halfW = (COLS / 2) * CELL
    if (this.position.x >  halfW) this.position.x = -halfW + 0.5
    if (this.position.x < -halfW) this.position.x =  halfW - 0.5
  }

  _animateJaw(delta) {
    if (!this.moving) return
    this._jawAngle += this._jawDir * delta * JAW_SPEED
    if (this._jawAngle >= JAW_MAX) { this._jawAngle = JAW_MAX; this._jawDir = -1 }
    else if (this._jawAngle <= 0)  { this._jawAngle = 0;       this._jawDir =  1 }
    this.jawTop.rotation.z    =  this._jawAngle
    this.jawBottom.rotation.z = -this._jawAngle
  }

  respawn() {
    this.position.copy(this.startPos)
    this.wantedDir.set(1, 0, 0)
    this.currentDir.set(1, 0, 0)
    this._jawAngle = 0
    this.moving    = false
    this.group.scale.setScalar(1)
    this.group.rotation.y = -Math.PI / 2
    this.group.position.copy(this.position)
  }

  dispose() {
    this._scene.remove(this.group)
  }
}
