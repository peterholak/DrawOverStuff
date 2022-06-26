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

    readonly clears = new Subject<void>()

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
            } else {
                this.#nextStroke(e.point) // TODO
            }
        } else {
            const stroke = this.#currentStroke()
            if (stroke !== undefined) {
                this.strokeEnd.next(stroke)
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
        if (this.erasing) {
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
        // TODO: stroke erase
    }

}
