import Drawing, { initialZoom, ZoomState } from "../data/Drawing"
import { JSX, render } from 'preact'
import { useEffect, useReducer, useState } from 'preact/hooks'
import { CanvasRawEvent } from "./CanvasDom"
import { merge, Observable } from "rxjs"
import { KeyboardRawEvent } from "./KeyboardHandler"
import Modes from "../data/Modes"

export enum Corner { TopLeft, TopRight, BottomLeft, BottomRight }

export default class OverlayUi {

    overlay: HTMLDivElement
    readonly offset = '2em'

    constructor(
        drawing: Parameters<typeof Overlay>[0]["drawing"],
        modes: Parameters<typeof Overlay>[0]["modes"],
        rawPointerEvents?: Observable<CanvasRawEvent>,
        rawKeyboardEvents?: Observable<KeyboardRawEvent>,
        debugEvents?: Observable<string>
    ) {
        this.overlay = document.createElement('div')
        this.overlay.style.position = 'fixed'
        this.overlay.style.left = '0'
        this.overlay.style.top = '0'
        this.overlay.style.width = '100%'
        this.overlay.style.height = '100%'
        this.overlay.style.pointerEvents = 'none'

        render(<Overlay
            drawing={drawing}
            modes={modes}
            rawPointerEvents={rawPointerEvents}
            rawKeyboardEvents={rawKeyboardEvents}
            debugEvents={debugEvents}
            />, this.overlay)
    }
}

function Overlay(props: {
    drawing: Pick<Drawing, 'strokeCount'|'pointCount'|'lastStrokePoints'|'clear'|'zoomState'>,
    modes: Pick<Modes, 'eraseMode'|'panMode'>,
    rawPointerEvents?: Observable<CanvasRawEvent>,
    rawKeyboardEvents?: Observable<KeyboardRawEvent>,
    debugEvents?: Observable<string>,
    maxEventsOnScreen?: number
}) {
    const [strokeCount, setStrokeCount] = useState(0)
    const [pointCount, setPointCount] = useState(0)
    const [lastStrokePoints, setLastStrokePoints] = useState(0)
    const [eraseMode, setEraseMode] = useState(false)
    const [panMode, setPanMode] = useState(false)
    const [noMoves, setNoMoves] = useState(true)
    const [zoomState, setZoomState] = useState(initialZoom)
    const [rawEvents, addRawEvent] = useReducer<Array<string|JSX.Element>, CanvasRawEvent|KeyboardRawEvent|string>((acc, e) => {
        if (noMoves && typeof e !== 'string' && e.eventName === 'pointermove') {
            return acc
        }

        const formatted = (typeof e === 'string' ? e : formatRawEvent(e))

        const events = [...acc, formatted]
        if (events.length > (props.maxEventsOnScreen ?? 10)) {
            events.shift()
        }
        return events
    }, [])
    useEffect(() => {
        const strokesSub = props.drawing.strokeCount.subscribe(setStrokeCount)
        const pointsSub = props.drawing.pointCount.subscribe(setPointCount)
        const lastPointsSub = props.drawing.lastStrokePoints.subscribe(setLastStrokePoints)
        const eraseSub = props.modes.eraseMode.subscribe(setEraseMode)
        const panSub = props.modes.panMode.subscribe(setPanMode)
        const zoomSub = props.drawing.zoomState.subscribe(setZoomState)
        const eventsSub = merge(...[
            props.rawPointerEvents,
            props.rawKeyboardEvents,
            props.debugEvents
        ].filter(o => o !== undefined)).subscribe(addRawEvent)

        return () => {
            strokesSub.unsubscribe()
            pointsSub.unsubscribe()
            lastPointsSub.unsubscribe()
            eraseSub.unsubscribe()
            panSub.unsubscribe()
            zoomSub.unsubscribe()
            eventsSub.unsubscribe()
        }
    }, [])

    return <>
        <StatusBox
            corner={Corner.BottomRight}
            strokeCount={strokeCount}
            pointCount={pointCount}
            lastStrokePoints={lastStrokePoints}
            eraseMode={eraseMode}
            panMode={panMode}
            zoomState={zoomState}
        />
        <ControlBox corner={Corner.TopLeft} onClear={() => props.drawing.clear()} />
        {props.rawPointerEvents !== undefined || props.rawKeyboardEvents !== undefined ?
            <EventLogBox corner={Corner.BottomLeft} events={rawEvents} noMovesRequested={setNoMoves} /> :
            undefined
        }
    </>

    function formatRawEvent(raw: CanvasRawEvent|KeyboardRawEvent|ZoomState) {
        if ((raw as any).event !== undefined) {
            const e = raw as CanvasRawEvent|KeyboardRawEvent
            if (e.event instanceof PointerEvent) {
                return <>
                    {e.eventName}: {Math.floor(e.event.x)}, {Math.floor(e.event.y)}{' '}
                    <strong>{e.event.button !== -1 ? e.event.button : ''}</strong>{' '}
                    <small>{e.event.pointerType} {e.event.pointerId}</small></>
            } else if (e.event instanceof KeyboardEvent) {
                return <>{e.eventName} <strong>{e.event.key}</strong> <small>{e.event.code}</small></>
            } else {
                return <>{e.eventName}: unsupported event</>
            }
        } else if (typeof (raw as any).level === 'number') {
            const zoom = raw as ZoomState
            return <>zoom {Math.floor(zoom.level * 100) / 100} @ {JSON.stringify(zoom.offset)}</>
        }
        return <>unsupported raw event</>
    }
}

