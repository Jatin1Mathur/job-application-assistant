import { useFrame, useThree } from '@react-three/fiber'
import type { RefObject } from 'react'
import { Vector3 } from 'three'
import type { Object3D } from 'three'

const point = new Vector3()

// Keeps ordinary page elements (the skill names) glued to objects in the 3D scene.
// Every frame it works out where each object is on the screen and moves its label there.
// The labels are real text on the page, so they are sharp, follow the theme, and cost almost nothing to draw.
export default function LabelSync({
  objects,
  labels,
  offsets,
}: {
  objects: RefObject<(Object3D | null)[]>
  labels: RefObject<(HTMLElement | null)[]>
  // How far below each object (in scene units) its label sits
  offsets: number[]
}) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)

  useFrame(() => {
    objects.current.forEach((object, index) => {
      const label = labels.current[index]
      if (!object || !label) return
      object.getWorldPosition(point)
      point.y -= offsets[index]
      point.project(camera)
      const x = (point.x * 0.5 + 0.5) * size.width
      const y = (-point.y * 0.5 + 0.5) * size.height
      label.style.transform = `translate(-50%, 0) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
      // Objects further away get a slightly fainter label, which adds depth
      label.style.opacity = String(Math.max(0.45, Math.min(1, 1.25 - point.z * 0.4)))
      label.style.zIndex = String(Math.round((1 - point.z) * 1000))
    })
  })
  return null
}
