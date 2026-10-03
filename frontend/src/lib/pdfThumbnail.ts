import { api } from '../api.ts'

// The PDF files that were already downloaded in this visit, so opening the compare view does not load them again
const files = new Map<number, Promise<ArrayBuffer>>()

function fileOf(resumeId: number): Promise<ArrayBuffer> {
  let file = files.get(resumeId)
  if (!file) {
    file = api.getResumeFile(resumeId).then((blob) => blob.arrayBuffer())
    // A failed download is not remembered, so it can be tried again
    file.catch(() => files.delete(resumeId))
    files.set(resumeId, file)
  }
  return file
}

// Draws the first page of a resume into the canvas, `width` CSS pixels wide.
// pdf.js is big, so it is loaded here, on first use, and not with the rest of the app.
export async function drawFirstPage(resumeId: number, canvas: HTMLCanvasElement, width: number): Promise<void> {
  const [pdfjs, worker, data] = await Promise.all([
    import('pdfjs-dist'),
    // The part of pdf.js that reads the file runs in a worker, off the main thread
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    fileOf(resumeId),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default
  // pdf.js takes the buffer over, so it gets a copy and the cached one stays usable
  const task = pdfjs.getDocument({ data: data.slice(0) })
  try {
    const document = await task.promise
    const page = await document.getPage(1)
    const unscaled = page.getViewport({ scale: 1 })
    // Sharp on dense screens, but never more than twice the pixels
    const density = Math.min(window.devicePixelRatio || 1, 2)
    const viewport = page.getViewport({ scale: (width / unscaled.width) * density })
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvas, viewport }).promise
  } finally {
    void task.destroy()
  }
}
