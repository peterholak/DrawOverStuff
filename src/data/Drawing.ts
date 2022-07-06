import { BehaviorSubject, map, merge, Observable, Subject } from "rxjs"
import { PenUpDown } from "../dom/CanvasDom"
import { PanCommand, ZoomCommand } from "./Modes"

/** X, Y points in the drawing model, zoom-independent. */
export type Point = [number, number] & { _marker?: never }

/**
 * X, Y points as the Canvas DOM element sees them, unaware of the app's internal zoom.
 * The marker is not actually there at runtime, it is only defined as such for compile-time checking,
 * to make `CanvasPoint` and `Point` structurally incompatible, enforcing the explicit conversions.
 */
export type CanvasPoint = [number, number] & { _marker: 'Canvas' }

export type ZoomState = {
    /** 1 = 100% */
    level: number

    // TODO: should this be in Point or CanvasPoint?
    /** offset from zooming such that top-left corner would be at [0, 0] */
    offset: Point
}
export const initialZoom: Readonly<ZoomState> = Object.freeze({ level: 1, offset: [0, 0] as Point })
export const zoomLevels = Object.freeze([0.1, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4, 5, 7.5, 10])

export class Stroke {
    constructor(startPoint: Point) {
        this.points.push(startPoint)
    }

    points: Array<Point> = []
}

export default class Drawing {
    strokes: Stroke[] = []
    eraseStroke: Stroke|undefined
    erasing = false
    panning = false
    panAnchor: CanvasPoint = [0, 0] as CanvasPoint // TODO: organize all these variables, remove possible states that don't make sense
    isPenDown = false
    underPointer: CanvasPoint = [0, 0] as CanvasPoint

    readonly strokeStart = new Subject<Readonly<Stroke>>()
    readonly strokeEnd = new Subject<Readonly<Stroke>>()
    readonly strokePoint = new Subject<Point>()

    readonly eraseStrokeStart = new Subject<Point>()
    readonly eraseStrokeEnd = new Subject<Point>()
    readonly eraseStrokePoint = new Subject<Point>()
    readonly strokesErased = new Subject<void>()

    readonly clears = new Subject<void>()

    readonly zoomState = new BehaviorSubject<ZoomState>(initialZoom)

    readonly debugEvents = new Subject<string>()

