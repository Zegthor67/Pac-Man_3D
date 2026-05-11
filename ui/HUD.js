const $ = id => document.getElementById(id)

const _hud   = $('hud')
const _score = $('hud-score')
const _level = $('hud-level')
const _lives = $('hud-lives')
const _cross = $('crosshair')

export const HUD = {
  show()  { _hud.style.display = 'flex'; _cross.style.display = 'block' },
  hide()  { _hud.style.display = 'none'; _cross.style.display = 'none'  },
  update(score, lives, level) {
    _score.textContent = String(score).padStart(6, '0')
    _level.textContent = `LVL ${level}`
    _lives.innerHTML   = '♥ '.repeat(Math.max(0, lives)).trim()
  },
}
