import Drawing from "./data/Drawing"
import Modes from "./data/Modes"
import CanvasDom from "./dom/CanvasDom"
import CanvasPainter from "./dom/CanvasPainter"
import KeyboardHandler from "./dom/KeyboardHandler"
import OverlayUi from "./ui/OverlayUi"
import { merge } from 'rxjs'
import LocalStorageAutoSave from "./data/Storage"
import { Pages } from "./data/Pages"

document.addEventListener('DOMContentLoaded', start)

function start() {
    const canvas = new CanvasDom()
    const keyboard = new KeyboardHandler()
    const modes = new Modes('hold', keyboard.keyDownChanges)
    const drawing = new Drawing(canvas.penDown, canvas.movements, modes.eraseMode, modes.panMode, modes.zoomCommand, modes.panCommand)
    const painter = new CanvasPainter(canvas.canvas.getContext('2d')!, drawing, canvas.size)
    const pages = new Pages()
    const overlay = new OverlayUi(drawing, pages, modes, canvas.rawEvents, undefined, merge(drawing.debugEvents, painter.debugEvents))
    const storage = new LocalStorageAutoSave(drawing, pages)

    pages.errors.subscribe(console.error)

    document.body.appendChild(canvas.canvas)
    if (canvas.cursorDiv !== undefined) {
        document.body.appendChild(canvas.cursorDiv)
    }
    document.body.appendChild(overlay.overlay)
}
