import * as THREE from 'three'
import {
  CELL,
  PELLET_EAT_RADIUS, POWER_EAT_RADIUS, GHOST_KILL_RADIUS,
  POWER_DURATION_MS,
  DEATH_DURATION, LEVEL_PAUSE_MS,
} from '../constants.js'
import { buildMap }     from './map/builder.js'
import { Pellets }      from './items/Pellets.js'
import { Player }       from './player/Player.js'
import { Ghost }        from './ghost/Ghost.js'
import { ScoreManager } from './ScoreManager.js'
import { HUD, showPause, hidePause, showGameOver, hideGameOver, showLevelUp, hideStart, showCountdown, cancelCountdown } from '../ui/screens.js'
import { Minimap } from '../ui/Minimap.js'

const STATE = {
  IDLE:      'idle',
  COUNTDOWN: 'countdown',
  PLAYING:   'playing',
  PAUSED:    'paused',
  DYING:     'dying',
  OVER:      'over',
}

export class Game {
  constructor(engine, input) {
    this._engine = engine
    this._scene  = engine.scene
    this._input  = input

    this._score   = new ScoreManager()
    this._pellets = new Pellets(this._scene)
    this._minimap = new Minimap()

    this._player      = null
    this._ghosts      = []
    this._wallBoxes   = []
    this._disposables = []
    this._neonMats    = null

    this._state      = STATE.IDLE
    this._level      = 1
    this._powerTimer = 0
    this._deathTimer = 0

    this._bindPauseKey()
  }

  // ── Démarrage ─────────────────────────────────────────────────────────────

  start() {
    hideStart()
    hideGameOver()
    cancelCountdown()
    this._score.reset()
    this._level = 1
    this._loadLevel()
  }

  _loadLevel() {
    this._unloadLevel()

    const { wallBoxes, pelletsPos, powerPos, spawnPos, ghostSpawns, neonMats, disposables } =
      buildMap(this._scene)

    this._wallBoxes   = wallBoxes
    this._disposables = disposables
    this._neonMats    = neonMats

    this._player = new Player(this._scene, spawnPos, this._input)

    this._ghosts = Array.from({ length: 4 }, (_, i) => {
      const pos = ghostSpawns[i % ghostSpawns.length]
               ?? spawnPos.clone().add(new THREE.Vector3(i * CELL * 0.5, 0, 0))
      return new Ghost(this._scene, i, pos, wallBoxes)
    })

    this._pellets.spawnAll(pelletsPos, powerPos)
    this._engine.setupFirstPerson()
    this._engine.updateFirstPerson(this._player.position, this._player.currentDir)

    this._powerTimer = 0
    this._score.resetCombo()
    this._state = STATE.COUNTDOWN

    HUD.update(this._score.score, this._score.lives, this._level)
    HUD.show()
    this._minimap.show()

    showCountdown(() => {
      if (this._state === STATE.COUNTDOWN) this._state = STATE.PLAYING
    })
  }

  _unloadLevel() {
    this._player?.dispose()
    this._ghosts.forEach(g => g.dispose())
    this._pellets.dispose()

    for (const obj of this._disposables) {
      this._scene.remove(obj)
      obj.geometry?.dispose()
    }

    this._player      = null
    this._ghosts      = []
    this._disposables = []
    this._neonMats    = null
    this._minimap.hide()
  }

  // ── Boucle ────────────────────────────────────────────────────────────────

  update(delta, time) {
    if (this._state === STATE.DYING)   { this._updateDeath(delta); return }
    if (this._state !== STATE.PLAYING)   return

    this._player.update(delta, this._wallBoxes)
    this._engine.updateFirstPerson(this._player.position, this._player.currentDir)
    this._minimap.draw(this._player.position, this._player.currentDir, this._ghosts, this._pellets.active)
    this._ghosts.forEach(g => g.update(delta, this._player.position, this._powerTimer))
    this._tickPowerTimer(delta)
    this._checkPelletCollisions()
    this._checkGhostCollisions()
    this._pellets.update(time)
    this._pulseNeon(time)
    this._checkLevelComplete()
  }

