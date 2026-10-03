import * as THREE from 'three'

// A procedural leather backpack, built in code from the sculpt spec that was written while studying one
// reference photo ("brown leather backpack on white surface" by Wiser by the Mile, Unsplash License).
// No pixel of that photo is used here: the shapes are extrusions, tubes and spheres, and the leather is
// drawn with seeded noise. It is a stylized likeness, not a measured copy. The maker's embossed logo on
// the real bag is deliberately left out; a plain recessed plate marks its place.
//
// Units: the body is 1 wide. +Y is up, +Z is the front, the wearer's left is +X.

export type BackpackDetail =
  | 'blockout' // the big masses only, one flat color: for checking the outline
  | 'structure' // every part, flat colors
  | 'full' // every part with the procedural leather
  | 'phone' // like "full", with fewer triangles and smaller textures

export interface Backpack {
  group: THREE.Group
  triangles: number
  dispose: () => void
}

// Proportions read from the reference: width : height = 0.8, the top closes in a semicircle
const W = 1
const H = 1.25
const D = 0.38
const R = W / 2
const Y0 = -H / 2
const ARCH_Y = H / 2 - R // where the straight sides end and the arch begins
const FRONT = D / 2

const COLORS = {
  leather: '#8f4d42',
  leatherDark: '#6b372b',
  leatherLight: '#ad6a5a',
  patina: '#5e2f24',
  zipper: '#2b2724',
  metal: '#b9b4ac',
  thread: '#d9b27c',
}

// A small seeded random generator, so the leather looks the same on every visit
function seeded(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 4294967296
  }
}

// Smooth value noise on a wrapped grid (tileable), 0..1
function makeNoise(cells: number, seed: number) {
  const random = seeded(seed)
  const grid = Array.from({ length: cells * cells }, () => random())
  const at = (x: number, y: number) => grid[((y % cells) + cells) % cells * cells + (((x % cells) + cells) % cells)]
  const smooth = (t: number) => t * t * (3 - 2 * t)
  return (u: number, v: number) => {
    const x = u * cells
    const y = v * cells
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const fx = smooth(x - x0)
    const fy = smooth(y - y0)
    const top = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx
    const bottom = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx
    return top * (1 - fy) + bottom * fy
  }
}

// Draws the leather: a color map (mottled reddish brown with darker and lighter patches),
// a roughness map (rubbed areas are a little shinier) and a bump map (fine grain plus long creases)
function leatherTextures(size: number) {
  const broad = makeNoise(4, 11)
  const patches = makeNoise(9, 23)
  const grain = makeNoise(96, 37)
  const creases = makeNoise(14, 51)

  // Plain 0..255 sRGB values. (THREE.Color would convert them to linear light, and the texture below
  // is already marked as sRGB, so going through THREE.Color would darken the leather twice.)
  const rgb = (hex: string) => [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16))
  const base = rgb(COLORS.leather)
  const dark = rgb(COLORS.patina)
  const light = rgb(COLORS.leatherLight)
  const mix = (from: number[], to: number[], amount: number) => from.map((value, channel) => value + (to[channel] - value) * amount)

  const color = new Uint8ClampedArray(size * size * 4)
  const rough = new Uint8ClampedArray(size * size * 4)
  const bump = new Uint8ClampedArray(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size
      const v = y / size
      const wear = broad(u, v) * 0.6 + patches(u, v) * 0.4 // 0 = darker patina, 1 = rubbed and lighter
      const fine = grain(u, v)
      // A few long, soft creases: only where a stretched noise is very close to its middle value
      const crease = Math.max(0, 1 - Math.abs(creases(u * 0.5, v * 2.4) - 0.5) * 40)

      const tone = wear < 0.5 ? mix(base, dark, (0.5 - wear) * 0.55) : mix(base, light, (wear - 0.5) * 0.9)
      const shade = 0.96 + fine * 0.07 - crease * 0.05
      const i = (y * size + x) * 4
      color[i] = tone[0] * shade
      color[i + 1] = tone[1] * shade
      color[i + 2] = tone[2] * shade
      color[i + 3] = 255

      const roughness = 0.7 - wear * 0.2 + fine * 0.08 + crease * 0.08
      rough[i] = rough[i + 1] = rough[i + 2] = Math.max(0, Math.min(1, roughness)) * 255
      rough[i + 3] = 255

      const height = fine * 0.6 + wear * 0.2 - crease * 0.25 + 0.2
      bump[i] = bump[i + 1] = bump[i + 2] = Math.max(0, Math.min(1, height)) * 255
      bump[i + 3] = 255
    }
  }

  const toTexture = (data: Uint8ClampedArray, isColor: boolean) => {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.6, 1.6)
    texture.magFilter = THREE.LinearFilter
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.generateMipmaps = true
    if (isColor) texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }
  return { map: toTexture(color, true), roughnessMap: toTexture(rough, false), bumpMap: toTexture(bump, false) }
}

