import { Observable, Subject } from "rxjs"
import Drawing, { CanvasPoint, initialZoom, modelToCanvas, Point, SerializedDrawing, Stroke, ZoomState } from "../data/Drawing"
import { currentTheme } from "../ui/theme"

export default class CanvasPainter {

    #size = { width: 0, height: 0 }
    #zoom: ZoomState = { ...initialZoom }

    readonly debugEvents = new Subject<string>()

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

        // Subscribe to theme changes to redraw with new colors
        currentTheme.subscribe(() => {
            this.redraw('theme changed')
        })
    }

    redraw(reason: string = '', strokes: Stroke[] = this.drawing.strokes) {
        this.debugEvents.next(`redraw (reason=${reason}, layer1=${this.drawing.layer1Strokes.length} strokes, layer2=${this.drawing.layer2Strokes.length} strokes)`)
        this.context.strokeStyle = currentTheme.value.defaultStrokeColor
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
                }
            })
            this.context.stroke()
        })
    }

    #registerLineDrawing() {
        let previousPoint: CanvasPoint = [0, 0] as CanvasPoint
        this.drawing.strokeStart.subscribe(s => {
            this.context.beginPath()
            this.context.strokeStyle = currentTheme.value.defaultStrokeColor
            this.context.lineWidth = 1
            previousPoint = this.#toCanvas(s.points[0])
        })

        this.drawing.strokePoint.subscribe(pt => {
            this.context.beginPath()
            const currentPoint = this.#toCanvas(pt)
            this.#moveTo(previousPoint)
            this.#lineTo(currentPoint)
            this.context.stroke()
            previousPoint = currentPoint
        })

        this.drawing.strokeEnd.subscribe(s => {
            // TODO: optimize
        })
    }

    #registerEraseStrokeDrawing() {
        let previousPoint: CanvasPoint = [0, 0] as CanvasPoint
        this.drawing.eraseStrokeStart.subscribe(pt => {
            this.context.beginPath()
            previousPoint = this.#toCanvas(pt)
        })

        this.drawing.eraseStrokePoint.subscribe(pt => {
            this.context.beginPath()
            const currentPoint = this.#toCanvas(pt)
            this.#moveTo(previousPoint)
            this.#lineTo(currentPoint)
            this.context.strokeStyle = currentTheme.value.eraseStrokeColor
            this.context.lineWidth = 1
            this.context.stroke()
            previousPoint = currentPoint
        })

        this.drawing.eraseStrokeEnd.subscribe(s => {
            // get rid of the erase stroke which is just an indicator, not part of the drawing
            this.redraw('erase stroke end')
        })
    }

    #registerErase() {
        this.drawing.strokesErased.subscribe(() => {
            this.redraw('strokes erased')
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
            this.redraw('resize')
        })
    }

    #registerZoom() {
        this.drawing.zoomState.subscribe(z => {
            this.#zoom = z
            this.redraw('zoom/pan')
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

    // Static method to render a drawing preview
    static renderPreview(
        context: CanvasRenderingContext2D,
        savedState: SerializedDrawing,
        width: number,
        height: number
    ) {
        // Clear the canvas
        context.fillStyle = currentTheme.value.background
        context.fillRect(0, 0, width, height)

        // Combine both layers for preview
        const allStrokes = [...(savedState.layer1Strokes ?? []), ...(savedState.layer2Strokes ?? [])]
        if (allStrokes.length === 0) {
            return
        }

        // Calculate scale to fit the drawing in the preview
        const bounds = this.getDrawingBounds(allStrokes)
        const drawingWidth = bounds.maxX - bounds.minX
        const drawingHeight = bounds.maxY - bounds.minY
        const scale = Math.min(
            (width - 10) / drawingWidth,  // -10 for padding
            (height - 10) / drawingHeight
        )

        // Center the drawing in the preview
        const offsetX = (width - drawingWidth * scale) / 2 - bounds.minX * scale
        const offsetY = (height - drawingHeight * scale) / 2 - bounds.minY * scale

        // Draw the strokes
        context.strokeStyle = currentTheme.value.defaultStrokeColor
        context.lineWidth = 1
        allStrokes.forEach(stroke => {
            if (stroke.points.length === 0) return
            
            context.beginPath()
            const firstPoint = stroke.points[0]
            context.moveTo(
                firstPoint[0] * scale + offsetX,
                firstPoint[1] * scale + offsetY
            )
            
            stroke.points.slice(1).forEach(point => {
                context.lineTo(
                    point[0] * scale + offsetX,
                    point[1] * scale + offsetY
                )
            })
            context.stroke()
        })
    }

    private static getDrawingBounds(strokes: Stroke[]) {
        let minX = Infinity
        let minY = Infinity
        let maxX = -Infinity
        let maxY = -Infinity

        strokes.forEach(stroke => {
            stroke.points.forEach(point => {
                minX = Math.min(minX, point[0])
                minY = Math.min(minY, point[1])
                maxX = Math.max(maxX, point[0])
                maxY = Math.max(maxY, point[1])
            })
        })

        // If no points, return a default size
        if (!isFinite(minX)) {
            return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
        }

        return { minX, minY, maxX, maxY }
    }
}
