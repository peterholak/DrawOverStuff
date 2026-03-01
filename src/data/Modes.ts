import { BehaviorSubject, filter, Observable, Subject } from "rxjs"
import { KeyDownState } from "../dom/KeyboardHandler"
import { playLayer1Tone, playLayer2Tone } from "../audio/Tones"

// switch = button switches between pen/eraser, hold = erasing while button is pressed down
export type EraseStyle = 'switch'|'hold'

export type ZoomCommand = 'in'|'out'|'reset'
export type PanCommand = { direction: 'left'|'right'|'up'|'down', max?: boolean }

export default class Modes {
    readonly eraseMode = new BehaviorSubject(false)
    readonly panMode = new BehaviorSubject(false)
    readonly cursorVisible = new BehaviorSubject(false)
    readonly layer2Active = new BehaviorSubject(false)
    readonly nextPage = new Subject<void>()
    readonly previousPage = new Subject<void>()
    readonly zoomCommand = new Subject<ZoomCommand>()
    readonly panCommand = new Subject<PanCommand>()

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

        // Toggle between layers with L key
        this.keyDownStates.pipe(
            filter(key => key.code === 'KeyL' && key.isDown)
        ).subscribe(() => {
            const newLayer2State = !this.layer2Active.value;
            this.layer2Active.next(newLayer2State);
            // Play appropriate tone for the layer we switched to
            if (newLayer2State) {
                playLayer2Tone();
            } else {
                playLayer1Tone();
            }
        })

        // Toggle cursor visibility with H key
        this.keyDownStates.pipe(
            filter(key => key.code === 'KeyH' && key.isDown)
        ).subscribe(() => {
            this.cursorVisible.next(!this.cursorVisible.value)
        })

        // Page navigation with PageUp/PageDown
        this.keyDownStates.pipe(
            filter(key => key.code === 'PageUp' && key.isDown)
        ).subscribe(() => {
            this.previousPage.next()
        })

        this.keyDownStates.pipe(
            filter(key => key.code === 'PageDown' && key.isDown)
        ).subscribe(() => {
            this.nextPage.next()
        })

        const zoomKeys: {[code: string]: ZoomCommand} = {
            KeyQ: 'in',
            KeyW: 'out',
            KeyE: 'reset'
        }
        this.keyDownStates.pipe(
            filter(key => key.isDown && Object.keys(zoomKeys).includes(key.code))
        ).subscribe(key => {
            this.zoomCommand.next(zoomKeys[key.code])
        })

        const panKeys: {[code: string]: PanCommand["direction"]} = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right'
        }
        this.keyDownStates.pipe(
            filter(key => key.isDown && Object.keys(panKeys).includes(key.code))
        ).subscribe(key => {
            this.panCommand.next({ direction: panKeys[key.code] })
        })
    }
}
