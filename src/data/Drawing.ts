import { combineLatest, map, Observable, Subject } from "rxjs"
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
    isPenDown = false

    readonly strokeStart = new Subject<Readonly<Stroke>>()
    readonly strokeEnd = new Subject<Readonly<Stroke>>()
    readonly strokePoint = new Subject<Point>()

    readonly clears = new Subject<void>()

    readonly strokeCount = combineLatest([this.clears, this.strokeEnd]).pipe(
        map(() => this.strokes.length)
    )
    readonly pointCount = combineLatest([this.clears, this.strokeEnd]).pipe(
        map(() => this.strokes.reduce((acc, s) => acc + s.points.length, 0))
    )

    constructor(
        penDown: Observable<PenUpDown>,
        movements: Observable<Point>
    ) {
        penDown.subscribe(this.#penUpDown.bind(this))
        movements.subscribe(this.#movement.bind(this))
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
            this.#nextStroke(e.point) // TODO
        } else {
            const stroke = this.#currentStroke()
            if (stroke !== undefined) {
                this.strokeEnd.next(stroke)
            }
        }
        this.isPenDown = e.isDown
    }

    #currentStroke() {
        if (!this.isPenDown || this.strokes.length === undefined) {
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
        const stroke = this.#currentStroke()
        if (stroke === undefined) {
            return
        }
        stroke.points.push(point)
        this.strokePoint.next(point)
    }

}
