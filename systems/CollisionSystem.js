import { PELLET_EAT_RADIUS, POWER_EAT_RADIUS, GHOST_KILL_RADIUS } from '../config/constants.js'

export class CollisionSystem {
  constructor(player, ghosts, pellets, score) {
    this._player  = player
    this._ghosts  = ghosts
    this._pellets = pellets
    this._score   = score
  }

  checkPellets(onPowerEaten) {
    for (const item of this._pellets.active) {
      const radius = item.type === 'power' ? POWER_EAT_RADIUS : PELLET_EAT_RADIUS
      if (this._player.position.distanceTo(item.mesh.position) >= radius) continue

      this._pellets.eat(item)
      if (item.type === 'normal') {
        this._score.addPellet()
      } else {
        this._score.addPower()
        onPowerEaten()
      }
    }
  }

  checkGhosts(onPlayerDeath) {
    for (const ghost of this._ghosts) {
      if (ghost.isEaten()) continue
      if (this._player.position.distanceTo(ghost.position) > GHOST_KILL_RADIUS) continue

      if (ghost.isScared()) {
        ghost.getEaten()
        this._score.addGhost()
      } else {
        onPlayerDeath()
        return
      }
    }
  }
}