    readonly #strokeChanges = merge(this.clears, this.strokeEnd, this.strokesErased)
    readonly strokeCount = this.#strokeChanges.pipe(
        map(() => this.strokes.length)
    )
    readonly pointCount = this.#strokeChanges.pipe(
        map(() => this.strokes.reduce((acc, s) => acc + s.points.length, 0))
    )
    readonly lastStrokePoints = this.#strokeChanges.pipe(
        map(() => this.strokes.length === 0 ? 0 : this.strokes[this.strokes.length - 1].points.length)
    )

    constructor(
        penDown: Observable<PenUpDown>,
        movements: Observable<CanvasPoint>,
        eraseMode: Observable<boolean>,
        panMode: Observable<boolean>,
        zoomCommand: Observable<ZoomCommand>,
        panCommand: Observable<PanCommand>
    ) {
        penDown.subscribe(this.#penUpDown.bind(this))
        movements.subscribe(this.#movement.bind(this))
        // TODO: maybe keep the mode until pen up if it is already active?
        eraseMode.subscribe(e => {
            this.erasing = e
            if (this.erasing === false && this.eraseStroke !== undefined) {
                this.eraseStrokeEnd.next(this.#toModel(this.underPointer))
                this.eraseStroke = undefined
                // Treat the pen as not being down if erase button is lifted in the middle of the erase stroke
                // TODO: could maybe just start a new stroke immediately instead
                this.isPenDown = false
            }
        })

        panMode.subscribe(panning => {
            this.panning = panning
            if (this.panning === false) {
                this.isPenDown = false
            }
        })

        zoomCommand.subscribe(this.#zoomCommand.bind(this))
        panCommand.subscribe(this.#panCommand.bind(this))
    }

    clear() {
        const existingStroke = this.#currentStroke()
        if (existingStroke !== undefined) {
            this.strokeEnd.next(existingStroke)
        }
        this.strokes = []
        this.clears.next()
    }

    #penUpDown(e: PenUpDown) {
        const point = this.#toModel(e.canvasPoint)
        // TODO: make all this code with all the state changes (including in mode switches) and shit nicer and readable in one place
        // maybe instead of individual variables "panning", "erasing" etc., just have one "pen move action" variable that makes
        // the operations mutually exclusive
        if (e.isDown) {
            if (this.panning) {
                this.panAnchor = e.canvasPoint
            } else if (this.erasing) {
                this.eraseStroke = { points: [ point ] }
                this.eraseStrokeStart.next(point)
            } else {
                this.#nextStroke(point) // TODO
            }
        } else {
            if (this.erasing) {
                this.eraseStrokeEnd.next(point)
                this.eraseStroke = undefined
            } else if (!this.panning) {
                const stroke = this.#currentStroke()
                if (stroke !== undefined) {
                    this.strokeEnd.next(stroke)
                }
            }
        }
        this.isPenDown = e.isDown
    }

    #currentStroke() {
        if (!this.isPenDown || this.erasing || this.strokes.length === undefined) {
            return undefined
        }

        return this.strokes[this.strokes.length - 1]
    }

    #nextStroke(startPoint: Point) {
        const stroke = new Stroke(startPoint)
        this.strokes.push(stroke)
        this.strokeStart.next(stroke)
    }

    #movement(canvasPoint: CanvasPoint) {
        const point = this.#toModel(canvasPoint)
        this.underPointer = canvasPoint
        if (this.erasing && this.isPenDown) {
            return this.#erasingMovement(canvasPoint)
        }

        if (this.panning && this.isPenDown) {
            return this.#panningMovement(canvasPoint)
        }

        const stroke = this.#currentStroke()
        if (stroke === undefined) {
            return
        }
        stroke.points.push(point)
        this.strokePoint.next(point)
    }

    #erasingMovement(canvasPoint: CanvasPoint) {
        const point = this.#toModel(canvasPoint)
        if (this.eraseStroke === undefined) {
            // erase key may have been pressed during an existing stroke
            // it will not be take into account in such a case
            return
        }

        this.eraseStroke.points.push(point)
        this.eraseStrokePoint.next(point)
        
        // need at least 2 points, to check line intersecting with another line
        if (this.eraseStroke.points.length < 2) {
            return
        }

        const pt1 = this.eraseStroke.points[this.eraseStroke.points.length - 2]
        const pt2 = this.eraseStroke.points[this.eraseStroke.points.length - 1]

        const strokesToDelete: Stroke[] = []
        // TODO: optimize obviously, divide up space and only compare with strokes' segments that cross the nearby areas, etc.
        this.strokes.forEach(s => {
            // TODO: way to erase single points
            if (s.points.length < 2) {
                return
            }

            for (let i=0; i<s.points.length - 1; i++) {
                const strokePt1 = s.points[i]
                const strokePt2 = s.points[i + 1]

                if (lineIntersects(pt1, pt2, strokePt1, strokePt2)) {
                    strokesToDelete.push(s)
                    return
                }
            }
        })

        this.strokes = this.strokes.filter(s => !strokesToDelete.includes(s))
        if (strokesToDelete.length > 0) {
            this.debugEvents.next(`erased ${strokesToDelete.length} strokes`)
            this.strokesErased.next()
        }
    }

    #panningMovement(canvasPoint: CanvasPoint) {
        // TODO: decide which kind of points will be used for offsets with good reasoning
        const existingZoom = this.zoomState.value
        const canvasDiff = [
            (canvasPoint[0] - this.panAnchor[0]),
            (canvasPoint[1] - this.panAnchor[1])
        ] as Point
        this.zoomState.next({ level: existingZoom.level, offset: pointPlus(existingZoom.offset, canvasDiff) })
        this.panAnchor = canvasPoint
    }

    #zoomCommand(command: ZoomCommand) {
        if (command === 'reset') {
            return this.zoomState.next(initialZoom)
        }

        const existing = this.zoomState.value
        const newLevel = newZoomLevel(command, existing.level)
        const newOffset = newZoomPanOffset(existing, newLevel, this.underPointer)
        this.zoomState.next({ level: newLevel, offset: newOffset })
        
        function newZoomLevel(command: Exclude<ZoomCommand, 'reset'>, current: number) {
            switch (command) {
                case 'in': return zoomLevels.find(level => level > current) ?? zoomLevels[zoomLevels.length - 1]
                case 'out': return reverseFind(zoomLevels, level => level < current) ?? zoomLevels[0]
                default: return 1 // TODO: log error
            }
        }
    }

    #panCommand(command: PanCommand) {
        const existing = this.zoomState.value
        const step = 10
        this.zoomState.next({ level: existing.level, offset: pointPlus(existing.offset, zoomRelativeOffset(command.direction, step))})

        function zoomRelativeOffset(direction: PanCommand["direction"], step: number): Point {
            switch (direction) {
                case 'left': return [-step, 0]
                case 'right': return [step, 0]
                case 'up': return [0, -step]
                case 'down': return [0, step]
                default: return [0, 0] // TODO: log error
            }
        }
    }

    #toModel(canvasPoint: CanvasPoint) {
        return canvasToModel(canvasPoint, this.zoomState.value)
    }
}

