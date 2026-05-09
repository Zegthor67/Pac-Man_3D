import * as THREE from 'three'

export class Engine {
  constructor() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)
    this.scene.fog = new THREE.Fog(0x000000, 40, 120)

    this._renderer = new THREE.WebGLRenderer({ antialias: true })
    this._renderer.setPixelRatio(window.devicePixelRatio)
    this._renderer.setSize(window.innerWidth, window.innerHeight)
    this._renderer.shadowMap.enabled = true
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap
    document.body.appendChild(this._renderer.domElement)

    this._camera = new THREE.PerspectiveCamera(
      55, window.innerWidth / window.innerHeight, 0.1, 500
    )

    this._addLights()
    window.addEventListener('resize', () => this._onResize())
  }

  _addLights() {
    this.scene.add(new THREE.AmbientLight(0x303050, 2.0))

    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(10, 30, 15)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far  = 120
    sun.shadow.camera.left = sun.shadow.camera.bottom = -50
    sun.shadow.camera.right = sun.shadow.camera.top   =  50
    this.scene.add(sun)

    const fill = new THREE.PointLight(0x0033ff, 3, 80)
    fill.position.set(0, 12, 0)
    this.scene.add(fill)
  }

  positionCamera(mapW, mapD) {
    const span = Math.max(mapW, mapD)
    const dist = span * 0.9
    this._camera.position.set(0, dist, dist * 0.55)
    this._camera.lookAt(0, 0, 0)
    this._camera.far = dist * 5
    this._camera.updateProjectionMatrix()
  }

  render() {
    this._renderer.render(this.scene, this._camera)
  }

  _onResize() {
    this._camera.aspect = window.innerWidth / window.innerHeight
    this._camera.updateProjectionMatrix()
    this._renderer.setSize(window.innerWidth, window.innerHeight)
  }
}
