import { BehaviorSubject, ReplaySubject, Subject } from "rxjs"
import { Point } from "../data/Drawing"

export type PenUpDown = {
    isDown: boolean
    point: Point
}

export default class Canvas {
    canvas: HTMLCanvasElement
    readonly penDown = new BehaviorSubject<PenUpDown>({ isDown: false, point: [0, 0] })
    readonly movements = new Subject<Point>()
    readonly size = new ReplaySubject<{ width: number, height: number }>(1)

    constructor() {
        this.canvas = document.createElement('canvas')
        this.canvas.style.flex = '1'
        this.#attachResizeHandlers()
        this.#attachPointerHandlers()
    }

    #attachResizeHandlers() {
        this.canvas.width = window.innerWidth
        this.canvas.height = window.innerHeight
        this.size.next({ width: this.canvas.width, height: this.canvas.height })
        window.addEventListener('resize', () => {
            this.canvas.width = window.innerWidth
            this.canvas.height = window.innerHeight
            this.size.next({ width: this.canvas.width, height: this.canvas.height })
        })
    }

    #attachPointerHandlers() {
        this.canvas.addEventListener('pointermove', this.#onPointerMove.bind(this))
        this.canvas.addEventListener('pointerdown', this.#onPointerDown.bind(this))
        this.canvas.addEventListener('pointerup', this.#onPointerUp.bind(this))
        this.canvas.addEventListener('pointerleave', this.#onPointerUp.bind(this))
    }

    #onPointerMove(e: PointerEvent) {
        // TODO: only on pointerover?
        if (e.pointerType === 'pen') {
            this.canvas.style.cursor = 'crosshair'
        } else {
            this.canvas.style.cursor = 'default'
        }

        this.movements.next([e.x, e.y])
    }

    #onPointerDown(e: PointerEvent) {
        this.penDown.next({ isDown: true, point: [e.x, e.y] })
    }

    #onPointerUp(e: PointerEvent) {
        this.penDown.next({ isDown: false, point: [e.x, e.y] })
    }
}