function lineIntersects(line1pt1: Point, line1pt2: Point, line2pt1: Point, line2pt2: Point) {
    const length1x = line1pt2[0] - line1pt1[0]
    const length1y = line1pt2[1] - line1pt1[1]
    const length2x = line2pt2[0] - line2pt1[0]
    const length2y = line2pt2[1] - line2pt1[1]
    const denominator = (length1y * length2x) - (length1x * length2y)

    if (denominator === 0) {
        return false
    }

    const ratio1 = ((length2y * (line1pt1[0] - line2pt1[0])) - (length2x * (line1pt1[1] - line2pt1[1]))) / denominator
    const ratio2 = ((length1x * (line2pt1[1] - line1pt1[1])) - (length1y * (line2pt1[0] - line1pt1[0]))) / denominator
    return ratio2 >= 0 && ratio2 <= 1 && ratio1 >= 0 && ratio1 <= 1
}

export function modelToCanvas(point: Point, zoom: ZoomState): CanvasPoint {
    return [
        zoom.offset[0] + point[0] * zoom.level,
        zoom.offset[1] + point[1] * zoom.level
    ] as CanvasPoint
}

export function canvasToModel(canvasPoint: CanvasPoint, zoom: ZoomState): Point {
    return [
        (canvasPoint[0] - zoom.offset[0]) / zoom.level,
        (canvasPoint[1] - zoom.offset[1]) / zoom.level
    ]
}

export function pointPlus(a: Point, b: Point): Point {
    return [a[0] + b[0], a[1] + b[1]]
}

/**
 * When zooming in/out with a particular point under the pointer, the goal is to adjust the pan offset
 * so that after the zoom, the same point is still under the pointer
 */
export function newZoomPanOffset(previousState: ZoomState, newZoomLevel: number, underPointer: CanvasPoint): Point {
    const modelPoint = canvasToModel(underPointer, previousState)
    return [
        underPointer[0] - modelPoint[0] * newZoomLevel,
        underPointer[1] - modelPoint[1] * newZoomLevel
    ]
}

export function reverseFind<T>(array: ReadonlyArray<T>, predicate: (item: T) => boolean): T|undefined {
    for (let i=array.length - 1; i>=0; i--) {
        if (predicate(array[i])) {
            return array[i]
        }
    }
    return undefined
}
