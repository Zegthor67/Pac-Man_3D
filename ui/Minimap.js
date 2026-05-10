import { PACMAN_MAP, COLS, ROWS } from '../game/map/layout.js'
import { CELL } from '../constants.js'

const SCALE = 8
const GHOST_COLORS = ['#ff4444', '#ff88ff', '#00ccff', '#ff8800']

export class Minimap {
  constructor() {
    this._canvas     = document.getElementById('minimap')
    this._ctx        = this._canvas.getContext('2d')
    this._canvas.width  = COLS * SCALE
    this._canvas.height = ROWS * SCALE
    this._wallCanvas = this._buildWallCache()
  }

  show() { this._canvas.style.display = 'block' }
  hide() { this._canvas.style.display = 'none'  }

  draw(playerPos, playerDir, ghosts, activePellets) {
    const ctx = this._ctx
    const W   = this._canvas.width
    const H   = this._canvas.height
    const cx  = W / 2
    const cy  = H / 2
    const R   = Math.min(cx, cy) - 1

    ctx.clearRect(0, 0, W, H)

    // ── Clip circulaire ─────────────────────────────────────────────────────
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.clip()

    ctx.fillStyle = 'rgba(0, 0, 8, 0.92)'
    ctx.fillRect(0, 0, W, H)

    // ── Rotation : direction du joueur toujours vers le haut ─────────────
    const pp       = this._toMapPx(playerPos.x, playerPos.z)
    const rotAngle = -Math.atan2(playerDir.x, -playerDir.z)

    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(rotAngle)
    ctx.translate(-pp.x, -pp.y)

    ctx.drawImage(this._wallCanvas, 0, 0)

    if (activePellets) {
      for (const item of activePellets) {
        const p = this._toMapPx(item.mesh.position.x, item.mesh.position.z)
        if (item.type === 'power') {
          ctx.fillStyle = 'rgba(255,255,255,0.85)'
          ctx.beginPath()
          ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.4)'
          ctx.fillRect(p.x - 1, p.y - 1, 2, 2)
        }
      }
    }

    if (ghosts) {
      for (const ghost of ghosts) {
        if (ghost.isEaten()) continue
        const p = this._toMapPx(ghost.position.x, ghost.position.z)
        ctx.fillStyle    = ghost.isScared() ? '#4444ff' : GHOST_COLORS[ghost.index]
        ctx.shadowColor  = ctx.fillStyle
        ctx.shadowBlur   = 4
        ctx.beginPath()
        ctx.arc(p.x, p.y, SCALE * 0.38, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }
    }

    ctx.restore() // ── fin transform monde ───────────────────────────────

    // ── Joueur centré (triangle pointe vers le haut = sens de marche) ───
    ctx.fillStyle   = '#ffdd00'
    ctx.shadowColor = '#ffaa00'
    ctx.shadowBlur  = 8
    ctx.beginPath()
    ctx.moveTo(cx,              cy - SCALE * 1.1)
    ctx.lineTo(cx - SCALE * 0.5, cy + SCALE * 0.4)
    ctx.lineTo(cx + SCALE * 0.5, cy + SCALE * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.shadowBlur = 0

    // ── Repère Nord (point bleu sur le bord du cercle) ──────────────────
    const nx = cx + Math.sin(rotAngle) * (R - 5)
    const ny = cy - Math.cos(rotAngle) * (R - 5)
    ctx.fillStyle   = '#88aaff'
    ctx.shadowColor = '#4477ff'
    ctx.shadowBlur  = 4
    ctx.beginPath()
    ctx.arc(nx, ny, 3, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    ctx.restore() // ── fin clip circulaire ───────────────────────────────
  }

  _buildWallCache() {
    const c   = document.createElement('canvas')
    c.width   = COLS * SCALE
    c.height  = ROWS * SCALE
    const ctx = c.getContext('2d')

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        if (PACMAN_MAP[row][col] !== 1) continue
        // Corps du mur
        ctx.fillStyle = '#0e2488'
        ctx.fillRect(col * SCALE, row * SCALE, SCALE, SCALE)
        // Reflet néon sur les bords
        ctx.fillStyle = '#2255dd'
        ctx.fillRect(col * SCALE,              row * SCALE,              SCALE, 1)
        ctx.fillRect(col * SCALE,              row * SCALE,              1,     SCALE)
        ctx.fillStyle = '#0a1855'
        ctx.fillRect(col * SCALE,              row * SCALE + SCALE - 1,  SCALE, 1)
        ctx.fillRect(col * SCALE + SCALE - 1,  row * SCALE,              1,     SCALE)
      }
    }
    return c
  }

  // Coordonnées monde → pixels minimap
  _toMapPx(wx, wz) {
    return {
      x: (wx / CELL + COLS / 2) * SCALE,
      y: (wz / CELL + ROWS / 2) * SCALE,
    }
  }
}
