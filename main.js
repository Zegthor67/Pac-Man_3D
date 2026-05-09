import * as THREE          from 'three'
import { Engine }          from './core/Engine.js'
import { InputHandler }    from './input/InputHandler.js'
import { Game }            from './game/Game.js'
import { buttons, showStart } from './ui/screens.js'
import { MAX_DELTA }       from './constants.js'

const engine = new Engine()
const input  = new InputHandler()
const game   = new Game(engine, input)

// ── UI ────────────────────────────────────────────────────────────────────────

showStart()

buttons.start.addEventListener('click',     () => game.start())
buttons.resume.addEventListener('click',    () => game.resume())
buttons.restart.addEventListener('click',   () => { game.resume(); game.restart() })
buttons.restartGO.addEventListener('click', () => game.restart())

// ── Boucle de rendu ───────────────────────────────────────────────────────────

const clock = new THREE.Clock()

function loop() {
  requestAnimationFrame(loop)
  game.update(Math.min(clock.getDelta(), MAX_DELTA), clock.elapsedTime)
  engine.render()
}

loop()
