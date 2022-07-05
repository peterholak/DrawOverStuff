import { map, merge, Observable, Subject } from "rxjs"
import { PenUpDown } from "../dom/Canvas"

export type Point = [number, number]

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
    isPenDown = false

    readonly strokeStart = new Subject<Readonly<Stroke>>()
    readonly strokeEnd = new Subject<Readonly<Stroke>>()
    readonly strokePoint = new Subject<Point>()

    readonly eraseStrokeStart = new Subject<Point>()
    readonly eraseStrokeEnd = new Subject<Point>()
    readonly eraseStrokePoint = new Subject<Point>()
    readonly strokesErased = new Subject<void>()

    readonly clears = new Subject<void>()

    readonly debugEvents = new Subject<string>()

    readonly #strokeChanes = merge(this.clears, this.strokeEnd)
    readonly strokeCount = this.#strokeChanes.pipe(
        map(() => this.strokes.length)
    )
    readonly pointCount = this.#strokeChanes.pipe(
        map(() => this.strokes.reduce((acc, s) => acc + s.points.length, 0))
    )
    readonly lastStrokePoints = this.#strokeChanes.pipe(
        map(() => this.strokes.length === 0 ? 0 : this.strokes[this.strokes.length - 1].points.length)
    )

    constructor(
        penDown: Observable<PenUpDown>,
        movements: Observable<Point>,
        eraseMode: Observable<boolean>
    ) {
        penDown.subscribe(this.#penUpDown.bind(this))
        movements.subscribe(this.#movement.bind(this))
        // TODO: maybe keep the mode until pen up if it is already active?
        eraseMode.subscribe(e => this.erasing = e)
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
        if (e.isDown) {
            if (this.erasing) {
                this.eraseStroke = { points: [ e.point ] }
                this.eraseStrokeStart.next(e.point)
            } else {
                this.#nextStroke(e.point) // TODO
            }
        } else {
            if (this.erasing) {
                this.eraseStrokeEnd.next(e.point)
                this.eraseStroke = undefined
            } else {
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

    #movement(point: Point) {
        if (this.erasing && this.isPenDown) {
            return this.#erasingMovement(point)
        }

        const stroke = this.#currentStroke()
        if (stroke === undefined) {
            return
        }
        stroke.points.push(point)
        this.strokePoint.next(point)
    }

    #erasingMovement(point: Point) {
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

                if (Drawing.lineIntersects(pt1, pt2, strokePt1, strokePt2)) {
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

    static lineIntersects(line1pt1: Point, line1pt2: Point, line2pt1: Point, line2pt2: Point) {
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
}