  // ── Sous-systèmes ─────────────────────────────────────────────────────────

  _tickPowerTimer(delta) {
    if (this._powerTimer <= 0) return
    this._powerTimer -= delta * 1000
    if (this._powerTimer <= 0) {
      this._powerTimer = 0
      this._score.resetCombo()
      this._ghosts.forEach(g => g.unscare())
    }
  }

  _checkPelletCollisions() {
    for (const item of this._pellets.active) {
      const dist = this._player.position.distanceTo(item.mesh.position)
      if (dist >= (item.type === 'power' ? POWER_EAT_RADIUS : PELLET_EAT_RADIUS)) continue

      this._pellets.eat(item)
      if (item.type === 'normal') this._score.addPellet()
      else { this._score.addPower(); this._activatePower() }

      HUD.update(this._score.score, this._score.lives, this._level)
    }
  }

  _checkGhostCollisions() {
    for (const ghost of this._ghosts) {
      if (ghost.isEaten()) continue
      if (this._player.position.distanceTo(ghost.position) > GHOST_KILL_RADIUS) continue

      if (ghost.isScared()) {
        ghost.getEaten()
        this._score.addGhost()
        HUD.update(this._score.score, this._score.lives, this._level)
      } else {
        this._startDeath()
        return
      }
    }
  }

  _checkLevelComplete() {
    if (this._pellets.remaining > 0) return
    this._state = STATE.IDLE
    this._level++
    showLevelUp(this._level)
    setTimeout(() => this._loadLevel(), LEVEL_PAUSE_MS)
  }

  _pulseNeon(time) {
    if (!this._neonMats) return
    const { matStrip, matGrid } = this._neonMats
    const pulse = 0.75 + 0.25 * Math.sin(time * 2.8) * (0.8 + 0.2 * Math.sin(time * 9.1))
    matStrip.emissiveIntensity = 1.8 * pulse
    matGrid.opacity            = 0.55 * pulse
  }

  _activatePower() {
    this._powerTimer = POWER_DURATION_MS
    this._score.resetCombo()
    this._ghosts.forEach(g => g.scare())
  }

  // ── Mort ──────────────────────────────────────────────────────────────────

  _startDeath() {
    this._score.loseLife()
    this._state      = STATE.DYING
    this._deathTimer = DEATH_DURATION
    this._input.flush()
  }

  _updateDeath(delta) {
    this._deathTimer -= delta
    const t = 1 - Math.max(0, this._deathTimer / DEATH_DURATION)
    this._player.group.scale.setScalar(Math.max(0, 1 - t * 0.9))
    this._player.group.rotation.y += delta * 6

    if (this._deathTimer > 0) return

    if (this._score.isDead) {
      this._state = STATE.OVER
      this._minimap.hide()
      showGameOver(this._score.score)
    } else {
      this._player.respawn()
      this._ghosts.forEach(g => g.resetForRespawn())
      this._powerTimer = 0
      HUD.update(this._score.score, this._score.lives, this._level)
      this._state = STATE.COUNTDOWN
      showCountdown(() => {
        if (this._state === STATE.COUNTDOWN) this._state = STATE.PLAYING
      })
    }
  }

  // ── Pause ─────────────────────────────────────────────────────────────────

  _bindPauseKey() {
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Escape' && e.code !== 'Space') return
      e.preventDefault()
      if      (this._state === STATE.PLAYING) { this._state = STATE.PAUSED;  showPause() }
      else if (this._state === STATE.PAUSED)  { this._state = STATE.PLAYING; hidePause() }
    })
  }

  resume() {
    if (this._state !== STATE.PAUSED) return
    this._state = STATE.PLAYING
    hidePause()
  }

  restart() {
    this._unloadLevel()
    this.start()
  }
}
