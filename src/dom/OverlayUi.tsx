import Drawing from "../data/Drawing"
import { render } from 'preact'
import { useEffect, useState } from 'preact/hooks'

export enum Corner { TopLeft, TopRight, BottomLeft, BottomRight }

export default class OverlayUi {

    overlay: HTMLDivElement
    readonly offset = '2em'

    constructor(drawing: Parameters<typeof Overlay>[0]["drawing"]) {
        this.overlay = document.createElement('div')
        this.overlay.style.position = 'fixed'
        this.overlay.style.left = '0'
        this.overlay.style.top = '0'
        this.overlay.style.width = '100%'
        this.overlay.style.height = '100%'
        this.overlay.style.pointerEvents = 'none'

        render(<Overlay drawing={drawing} />, this.overlay)
    }
}

function Overlay(props: { drawing: Pick<Drawing, 'strokeCount'|'pointCount'|'clear'> }) {
    const [strokeCount, setStrokeCount] = useState(0)
    const [pointCount, setPointCount] = useState(0)
    useEffect(() => {
        const strokesSub = props.drawing.strokeCount.subscribe(setStrokeCount)
        const pointsSub = props.drawing.pointCount.subscribe(setPointCount)
        return () => {
            strokesSub.unsubscribe()
            pointsSub.unsubscribe()
        }
    }, [])

    return <>
        <StatusBox strokeCount={strokeCount} pointCount={pointCount} />
        <ControlBox onClear={() => props.drawing.clear()} />
    </>
}

function StatusBox(props: { strokeCount: number, pointCount: number }) {
    return <div style={cornerStyle(Corner.BottomLeft)}>
        <div>Total strokes: {props.strokeCount}</div>
        <div>Total points: {props.pointCount}</div> 
    </div>
}

function ControlBox(props: { onClear?: () => void }) {
    return <div style={cornerStyle(Corner.TopLeft)}>
        <button style={{ pointerEvents: 'auto' }} onClick={props.onClear}>Clear</button>
    </div>
}

function cornerStyle(corner: Corner, offset: string = '2em') {
    const vertical = (corner === Corner.TopLeft || corner === Corner.TopRight) ?
        { top: offset } : { bottom: offset }
    const horizontal = (corner === Corner.TopLeft || corner === Corner.BottomLeft) ?
        { left: offset } : { right: offset }
    return { position: 'absolute', ...horizontal, ...vertical }
}
