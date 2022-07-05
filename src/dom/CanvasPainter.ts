import { Observable } from "rxjs"
import Drawing, { CanvasPoint, canvasToModel, initialZoom, modelToCanvas, Point, Stroke, ZoomState } from "../data/Drawing"

export default class CanvasPainter {

    #size = { width: 0, height: 0 }
    #zoom: ZoomState = { ...initialZoom }

    constructor(
        private context: CanvasRenderingContext2D,
        private drawing: Drawing,
        private size: Observable<{ width: number, height: number }>
    ) {
        this.#registerLineDrawing()
        this.#registerEraseStrokeDrawing()
        this.#registerErase()
        this.#registerClear()
        this.#registerResize()
        this.#registerZoom()
    }

    redraw(strokes: Stroke[] = this.drawing.strokes) {
        this.context.strokeStyle = '#000'
        this.context.lineWidth = 1
        this.#clear()
        strokes.forEach(s => {
            if (s.points.length === 0) {
                return
            }
            this.context.beginPath()
            s.points.forEach((modelPoint, index) => {
                const pt = this.#toCanvas(modelPoint)
                if (index === 0) {
                    this.#moveTo(pt)
                } else {
                    this.#lineTo(pt)
                    // doing this after every point makes it look exactly like when
                    // dragging with a mouse, in the future this should use brushes and stuff though,
                    // not just plain canvas line
                    this.context.stroke()
                }
            })
        })
    }

    #registerLineDrawing() {
        this.drawing.strokeStart.subscribe(s => {
            this.context.beginPath()
            this.context.strokeStyle = '#000'
            this.context.lineWidth = 1
            this.#moveTo(this.#toCanvas(s.points[0]))
        })

        this.drawing.strokePoint.subscribe(pt => {
            this.#lineTo(this.#toCanvas(pt))
            this.context.stroke()
        })

        this.drawing.strokeEnd.subscribe(s => {
            // TODO: optimize
        })
    }

    #registerEraseStrokeDrawing() {
        this.drawing.eraseStrokeStart.subscribe(pt => {
            this.context.beginPath()
            this.#moveTo(this.#toCanvas(pt))
        })

        this.drawing.eraseStrokePoint.subscribe(pt => {
            this.#lineTo(this.#toCanvas(pt))
            this.context.strokeStyle = '#eee'
            this.context.lineWidth = 1
            this.context.stroke()
        })

        this.drawing.eraseStrokeEnd.subscribe(s => {
            // get rid of the erase stroke which is just an indicator, not part of the drawing
            this.redraw()
        })
    }

    #registerErase() {
        this.drawing.strokesErased.subscribe(() => {
            this.redraw()
            this.context.beginPath()
        })
    }

    #registerClear() {
        this.size.subscribe(s => this.#size = s)
        this.drawing.clears.subscribe(() => {
            this.#clear()
        })
    }

    #clear() {
        this.context.clearRect(0, 0, this.#size.width, this.#size.height)
    }

    #registerResize() {
        this.size.subscribe(() => {
            this.redraw()
        })
    }

    #registerZoom() {
        this.drawing.zoomState.subscribe(z => {
            this.#zoom = z
            this.redraw()
        })
    }

    #toCanvas(pt: Point): CanvasPoint {
        return modelToCanvas(pt, this.#zoom)
    }

    #moveTo(pt: CanvasPoint) {
        this.context.moveTo(pt[0], pt[1])
    }

    #lineTo(pt: CanvasPoint) {
        this.context.lineTo(pt[0], pt[1])
    }
}
