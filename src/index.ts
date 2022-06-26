import Drawing from "./data/Drawing"
import Canvas from "./dom/Canvas"
import CanvasPainter from "./dom/CanvasPainter"
import OverlayUi, { Corner } from "./dom/OverlayUi"

document.addEventListener('DOMContentLoaded', start)

function start() {
    const canvas = new Canvas()
    const drawing = new Drawing(canvas.penDown, canvas.movements)
    const painter = new CanvasPainter(
        canvas.canvas.getContext('2d')!,
        drawing.strokeStart,
        drawing.strokePoint,
        drawing.strokeEnd,
        drawing.clears,
        canvas.size
    )
    const overlay = new OverlayUi(drawing)

    document.body.appendChild(canvas.canvas)
    document.body.appendChild(overlay.overlay)
}
