import * as THREE from 'three'

const MAT_PELLET = new THREE.MeshStandardMaterial({
  color: 0xffeeaa, emissive: 0xffcc44, emissiveIntensity: 0.8, roughness: 0.3,
})
const MAT_POWER = new THREE.MeshStandardMaterial({
  color: 0xffffff, emissive: 0xffff44, emissiveIntensity: 1.5, roughness: 0.2,
})

export class Pellets {
  constructor(scene) {
    this._scene  = scene
    this._items  = []
    this._active = new Set()
  }

  spawnAll(pelletsPos, powerPos) {
    this._items  = []
    this._active = new Set()

    for (const pos of pelletsPos) {
      this._spawn(pos, 'normal', new THREE.SphereGeometry(0.12, 8, 8), MAT_PELLET)
    }
    for (const pos of powerPos) {
      this._spawn(pos, 'power', new THREE.SphereGeometry(0.28, 10, 10), MAT_POWER)
    }
  }

  _spawn(pos, type, geometry, material) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(pos)
    mesh.position.y = 0.5
    this._scene.add(mesh)
    const item = { type, mesh }
    this._items.push(item)
    this._active.add(item)
  }

  eat(item) {
    this._active.delete(item)
    this._scene.remove(item.mesh)
    item.mesh.geometry.dispose()
  }

  update(time) {
    for (const item of this._active) {
      if (item.type !== 'power') continue
      item.mesh.position.y = 0.5 + Math.sin(time * 3) * 0.1
      item.mesh.rotation.y = time * 2
    }
  }

  dispose() {
    for (const item of this._items) {
      this._scene.remove(item.mesh)
      item.mesh.geometry.dispose()
    }
    this._items  = []
    this._active = new Set()
  }

  get active()    { return [...this._active] }
  get remaining() { return this._active.size }
}
