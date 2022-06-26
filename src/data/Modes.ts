import { BehaviorSubject, filter, Observable } from "rxjs"
import { KeyDownState } from "../dom/KeyboardHandler"

// switch = button switches between pen/eraser, hold = erasing while button is pressed down
export type EraseStyle = 'switch'|'hold'

export default class Modes {
    readonly eraseMode = new BehaviorSubject(false)
    readonly panMode = new BehaviorSubject(false)

    constructor(
        private eraseStyle: EraseStyle,
        private keyDownStates: Observable<KeyDownState>
    ) {
        this.#registerModeSwitches()
    }

    #registerModeSwitches() {
        this.keyDownStates.pipe(filter(key => key.code === 'KeyC')).subscribe(c => {
            this.eraseMode.next(c.isDown)
        })

        this.keyDownStates.pipe(filter(key => key.code === 'KeyA')).subscribe(a => {
            this.panMode.next(a.isDown)
        })
    }
}
