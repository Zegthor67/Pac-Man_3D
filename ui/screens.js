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

export function hideGameOver() {
  $('gameover-screen').style.display = 'none'
}

export function showLevelUp(level) {
  _levelNum.textContent = level
  const el = $('level-screen')
  el.style.display = 'flex'
  setTimeout(() => { el.style.display = 'none' }, 2000)
}

let _cdInterval = null
let _cdTimeout  = null

export function cancelCountdown() {
  if (_cdInterval) { clearInterval(_cdInterval); _cdInterval = null }
  if (_cdTimeout)  { clearTimeout(_cdTimeout);   _cdTimeout  = null }
  $('countdown-screen').style.display = 'none'
}

export function showCountdown(onDone) {
  cancelCountdown()

  const overlay = $('countdown-screen')
  const num     = $('countdown-num')
  let count = 3

  const setNum = (text) => {
    num.style.animation = 'none'
    void num.offsetWidth          // force reflow pour relancer l'animation CSS
    num.style.animation = ''
    num.textContent = text
  }

  overlay.style.display = 'flex'
  setNum(count)

  _cdInterval = setInterval(() => {
    count--
    if (count > 0) {
      setNum(count)
    } else {
      setNum('GO !')
      clearInterval(_cdInterval)
      _cdInterval = null
      _cdTimeout = setTimeout(() => {
        _cdTimeout = null
        overlay.style.display = 'none'
        onDone()
      }, 700)
    }
  }, 1000)
}

export const buttons = {
  start:     $('btn-start'),
  resume:    $('btn-resume'),
  restart:   $('btn-restart'),
  restartGO: $('btn-restart-go'),
}