// The outline of the body seen from the front: a rectangle with rounded lower corners, closed by a semicircle
function archShape(width: number, height: number, corner: number) {
  const r = width / 2
  const y0 = -height / 2
  const archY = height / 2 - r
  const shape = new THREE.Shape()
  shape.moveTo(-r + corner, y0)
  shape.lineTo(r - corner, y0)
  shape.quadraticCurveTo(r, y0, r, y0 + corner)
  shape.lineTo(r, archY)
  shape.absarc(0, archY, r, 0, Math.PI, false)
  shape.lineTo(-r, y0 + corner)
  shape.quadraticCurveTo(-r, y0, -r + corner, y0)
  return shape
}

function roundedRect(width: number, height: number, corner: number) {
  const x = -width / 2
  const y = -height / 2
  const shape = new THREE.Shape()
  shape.moveTo(x + corner, y)
  shape.lineTo(x + width - corner, y)
  shape.quadraticCurveTo(x + width, y, x + width, y + corner)
  shape.lineTo(x + width, y + height - corner)
  shape.quadraticCurveTo(x + width, y + height, x + width - corner, y + height)
  shape.lineTo(x + corner, y + height)
  shape.quadraticCurveTo(x, y + height, x, y + height - corner)
  shape.lineTo(x, y + corner)
  shape.quadraticCurveTo(x, y, x + corner, y)
  return shape
}

// A padded panel: a flat outline pushed out with rounded edges, so light rolls over the rim like on soft leather
function paddedPanel(shape: THREE.Shape, depth: number, bevel: number, curveSegments: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 4,
    curveSegments,
  })
  geometry.translate(0, 0, bevel) // the panel now spans z = 0 .. depth
  return geometry
}

// Points along the arch of the body, used by the zipper. Starts low on the wearer's left, runs over the top, ends low on the right.
function archPath(radius: number, z: number, drop: number, steps: number) {
  const points = [new THREE.Vector3(radius, ARCH_Y - drop, z)]
  for (let i = 0; i <= steps; i++) {
    const angle = (Math.PI * i) / steps
    points.push(new THREE.Vector3(radius * Math.cos(angle), ARCH_Y + radius * Math.sin(angle), z))
  }
  points.push(new THREE.Vector3(-radius, ARCH_Y - drop, z))
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2)
}

