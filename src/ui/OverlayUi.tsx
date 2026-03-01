import Drawing, { initialZoom, ZoomState } from "../data/Drawing"
import { JSX, render } from 'preact'
import { useEffect, useRef, useReducer, useState } from 'preact/hooks'
import { CanvasRawEvent } from "../dom/CanvasDom"
import { last, merge, Observable } from "rxjs"
import { KeyboardRawEvent } from "../dom/KeyboardHandler"
import Modes from "../data/Modes"
import { Router, Route, route } from 'preact-router'
import { createBrowserHistory, createHashHistory, createMemoryHistory } from "history"
import Options from "./Options"
import { currentTheme, showDebugInfo } from "./theme"
import { Pages, Page } from "../data/Pages"
import CanvasPainter from "../dom/CanvasPainter"

export enum Corner { TopLeft, TopRight, BottomLeft, BottomRight }
export type RepeatedString = [string, number]

export function path(absolute: string) {
    const withLeadingSlash = absolute[0] === '/' ? absolute : `/${absolute}`
    if (window.location.protocol === 'file:') {
        // If the path already has a hash, don't add another one
        return withLeadingSlash.startsWith('#') ? withLeadingSlash : `#${withLeadingSlash}`
    } else {
        return withLeadingSlash
    }
}

export default class OverlayUi {

    overlay: HTMLDivElement
    readonly offset = '2em'

    constructor(
        drawing: Pick<Drawing, 'strokeCount'|'pointCount'|'lastStrokePoints'|'clear'|'zoomState'|'restore'>,
        pages: Parameters<typeof Overlay>[0]["pages"],
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
        this.overlay.style.display = 'flex'

        const usedHistory = window.location.protocol === 'file:' ? createHashHistory() : createBrowserHistory()
        
        // Handle initial route
        let initialPath: string
        if (window.location.protocol === 'file:') {
            // For file:// protocol, get the path from the hash
            initialPath = window.location.hash.substring(1) // Remove the leading #
        } else {
            initialPath = window.location.pathname
        }

        // If there's no path, default to root
        if (!initialPath) {
            usedHistory.replace('/')
            initialPath = '/'
        }

        const pageMatch = initialPath.match(/\/page\/([^\/]+)/)
        if (pageMatch) {
            const pageId = pageMatch[1]  // Get the page ID from the match
            const page = pages.pageList.find(p => p.id === pageId)
            if (page?.savedState) {
                drawing.restore(page.savedState)
            }
            pages.switchActivePage(pageId)
        }
        // Don't modify other paths like /pages or /options - let the router handle them

        render(
            <>
                <Overlay
                    drawing={drawing}
                    pages={pages}
                    modes={modes}
                    rawPointerEvents={rawPointerEvents}
                    rawKeyboardEvents={rawKeyboardEvents}
                    debugEvents={debugEvents}
                    />
                <Router history={usedHistory as any}>
                    <Route path="/options/:page?" component={(p: any) => <Options page={p.page} />} />
                    <Route path="/pages" component={() => <PageList pages={pages} currentPage={pages.current()} onPageSelect={(id) => pages.switchActivePage(id)} />} />
                    <Route path="/page/:id" component={(p: { id: string }) => {
                        // Switch to the page if it's not already active
                        const currentPage = pages.current();
                        if (currentPage.id !== p.id) {
                            pages.switchActivePage(p.id);
                        }
                        return null;  // No UI needed, just handle the routing
                    }} />
                    <Route path="/" component={() => null} />
                </Router>
            </>,
            this.overlay
        )
    }
}

