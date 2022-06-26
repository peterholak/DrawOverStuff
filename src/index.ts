import Drawing from "./data/Drawing"
import Modes from "./data/Modes"
import Canvas from "./dom/Canvas"
import CanvasPainter from "./dom/CanvasPainter"
import KeyboardHandler from "./dom/KeyboardHandler"
import OverlayUi, { Corner } from "./dom/OverlayUi"

document.addEventListener('DOMContentLoaded', start)

function start() {
    const canvas = new Canvas()
    const keyboard = new KeyboardHandler()
    const modes = new Modes('hold', keyboard.keyDownChanges)
    const drawing = new Drawing(canvas.penDown, canvas.movements, modes.eraseMode)
    const painter = new CanvasPainter(canvas.canvas.getContext('2d')!, drawing, canvas.size)
    const overlay = new OverlayUi(drawing, modes, canvas.rawEvents, keyboard.events)

    document.body.appendChild(canvas.canvas)
    document.body.appendChild(overlay.overlay)
}
