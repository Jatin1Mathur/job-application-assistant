import { useReducedMotion } from 'motion/react'
import { Component, Suspense, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { isPhone, scenePalette, webglSupported } from '../three/support.ts'
import type { SceneProps } from '../three/support.ts'
import { useTheme } from '../theme.tsx'

// If a 3D scene crashes (for example the graphics driver gives up), show the static version instead
class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

// The safe frame around every 3D scene. It guarantees four things:
// 1. No WebGL, or "reduce motion" switched on: the static fallback is shown and the 3D code is never loaded.
// 2. The 3D code is loaded only when the scene first comes near the screen (the scene is a lazy import).
// 3. While that code loads, the static fallback is already visible, so the page is readable at once.
// 4. The scene stops rendering whenever it is off-screen or the browser tab is hidden.
export default function Lazy3D({
  fallback,
  scene,
  label,
  className,
}: {
  fallback: ReactNode
  scene: (props: SceneProps) => ReactNode
  // What the picture shows, for screen readers
  label: string
  className?: string
}) {
  const reducedMotion = useReducedMotion()
  const { theme } = useTheme()
  const box = useRef<HTMLDivElement>(null)
  const [onScreen, setOnScreen] = useState(false)
  const [everOnScreen, setEverOnScreen] = useState(false)
  const [tabVisible, setTabVisible] = useState(!document.hidden)

  const use3D = !reducedMotion && webglSupported()

  useEffect(() => {
    if (!use3D || !box.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setOnScreen(entry.isIntersecting)
        if (entry.isIntersecting) setEverOnScreen(true)
      },
      { rootMargin: '120px' },
    )
    observer.observe(box.current)
    return () => observer.disconnect()
  }, [use3D])

  useEffect(() => {
    const onChange = () => setTabVisible(!document.hidden)
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return (
    <div ref={box} role="img" aria-label={label} className={className} data-3d={use3D ? 'on' : 'fallback'}>
      {use3D && everOnScreen ? (
        <SceneErrorBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            {scene({ active: onScreen && tabVisible, phone: isPhone(), palette: scenePalette(theme) })}
          </Suspense>
        </SceneErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  )
}
