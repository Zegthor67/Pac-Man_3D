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
      80, window.innerWidth / window.innerHeight, 0.1, 200
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

  setupFirstPerson() {
    this._camera.fov  = 80
    this._camera.near = 0.1
    this._camera.far  = 200
    this.scene.fog    = new THREE.Fog(0x000000, 5, 22)
    this._camera.updateProjectionMatrix()
  }

  updateFirstPerson(playerPos, playerDir) {
    const eyeY = playerPos.y + 0.2
    this._camera.position.set(playerPos.x, eyeY, playerPos.z)
    this._camera.lookAt(
      playerPos.x + playerDir.x * 2,
      eyeY,
      playerPos.z + playerDir.z * 2
    )
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
