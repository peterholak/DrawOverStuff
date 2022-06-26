import { Subject } from "rxjs"

type KeyboardEventList = 'keydown'|'keypress'|'keyup'
export type KeyboardRawEvent = { eventName: KeyboardEventList, event: KeyboardEvent }

export default class KeyboardHandler {

    readonly events = new Subject<KeyboardRawEvent>()

    constructor() {
        (['keydown', 'keypress', 'keyup'] as const).map(eventName =>
            document.addEventListener(eventName, e => this.events.next({ eventName, event: e }))
        )
        document.addEventListener('scroll', e => alert('scroll'))
    }
}
