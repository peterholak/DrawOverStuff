import { Observable } from "rxjs"
import Drawing, { Point, Stroke } from "../data/Drawing"

export default class CanvasPainter {
    constructor(
        private context: CanvasRenderingContext2D,
        private drawing: Drawing,
        private size: Observable<{ width: number, height: number }>
    ) {
        this.#registerLineDrawing()
        this.#registerClear()
        this.#registerResize()
    }

    redraw(strokes: Stroke[] = this.drawing.strokes) {
        strokes.forEach(s => {
            if (s.points.length === 0) {
                return
            }
            this.context.beginPath()
            s.points.forEach((pt, index) => {
                if (index === 0) {
                    this.context.moveTo(pt[0], pt[1])
                } else {
                    this.context.lineTo(pt[0], pt[1])
                }
            })
            this.context.stroke()
        })
    }

    #registerLineDrawing() {
        this.drawing.strokeStart.subscribe(s => {
            this.context.beginPath()
            this.context.moveTo(s.points[0][0], s.points[0][1])
        })

        this.drawing.strokePoint.subscribe(pt => {
            this.context.lineTo(pt[0], pt[1])
            this.context.stroke()
        })

        this.drawing.strokeEnd.subscribe(s => {
            // TODO: optimize
        })
    }

    #registerClear() {
        let size = { width: 0, height: 0 }
        this.size.subscribe(s => size = s)
        this.drawing.clears.subscribe(() => {
            this.context.clearRect(0, 0, size.width, size.height)
        })
    }

    #registerResize() {
        this.size.subscribe(() => {
            this.redraw()
        })
    }
}