// Small helpers that decide whether and how a 3D scene is shown.
// This file must not import three.js, so it can be used without loading the 3D code.

let cachedSupport: boolean | null = null

// True if the browser can create a WebGL context. Checked once and remembered.
export function webglSupported(): boolean {
  if (cachedSupport === null) {
    try {
      const canvas = document.createElement('canvas')
      cachedSupport = Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
    } catch {
      cachedSupport = false
    }
  }
  return cachedSupport
}

// Phones get simpler scenes: fewer objects, fewer triangles, lower pixel ratio, no anti-aliasing
export function isPhone(): boolean {
  return window.matchMedia('(max-width: 640px)').matches
}

// Colors of the 3D scenes, matched to the design tokens in index.css.
// three.js needs plain hex colors, so the two themes are written out here.
export interface ScenePalette {
  accent: string
  accentGlow: string
  dim: string
  line: string
  lineOpacity: number
  light: string
}

export function scenePalette(theme: 'light' | 'dark'): ScenePalette {
  return theme === 'dark'
    ? { accent: '#c6f432', accentGlow: '#c6f432', dim: '#55635a', line: '#c6f432', lineOpacity: 0.16, light: '#ffffff' }
    : { accent: '#a3d61f', accentGlow: '#b8ea2c', dim: '#b4bbb2', line: '#1f2a24', lineOpacity: 0.16, light: '#ffffff' }
}

export interface SceneProps {
  // False while the scene is off-screen or the browser tab is hidden: rendering then stops completely
  active: boolean
  phone: boolean
  palette: ScenePalette
}
