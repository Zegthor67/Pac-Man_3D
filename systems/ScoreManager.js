const PELLET_PTS  = 10
const POWER_PTS   = 50
const GHOST_PTS   = [200, 400, 800, 1600]
const START_LIVES = 3
const MAX_LIVES   = 6

export class ScoreManager {
  constructor() {
    this._score    = 0
    this._lives    = START_LIVES
    this._comboIdx = 0
  }

  reset() {
    this._score    = 0
    this._lives    = START_LIVES
    this._comboIdx = 0
  }

  resetCombo() { this._comboIdx = 0 }

  addPellet() { this._score += PELLET_PTS }
  addPower()  { this._score += POWER_PTS  }

  addGhost() {
    this._score += GHOST_PTS[Math.min(this._comboIdx, GHOST_PTS.length - 1)]
    this._comboIdx++
  }

  loseLife() { this._lives-- }
  gainLife() { if (this._lives < MAX_LIVES) this._lives++ }

  get score()  { return this._score }
  get lives()  { return this._lives }
  get isDead() { return this._lives <= 0 }
}
