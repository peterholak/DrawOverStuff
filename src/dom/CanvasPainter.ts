import { Observable } from "rxjs"
import { Point, Stroke } from "../data/Drawing"

export default class CanvasPainter {
    constructor(
        private context: CanvasRenderingContext2D,
        private onStrokeStart: Observable<Readonly<Stroke>>,
        private onStrokePoint: Observable<Point>,
        private onStrokeEnd: Observable<Readonly<Stroke>>,
        private clear: Observable<void>,
        private size: Observable<{ width: number, height: number }>
    ) {
        this.#registerLineDrawing()
        this.#registerClear()
    }

    #registerLineDrawing() {
        this.onStrokeStart.subscribe(s => {
            this.context.beginPath()
            this.context.moveTo(s.points[0][0], s.points[0][1])
        })

        this.onStrokePoint.subscribe(pt => {
            this.context.lineTo(pt[0], pt[1])
            this.context.stroke()
        })

        this.onStrokeEnd.subscribe(s => {
            // TODO: optimize
        })
    }

    #registerClear() {
        let size = { width: 0, height: 0 }
        this.size.subscribe(s => size = s)
        this.clear.subscribe(() => {
            this.context.clearRect(0, 0, size.width, size.height)
        })
    }
}