import { POWER_DURATION_MS } from '../config/constants.js'

export class PowerSystem {
  constructor(ghosts, score) {
    this._ghosts = ghosts
    this._score  = score
    this._timer  = 0
  }

  get isActive() { return this._timer > 0 }
  get timer()    { return this._timer }

  activate() {
    this._timer = POWER_DURATION_MS
    this._score.resetCombo()
    this._ghosts.forEach(ghost => ghost.scare())
  }

  update(delta) {
    if (this._timer <= 0) return
    this._timer -= delta * 1000
    if (this._timer <= 0) {
      this._timer = 0
      this._score.resetCombo()
      this._ghosts.forEach(ghost => ghost.unscare())
    }
  }

  reset() { this._timer = 0 }
}