function Overlay(props: {
    drawing: Pick<Drawing, 'strokeCount'|'pointCount'|'lastStrokePoints'|'clear'|'zoomState'>,
    pages: Pages,
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
    const [rawEvents, addRawEvent] = useReducer<Array<RepeatedString|JSX.Element>, CanvasRawEvent|KeyboardRawEvent|string>((acc, e) => {
        if (noMoves && typeof e !== 'string' && e.eventName === 'pointermove') {
            return acc
        }

        const lastItem = acc[acc.length - 1]
        if (typeof e === 'string' && Array.isArray(lastItem) && lastItem[0] === e) {
            return [...acc.slice(0, -1), [e, lastItem[1] + 1]]
        }

        const formatted = (typeof e === 'string' ? [e, 1] as RepeatedString : formatRawEvent(e))

        const events = [...acc, formatted]
        if (events.length > (props.maxEventsOnScreen ?? 10)) {
            events.shift()
        }
        return events
    }, [])
    const [showButtons, setShowButtons] = useState(false)
    const [theme, setTheme] = useState(currentTheme.value)
    const [debugVisible, setDebugVisible] = useState(showDebugInfo.value)

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

        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.key.toLowerCase() === 'b') {
                setShowButtons(prev => !prev)
            }
        }
        document.addEventListener('keydown', handleKeyPress)

        const themeSubscription = currentTheme.subscribe(newTheme => {
            setTheme(newTheme)
        })

        const debugSubscription = showDebugInfo.subscribe(visible => {
            setDebugVisible(visible)
        })

        return () => {
            strokesSub.unsubscribe()
            pointsSub.unsubscribe()
            lastPointsSub.unsubscribe()
            eraseSub.unsubscribe()
            panSub.unsubscribe()
            zoomSub.unsubscribe()
            eventsSub.unsubscribe()
            document.removeEventListener('keydown', handleKeyPress)
            themeSubscription.unsubscribe()
            debugSubscription.unsubscribe()
        }
    }, [])

    return <div style={{ color: theme.textColor }}>
        {debugVisible ?
            <StatusBox
                corner={Corner.BottomRight}
                strokeCount={strokeCount}
                pointCount={pointCount}
                lastStrokePoints={lastStrokePoints}
                eraseMode={eraseMode}
                panMode={panMode}
                zoomState={zoomState}
            />
            : undefined
        }
        <ControlBox corner={Corner.TopLeft} onClear={() => props.drawing.clear()} showButtons={showButtons} />
        {debugVisible && (props.rawPointerEvents !== undefined || props.rawKeyboardEvents !== undefined) ?
            <EventLogBox corner={Corner.BottomLeft} events={rawEvents} noMovesRequested={setNoMoves} /> :
            undefined
        }
    </div>

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
            return <>zoom {twoDecimals(zoom.level)} @ {JSON.stringify(twoDecimals(zoom.offset))}</>
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
        <div>Zoom: {twoDecimals(props.zoomState.level)} at {JSON.stringify(twoDecimals(props.zoomState.offset))}</div>
    </div>
}

function ControlBox(props: { corner: Corner, onClear?: () => void, showButtons: boolean }) {
    return <div style={{ ...cornerStyle(props.corner), display: props.showButtons ? 'block' : 'none' }}>
        <button style={{ pointerEvents: 'auto' }} onClick={props.onClear}>Clear</button>{' '}
        <button style={{ pointerEvents: 'auto' }} onClick={() => route('/options')}>Options</button>{' '}
        <button style={{ pointerEvents: 'auto '}} onClick={() => route('/pages')}>Pages</button>
    </div>
}

