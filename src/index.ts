import Drawing from "./data/Drawing"
import Modes from "./data/Modes"
import CanvasDom from "./dom/CanvasDom"
import CanvasPainter from "./dom/CanvasPainter"
import KeyboardHandler from "./dom/KeyboardHandler"
import OverlayUi from "./ui/OverlayUi"
import { merge } from 'rxjs'
import LocalStorageAutoSave from "./data/Storage"
import { Pages } from "./data/Pages"
import { route } from "preact-router"

document.addEventListener('DOMContentLoaded', start)

function start() {
    const keyboard = new KeyboardHandler()
    const modes = new Modes('hold', keyboard.keyDownChanges)
    const canvas = new CanvasDom(modes.cursorVisible)
    const drawing = new Drawing(canvas.penDown, canvas.movements, modes.eraseMode, modes.panMode, modes.zoomCommand, modes.panCommand)
    const painter = new CanvasPainter(canvas.canvas.getContext('2d')!, drawing, canvas.size)
    const pages = new Pages()
    
    // Initialize storage first to load saved pages
    const storage = new LocalStorageAutoSave(drawing, pages)
    
    // Create UI after storage is initialized
    const overlay = new OverlayUi(drawing, pages, modes, canvas.rawEvents, undefined, merge(drawing.debugEvents, painter.debugEvents))

    // Connect layer mode
    modes.layer2Active.subscribe(isLayer2 => {
        drawing.isLayer2Active = isLayer2
    })

    // Connect page navigation commands
    modes.nextPage.subscribe(() => {
        pages.goToNextActivePage();
        route(`/page/${pages.current().id}`);
    });
    modes.previousPage.subscribe(() => {
        pages.goToPreviousActivePage();
        route(`/page/${pages.current().id}`);
    });

    pages.errors.subscribe(console.error)

    document.body.appendChild(canvas.canvas)
    if (canvas.cursorDiv !== undefined) {
        document.body.appendChild(canvas.cursorDiv)
    }
    document.body.appendChild(overlay.overlay)
}
