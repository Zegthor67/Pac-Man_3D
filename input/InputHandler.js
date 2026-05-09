export class InputHandler {
  constructor() {
    this.up    = false
    this.down  = false
    this.left  = false
    this.right = false

    this._onDown = this._onKeyDown.bind(this)
    this._onUp   = this._onKeyUp.bind(this)

    window.addEventListener('keydown', this._onDown)
    window.addEventListener('keyup',   this._onUp)
  }

  _onKeyDown(e) {
    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': case 'KeyZ': this.up    = true; break
      case 'ArrowDown':  case 'KeyS':              this.down  = true; break
      case 'ArrowLeft':  case 'KeyA': case 'KeyQ': this.left  = true; break
      case 'ArrowRight': case 'KeyD':              this.right = true; break
    }
  }

  _onKeyUp(e) {
    switch (e.code) {
      case 'ArrowUp':    case 'KeyW': case 'KeyZ': this.up    = false; break
      case 'ArrowDown':  case 'KeyS':              this.down  = false; break
      case 'ArrowLeft':  case 'KeyA': case 'KeyQ': this.left  = false; break
      case 'ArrowRight': case 'KeyD':              this.right = false; break
    }
  }

  /** Réinitialise toutes les touches — appelé à chaque respawn pour éviter le drift */
  flush() {
    this.up = this.down = this.left = this.right = false
  }

  dispose() {
    window.removeEventListener('keydown', this._onDown)
    window.removeEventListener('keyup',   this._onUp)
  }
}
