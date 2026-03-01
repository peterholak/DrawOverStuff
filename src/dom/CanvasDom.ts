import { BehaviorSubject, ReplaySubject, Subject } from "rxjs"
import { CanvasPoint, Point } from "../data/Drawing"
import { currentTheme } from "../ui/theme"

export type PenUpDown = {
    isDown: boolean
    canvasPoint: CanvasPoint
}

type KeysOfTOnly<T, U> = {
    [P in keyof T]-?: T[P] extends U ? P : never
}[keyof T]
type PointerEventList = KeysOfTOnly<GlobalEventHandlersEventMap, PointerEvent>

export type CanvasRawEvent = { eventName: PointerEventList, event: PointerEvent }

export default class CanvasDom {
    canvas: HTMLCanvasElement
    cursorDiv: HTMLDivElement|undefined
    readonly penDown = new BehaviorSubject<PenUpDown>({ isDown: false, canvasPoint: [0, 0] as CanvasPoint })
    readonly movements = new Subject<CanvasPoint>()
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

    constructor(
        cursorVisible: BehaviorSubject<boolean>
    ) {
        this.canvas = document.createElement('canvas')
        this.canvas.style.flex = '1'
        this.canvas.style.touchAction = 'none'
        this.canvas.style.background = currentTheme.value.background
        this.canvas.style.cursor = cursorVisible.value ? 'default' : 'none'
        if (currentTheme.value.extraCursor) {
            this.cursorDiv = this.#createCursorDiv()
            this.canvas.appendChild(this.cursorDiv)
        }
        this.#attachResizeHandlers()
        this.#attachPointerHandlers()
        this.#attachRawEvents()

        // Prevent context menu on right click
        this.canvas.addEventListener('contextmenu', e => e.preventDefault())

        // Subscribe to theme changes
        currentTheme.subscribe(theme => {
            this.canvas.style.background = theme.background
            if (this.cursorDiv) {
                this.cursorDiv.style.background = theme.textColor
            }
        })

        // Subscribe to cursor visibility changes
        cursorVisible.subscribe(visible => {
            this.canvas.style.cursor = visible ? 'default' : 'none'
        })
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
        if (this.cursorDiv !== undefined) {
            this.cursorDiv.style.left = `${e.x - this.cursorDiv.clientWidth / 2}px`
            this.cursorDiv.style.top = `${e.y - this.cursorDiv.clientHeight / 2}px`
        }

        this.movements.next([e.x, e.y] as CanvasPoint)
    }

    #onPointerDown(e: PointerEvent) {
        // Ignore right clicks (button 2)
        if (e.button === 2) {
            return;
        }
        this.penDown.next({ isDown: true, canvasPoint: [e.x, e.y] as CanvasPoint })
    }

    #onPointerUp(e: PointerEvent) {
        this.penDown.next({ isDown: false, canvasPoint: [e.x, e.y] as CanvasPoint })
    }

    #createCursorDiv() {
        const div = document.createElement('div')
        div.style.position = 'absolute'
        div.style.boxSizing = 'border-box'
        div.style.width = '2px'
        div.style.height = '2px'
        div.style.margin = '0'
        div.style.padding = '0'
        div.style.background = currentTheme.value.textColor
        div.style.pointerEvents = 'none'
        return div
    }
}