export function createBackpack(detail: BackpackDetail = 'full'): Backpack {
  const low = detail === 'phone'
  const flat = detail === 'blockout' || detail === 'structure'
  const curve = low ? 14 : 28
  const group = new THREE.Group()
  group.name = 'backpack'
  const disposables: { dispose: () => void }[] = []

  // ---- materials
  const textures = flat ? null : leatherTextures(low ? 256 : 512)
  if (textures) disposables.push(textures.map, textures.roughnessMap, textures.bumpMap)

  const leather = new THREE.MeshStandardMaterial({
    color: flat ? COLORS.leather : '#ffffff',
    roughness: flat ? 0.75 : 1,
    metalness: 0,
    map: textures?.map ?? null,
    roughnessMap: textures?.roughnessMap ?? null,
    bumpMap: low ? null : (textures?.bumpMap ?? null),
    bumpScale: 0.35,
  })
  // The darker leather of the base, straps and pull tab: the same texture, tinted
  const leatherDark = leather.clone()
  leatherDark.color = new THREE.Color(flat ? COLORS.leatherDark : '#d0a79c')
  const zipperTape = new THREE.MeshStandardMaterial({ color: COLORS.zipper, roughness: 0.92 })
  const metal = new THREE.MeshStandardMaterial({ color: COLORS.metal, roughness: 0.38, metalness: 0.9 })
  // The zipper teeth are tiny and mostly in shadow on the real bag, so they get a darker, duller metal
  const teeth = new THREE.MeshStandardMaterial({ color: '#7d7872', roughness: 0.55, metalness: 0.7 })
  const thread = new THREE.MeshStandardMaterial({ color: COLORS.thread, roughness: 0.85 })
  disposables.push(leather, leatherDark, zipperTape, metal, teeth, thread)

  const add = (name: string, geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = group) => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = name
    parent.add(mesh)
    disposables.push(geometry)
    return mesh
  }

  // ---- main body shell (macro)
  const body = add('body-shell', paddedPanel(archShape(W, H, 0.09), D, 0.065, curve), leather)
  body.position.z = -FRONT

  // ---- side pockets (macro): soft pouches bulging from the lower sides
  for (const side of [1, -1]) {
    const pocket = add(side > 0 ? 'side-pocket-l' : 'side-pocket-r', new THREE.SphereGeometry(0.5, low ? 14 : 22, low ? 10 : 16), leather)
    pocket.scale.set(0.17, 0.47, 0.27)
    pocket.position.set(side * (R - 0.005), -0.3, -0.01)
  }

  // ---- base panel (macro): a darker reinforced band under the body
  const basePanel = add('base-panel', paddedPanel(roundedRect(W - 0.02, D + 0.01, 0.08), 0.075, 0.02, low ? 6 : 10), leatherDark)
  basePanel.rotation.x = Math.PI / 2
  basePanel.position.set(0, Y0 + 0.07, 0)

  // ---- top carry handle (macro for the outline): a rolled strap arching above the apex
  const handleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.17, H / 2 - 0.05, -0.02),
    new THREE.Vector3(-0.145, H / 2 + 0.035, -0.02),
    new THREE.Vector3(0, H / 2 + 0.082, -0.02),
    new THREE.Vector3(0.145, H / 2 + 0.035, -0.02),
    new THREE.Vector3(0.17, H / 2 - 0.05, -0.02),
  ])
  const handle = add('top-handle', new THREE.TubeGeometry(handleCurve, low ? 16 : 28, 0.021, low ? 6 : 10, false), leather)
  handle.scale.z = 1.5 // a strap is wider than it is thick

  // ---- front pocket (macro): a patch pocket standing proud of the front panel
  const pocket = add('front-pocket', paddedPanel(roundedRect(0.75, 0.66, 0.07), 0.085, 0.03, low ? 6 : 10), leather)
  pocket.position.set(0, -0.225, FRONT - 0.02)

  if (detail === 'blockout') return finish()

  // ---- zipper track (meso): dark tape following the arch, with a light line of metal teeth
  // It runs on the rim of the front panel, a little inside the outline, as on the real bag
  const zipperZ = FRONT - 0.008
  add('zipper-track', new THREE.TubeGeometry(archPath(R - 0.05, zipperZ, 0.36, 18), low ? 40 : 72, 0.013, 6, false), zipperTape)
  add('zipper-teeth', new THREE.TubeGeometry(archPath(R - 0.05, zipperZ + 0.011, 0.36, 18), low ? 40 : 72, 0.003, 4, false), teeth)
  for (const [name, offset] of [['zipper-slider-a', 0.3], ['zipper-slider-b', 0.235]] as const) {
    const slider = add(name, new THREE.BoxGeometry(0.026, 0.046, 0.02), metal)
    slider.position.set(R - 0.05, ARCH_Y - offset - 0.03, zipperZ + 0.014) // both sliders rest at the wearer's left seam
  }

  // ---- pocket flap band (meso): a wide band over the top edge of the front pocket
  const flap = add('pocket-flap', paddedPanel(roundedRect(0.77, 0.19, 0.05), 0.055, 0.024, low ? 6 : 10), leather)
  flap.position.set(0, 0.045, FRONT + 0.045)

  // ---- pull tab (micro) with its rivet, hanging from the band on the wearer's right
  const tab = add('pull-tab', paddedPanel(roundedRect(0.036, 0.15, 0.012), 0.012, 0.004, 4), leatherDark)
  tab.position.set(-0.27, -0.1, FRONT + 0.1)
  tab.rotation.z = -0.06
  const rivet = add('pull-tab-rivet', new THREE.SphereGeometry(0.011, 10, 8), metal)
  rivet.scale.z = 0.6
  rivet.position.set(-0.267, -0.045, FRONT + 0.114)

  // ---- a plain recessed plate where the real bag carries its maker's mark (the mark itself is not reproduced)
  const plate = add('emboss-plate', paddedPanel(roundedRect(0.13, 0.09, 0.014), 0.008, 0.003, 4), leatherDark)
  plate.position.set(0, 0.36, FRONT - 0.006)

  // ---- rolled rims at the top of the side pockets: a half ring lying flat, bulging outward
  for (const side of [1, -1]) {
    const rim = add(side > 0 ? 'side-pocket-rim-l' : 'side-pocket-rim-r', new THREE.TorusGeometry(0.078, 0.012, 6, low ? 12 : 20, Math.PI), leather)
    rim.rotation.order = 'YXZ'
    rim.rotation.set(Math.PI / 2, (side * Math.PI) / 2, 0) // lay the half ring down, then turn its bulge to the outside
    rim.scale.set(1.35, 0.55, 1) // long front to back, shallow outward
    rim.position.set(side * (R - 0.004), -0.1, -0.01)
  }

  // ---- shoulder straps on the back. Not visible in the reference, so these follow convention.
  for (const side of [1, -1]) {
    const strapCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.17, H / 2 - 0.22, -FRONT - 0.005),
      new THREE.Vector3(side * 0.25, 0.15, -FRONT - 0.045),
      new THREE.Vector3(side * 0.3, -0.25, -FRONT - 0.04),
      new THREE.Vector3(side * 0.36, Y0 + 0.12, -FRONT - 0.005),
    ])
    const strap = add(side > 0 ? 'strap-l' : 'strap-r', new THREE.TubeGeometry(strapCurve, low ? 12 : 20, 0.02, 6, false), leatherDark)
    strap.scale.set(1, 1, 1)
    strap.geometry.scale(1.9, 1, 1) // flattened into a band
    strap.geometry.translate(-side * 0.9 * 0.27, 0, 0) // keep it in place after widening
  }

  // ---- contrast stitching (micro, one draw call): short tan stitches with gaps, like the real seams
  const stitchLines: THREE.Vector3[][] = [
    [new THREE.Vector3(-0.355, 0.112, FRONT + 0.102), new THREE.Vector3(0.355, 0.112, FRONT + 0.102)], // flap, upper row
    [new THREE.Vector3(-0.355, -0.022, FRONT + 0.102), new THREE.Vector3(0.355, -0.022, FRONT + 0.102)], // flap, lower row
    [new THREE.Vector3(-0.345, -0.06, FRONT + 0.066), new THREE.Vector3(-0.345, -0.515, FRONT + 0.066)], // pocket, wearer's right edge
    [new THREE.Vector3(-0.32, -0.535, FRONT + 0.066), new THREE.Vector3(0.32, -0.535, FRONT + 0.066)], // pocket, bottom edge
    [new THREE.Vector3(0.345, -0.515, FRONT + 0.066), new THREE.Vector3(0.345, -0.06, FRONT + 0.066)], // pocket, wearer's left edge
    [new THREE.Vector3(-0.42, 0.165, FRONT + 0.002), new THREE.Vector3(0.42, 0.165, FRONT + 0.002)], // seam across the front panel above the pocket
  ]
  const stitchLength = 0.017
  const pitch = low ? 0.046 : 0.031
  const placements: { position: THREE.Vector3; angle: number }[] = []
  for (const [from, to] of stitchLines) {
    const length = from.distanceTo(to)
    const count = Math.floor(length / pitch)
    const angle = Math.atan2(to.y - from.y, to.x - from.x)
    for (let i = 0; i <= count; i++) placements.push({ position: from.clone().lerp(to, i / count), angle })
  }
  const stitches = new THREE.InstancedMesh(new THREE.BoxGeometry(stitchLength, 0.0042, 0.003), thread, placements.length)
  stitches.name = 'stitching'
  const transform = new THREE.Object3D()
  placements.forEach(({ position, angle }, index) => {
    transform.position.copy(position)
    transform.rotation.set(0, 0, angle + 0.18) // each stitch leans a little, as machine stitches do
    transform.updateMatrix()
    stitches.setMatrixAt(index, transform.matrix)
  })
  group.add(stitches)
  disposables.push(stitches.geometry)

  return finish()

  function finish(): Backpack {
    let triangles = 0
    group.traverse((object) => {
      if (object instanceof THREE.InstancedMesh) triangles += (object.geometry.index!.count / 3) * object.count
      else if (object instanceof THREE.Mesh) {
        const geometry = object.geometry as THREE.BufferGeometry
        triangles += (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3
      }
    })
    return { group, triangles: Math.round(triangles), dispose: () => disposables.forEach((item) => item.dispose()) }
  }
}
