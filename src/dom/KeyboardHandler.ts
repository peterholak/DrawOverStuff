import { Subject } from "rxjs"

type KeyboardEventList = 'keydown'|'keypress'|'keyup'
export type KeyboardRawEvent = { eventName: KeyboardEventList, event: KeyboardEvent }
export type KeyDownState = { code: string, isDown: boolean }

export default class KeyboardHandler {

    readonly events = new Subject<KeyboardRawEvent>()
    readonly keyDownChanges = new Subject<KeyDownState>()
    keyDown: {[code: string]: boolean} = {}

    constructor() {
        (['keydown', 'keypress', 'keyup'] as const).map(eventName =>
            document.addEventListener(eventName, e => this.events.next({ eventName, event: e }))
        )

        this.#registerDownTracking()
    }

    #registerDownTracking() {
        this.events.subscribe(e => {
            if (e.eventName === 'keydown') {
                if (this.keyDown[e.event.code] !== true) {
                    this.keyDown[e.event.code] = true
                    this.keyDownChanges.next({ code: e.event.code, isDown: true })
                }
            } else if (e.eventName === 'keyup') {
                if (this.keyDown[e.event.code] === true) {
                    this.keyDown[e.event.code] = false
                    this.keyDownChanges.next({ code: e.event.code, isDown: false })
                }
            }
        })
    }
}