function StatusBox(props: {
    corner: Corner,
    strokeCount: number,
    pointCount: number,
    lastStrokePoints: number,
    eraseMode: boolean,
    panMode: boolean,
    zoomState: ZoomState
}) {
    return <div style={cornerStyle(props.corner)}>
        <div>Total strokes: {props.strokeCount}</div>
        <div>Total points: {props.pointCount}</div>
        <div>Last stroke points: {props.lastStrokePoints}</div>
        <div>Erase mode: {props.eraseMode ? 'true' : 'false'}</div>
        <div>Pan mode: {props.panMode ? 'true' : 'false'}</div>
        <div>Zoom: {Math.floor(props.zoomState.level * 100) / 100} at {JSON.stringify(props.zoomState.offset)}</div>
    </div>
}

function ControlBox(props: { corner: Corner, onClear?: () => void }) {
    return <div style={cornerStyle(props.corner)}>
        <button style={{ pointerEvents: 'auto' }} onClick={props.onClear}>Clear</button>
    </div>
}

function EventLogBox(props: { corner: Corner, events: Array<string|JSX.Element>, noMovesRequested: (noMoves: boolean) => void }) {
    const [noMoves, setNoMoves] = useState(true)

    const outputLines = [
        <div key="eventlog">
            Event log: {props.corner === Corner.BottomLeft || props.corner === Corner.BottomRight ? '\u2191' : '\u2193'}{' '}
            <label style={{pointerEvents: 'auto'}}>
                <input type="checkbox" checked={noMoves} onChange={e => { setNoMoves(e.currentTarget.checked); props.noMovesRequested(e.currentTarget.checked) }} />
                no moves
            </label>
        </div>,
        ...props.events
    ]
    if (props.corner === Corner.BottomLeft || props.corner === Corner.BottomRight) {
        outputLines.reverse()
    }
    return <div style={cornerStyle(props.corner)}>
        {outputLines.map(line => <div key={line}>{line}</div>)}
    </div>
}

function cornerStyle(corner: Corner, offset: string = '2em') {
    const vertical = (corner === Corner.TopLeft || corner === Corner.TopRight) ?
        { top: offset } : { bottom: offset }
    const horizontal = (corner === Corner.TopLeft || corner === Corner.BottomLeft) ?
        { left: offset } : { right: offset }
    return { position: 'absolute', ...horizontal, ...vertical }
}
