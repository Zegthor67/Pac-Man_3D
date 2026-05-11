import * as THREE from 'three'
import { COLS, CELL, PLAYER_SPEED, PLAYER_RADIUS, PLAYER_Y } from '../config/constants.js'

const MAX_JAW_ANGLE      = 0.38
const JAW_ANIMATION_SPEED = 4.2

export class Player {
  constructor(scene, startPos, input) {
    this._scene   = scene
    this._input   = input
    this.startPos = startPos.clone()

    this.position   = startPos.clone()
    this.wantedDir  = new THREE.Vector3(1, 0, 0)
    this.currentDir = new THREE.Vector3(1, 0, 0)
    this.moving     = false

    this._jawAngle        = 0
    this._jawDirection    = 1
    this._leftWasPressed  = false
    this._rightWasPressed = false
    this._downWasPressed  = false

    this._createMesh()
  }

  // ── Boucle ────────────────────────────────────────────────────────────────

  update(delta, wallBoxes) {
    this._readInput()
    this._move(delta, wallBoxes)
    this._wrapAroundTunnel()
    this._animateChewing(delta)
    this.group.position.copy(this.position)
  }

  // ── Input ─────────────────────────────────────────────────────────────────

  _readInput() {
    // Only react to a key on the frame it is first pressed (rising edge).
    // Without this, holding Turn Left would re-compute the turn every frame,
    // causing the player to spiral instead of turning once.
    const justPressedLeft  = this._input.left  && !this._leftWasPressed
    const justPressedRight = this._input.right && !this._rightWasPressed
    const justPressedDown  = this._input.down  && !this._downWasPressed

    if      (justPressedLeft)      this.wantedDir.set( this.currentDir.z, 0, -this.currentDir.x)
    else if (justPressedRight)     this.wantedDir.set(-this.currentDir.z, 0,  this.currentDir.x)
    else if (this._input.up)       this.wantedDir.copy(this.currentDir)
    else if (justPressedDown)      this.wantedDir.copy(this.currentDir).negate()

    this._leftWasPressed  = this._input.left
    this._rightWasPressed = this._input.right
    this._downWasPressed  = this._input.down
  }

  // ── Mouvement ─────────────────────────────────────────────────────────────

  _move(delta, wallBoxes) {
    const step = PLAYER_SPEED * delta
    for (const direction of [this.wantedDir, this.currentDir]) {
      const nextPosition = this.position.clone().addScaledVector(direction, step)
      nextPosition.y = this.position.y
      if (!this._hitsWall(nextPosition, wallBoxes)) {
        this.position.copy(nextPosition)
        this.currentDir.copy(direction)
        this.moving = true
        if (direction.x !== 0 || direction.z !== 0) {
          this.group.rotation.y = Math.atan2(-direction.z, direction.x)
        }
        return
      }
    }
    this.moving = false
  }

  _hitsWall(position, wallBoxes) {
    const radius = PLAYER_RADIUS
    const box = new THREE.Box3(
      new THREE.Vector3(position.x - radius, position.y - radius, position.z - radius),
      new THREE.Vector3(position.x + radius, position.y + radius, position.z + radius)
    )
    return wallBoxes.some(wall => box.intersectsBox(wall))
  }

  _wrapAroundTunnel() {
    const halfWidth = (COLS / 2) * CELL
    if (this.position.x >  halfWidth) this.position.x = -halfWidth + 0.5
    if (this.position.x < -halfWidth) this.position.x =  halfWidth - 0.5
  }

  // ── Animation ─────────────────────────────────────────────────────────────

  _animateChewing(delta) {
    if (!this.moving) return
    this._jawAngle += this._jawDirection * delta * JAW_ANIMATION_SPEED
    if (this._jawAngle >= MAX_JAW_ANGLE) { this._jawAngle = MAX_JAW_ANGLE; this._jawDirection = -1 }
    else if (this._jawAngle <= 0)        { this._jawAngle = 0;             this._jawDirection =  1 }
    this.jawTop.rotation.z    =  this._jawAngle
    this.jawBottom.rotation.z = -this._jawAngle
  }

  // ── API publique ──────────────────────────────────────────────────────────

  respawn() {
    this.position.copy(this.startPos)
    this.wantedDir.set(1, 0, 0)
    this.currentDir.set(1, 0, 0)
    this._jawAngle        = 0
    this.moving           = false
    this._leftWasPressed  = false
    this._rightWasPressed = false
    this._downWasPressed  = false
    this.group.scale.setScalar(1)
    this.group.rotation.y = -Math.PI / 2
    this.group.position.copy(this.position)
  }

  dispose() { this._scene.remove(this.group) }

  // ── Mesh ──────────────────────────────────────────────────────────────────

  _createMesh() {
    this.group = new THREE.Group()

    const yellowMaterial = new THREE.MeshStandardMaterial({
      color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 0.5,
      roughness: 0.4, metalness: 0.05,
    })

    this.jawTop = new THREE.Mesh(
      new THREE.SphereGeometry(PLAYER_Y, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), yellowMaterial
    )
    this.jawBottom = new THREE.Mesh(
      new THREE.SphereGeometry(PLAYER_Y, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), yellowMaterial
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
    this.group.visible = false  // FPS view: the player model is not visible to itself
    this._scene.add(this.group)
  }
}
