import { BehaviorSubject, ReplaySubject, Subject } from "rxjs"
import { Point } from "../data/Drawing"

export type PenUpDown = {
    isDown: boolean
    point: Point
}

type KeysOfTOnly<T, U> = {
    [P in keyof T]-?: T[P] extends U ? P : never
}[keyof T]
type PointerEventList = KeysOfTOnly<GlobalEventHandlersEventMap, PointerEvent>

export type CanvasRawEvent = { eventName: PointerEventList, event: PointerEvent }

export default class CanvasDom {
    canvas: HTMLCanvasElement
    readonly penDown = new BehaviorSubject<PenUpDown>({ isDown: false, point: [0, 0] })
    readonly movements = new Subject<Point>()
    readonly size = new ReplaySubject<{ width: number, height: number }>(1)

    static rawEventList: ReadonlyArray<PointerEventList> = [
        'gotpointercapture',
        'lostpointercapture',
        'pointercancel',
        'pointerdown',
        'pointerenter',
        'pointerleave',
        'pointermove',
        'pointerout',
        'pointerover',
        'pointerup'
    ]
    readonly rawEvents = new Subject<CanvasRawEvent>()

    constructor() {
        this.canvas = document.createElement('canvas')
        this.canvas.style.flex = '1'
        this.#attachResizeHandlers()
        this.#attachPointerHandlers()
        this.#attachRawEvents()
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

    #attachRawEvents() {
        CanvasDom.rawEventList.forEach(eventName => 
            this.canvas.addEventListener(eventName, e => this.rawEvents.next({ eventName, event: e }))
        )
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
