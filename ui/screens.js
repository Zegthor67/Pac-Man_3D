const $ = id => document.getElementById(id)

const _hud        = $('hud')
const _score      = $('hud-score')
const _level      = $('hud-level')
const _lives      = $('hud-lives')
const _finalScore = $('final-score')
const _levelNum   = $('level-num')
const _crosshair  = $('crosshair')

export const HUD = {
  show()  { _hud.style.display = 'flex'; _crosshair.style.display = 'block' },
  hide()  { _hud.style.display = 'none'; _crosshair.style.display = 'none'  },
  update(score, lives, level) {
    _score.textContent = String(score).padStart(6, '0')
    _level.textContent = `LVL ${level}`
    _lives.innerHTML   = '♥ '.repeat(Math.max(0, lives)).trim()
  },
}

export function showStart() {
  $('start-screen').style.display = 'flex'
}

export function hideStart() {
  $('start-screen').style.display = 'none'
}

export function showPause() {
  $('pause-screen').style.display = 'flex'
}

export function hidePause() {
  $('pause-screen').style.display = 'none'
}

export function showGameOver(score) {
  _finalScore.textContent = String(score).padStart(6, '0')
  $('gameover-screen').style.display = 'flex'
}

export function showLevelUp(level) {
  _levelNum.textContent = level
  const el = $('level-screen')
  el.style.display = 'flex'
  setTimeout(() => { el.style.display = 'none' }, 2000)
}

export const buttons = {
  start:     $('btn-start'),
  resume:    $('btn-resume'),
  restart:   $('btn-restart'),
  restartGO: $('btn-restart-go'),
}
