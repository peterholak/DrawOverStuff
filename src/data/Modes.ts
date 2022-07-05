import { BehaviorSubject, filter, Observable, Subject } from "rxjs"
import { KeyDownState } from "../dom/KeyboardHandler"

// switch = button switches between pen/eraser, hold = erasing while button is pressed down
export type EraseStyle = 'switch'|'hold'

export type ZoomCommand = 'in'|'out'|'reset'
export type PanCommand = { direction: 'left'|'right'|'up'|'down', max?: boolean }

export default class Modes {
    readonly eraseMode = new BehaviorSubject(false)
    readonly panMode = new BehaviorSubject(false)
    // TODO: not sure if this is the best place for this, or maybe just rename this class?
    // TODO: maybe organize state better in general
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