function EventLogBox(props: { corner: Corner, events: Array<RepeatedString|JSX.Element>, noMovesRequested: (noMoves: boolean) => void }) {
    const [noMoves, setNoMoves] = useState(true)

    const outputLines = [
        <div key="eventlog">
            Event log: {props.corner === Corner.BottomLeft || props.corner === Corner.BottomRight ? '\u2191' : '\u2193'}{' '}
            <label style={{pointerEvents: 'auto'}}>
                <input type="checkbox" checked={noMoves} onChange={e => { setNoMoves(e.currentTarget.checked); props.noMovesRequested(e.currentTarget.checked) }} />
                no moves
            </label>
        </div>,
        ...props.events.map(e => {
            if (Array.isArray(e)) {
                return <>{e[0]}{e[1] > 1 ? <span style={{display: 'inline-block', marginLeft: '0.5rem', background: '#acf', padding: '0 0.3rem', borderRadius: '7px'}}>{e[1]}x</span> : undefined}</>
            } else {
                return e
            }
        })
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

function twoDecimals<T extends number|number[]>(n: T): T {
    if (Array.isArray(n)) {
        return n.map(num => twoDecimals(num)) as T
    } else if (typeof n === 'number') {
        return Math.floor(n * 100) / 100 as T
    }
    throw new Error("twoDecimals: illegal argument type")
}

function PagePreview({ page, isActive, onClick, pages }: { page: Page, isActive: boolean, onClick: () => void, pages: Pages }) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (ctx && page.savedState) {
            CanvasPainter.renderPreview(ctx, page.savedState, canvas.width, canvas.height);
        }
    }, [page.savedState]);

    const handleDelete = (e: MouseEvent) => {
        e.stopPropagation();  // Prevent triggering the page selection
        if (confirm('Are you sure you want to delete this page?')) {
            const wasCurrentPage = pages.current().id === page.id;
            pages.deletePage(page.id);
            // Only close the panel if we deleted the last page
            if (pages.pageList.length === 1) {
                route('/');
            } else if (wasCurrentPage) {
                // If we deleted the current page, the Pages class will switch to another page
                // We need to update the URL to match
                route(`/page/${pages.current().id}`);
            }
        }
    };

    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                padding: '5px',
                border: `1px solid ${currentTheme.value.defaultStrokeColor}`,
                borderRadius: '3px',
                cursor: 'pointer',
                background: isActive ? `${currentTheme.value.defaultStrokeColor}22` : 'transparent',
                position: 'relative'  // For absolute positioning of delete button
            }}
        >
            <button
                onClick={handleDelete}
                style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    background: 'rgba(255, 0, 0, 0.1)',
                    border: `1px solid ${currentTheme.value.defaultStrokeColor}`,
                    color: currentTheme.value.defaultStrokeColor,
                    cursor: 'pointer',
                    borderRadius: '3px',
                    padding: '2px 5px',
                    fontSize: '10px',
                    zIndex: 1
                }}
            >
                Delete
            </button>
            <canvas
                ref={canvasRef}
                width={150}
                height={100}
                style={{
                    width: '150px',
                    height: '100px',
                    border: `1px solid ${currentTheme.value.defaultStrokeColor}`,
                    borderRadius: '2px'
                }}
            />
            <div
                style={{
                    fontSize: '12px',
                    color: currentTheme.value.defaultStrokeColor,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                }}
            >
                {page.title}
            </div>
        </div>
    );
}

export function PageList({ pages, currentPage, onPageSelect }: { pages: Pages, currentPage: Page | null, onPageSelect: (pageId: string) => void }) {
    // When closing the panel, go back to the current page
    const handleClose = () => {
        if (currentPage) {
            route(`/page/${currentPage.id}`);
        } else {
            route('/');
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                background: currentTheme.value.background,
                border: `1px solid ${currentTheme.value.defaultStrokeColor}`,
                borderRadius: '5px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                width: '80vw',
                height: '80vh',
                pointerEvents: 'auto',
                boxShadow: '0 0 20px rgba(0, 0, 0, 0.2)'
            }}
        >
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingBottom: '10px',
                borderBottom: `1px solid ${currentTheme.value.defaultStrokeColor}`
            }}>
                <span style={{ 
                    color: currentTheme.value.defaultStrokeColor,
                    fontSize: '1.2em',
                    fontWeight: 'bold'
                }}>Pages</span>
                <button 
                    onClick={handleClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: currentTheme.value.defaultStrokeColor,
                        cursor: 'pointer',
                        padding: '5px',
                        fontSize: '1.2em'
                    }}
                >
                    ✕
                </button>
            </div>
            <button
                onClick={() => {
                    pages.addNewPage();
                    // Route to the newly added page, which will be the last one in the list
                    const newPage = pages.pageList[pages.pageList.length - 1];
                    route(`/page/${newPage.id}`);
                }}
                style={{
                    background: currentTheme.value.background,
                    border: `1px solid ${currentTheme.value.defaultStrokeColor}`,
                    color: currentTheme.value.defaultStrokeColor,
                    padding: '10px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    fontSize: '1.1em'
                }}
            >
                Add New Page
            </button>
            <div style={{
                flex: 1,
                overflowY: 'auto',
                paddingRight: '10px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px',
                alignItems: 'start'
            }}>
                {pages.pageList.map(page => (
                    <PagePreview
                        key={page.id}
                        page={page}
                        pages={pages}
                        isActive={page.id === currentPage?.id}
                        onClick={() => {
                            onPageSelect(page.id);
                            route(`/page/${page.id}`);
                        }}
                    />
                ))}
            </div>
        </div>
    );
}
