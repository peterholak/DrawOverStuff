import { route } from "preact-router"
import { useEffect, useRef } from "preact/hooks"
import { drawDebugCanvas } from "./DebugCanvas"
import Dialog, { stylesHelper } from "./Dialog"
import { path } from "./OverlayUi"

type OptionsPage = 'interaction'|'debug'

export default function Options(props: { page: OptionsPage|'' }) {
    useEffect(() => {
        if (props.page as any === '') {
            route('/options/interaction', true)
        }
    }, [props.page])
    if (props.page === '') {
        return null
    }
    
    return <Dialog style={{ display: 'flex', flexDirection: 'row' }}>
        <div style={{ flex: 0.2, maxWidth: '10rem', borderRight: '1px solid #bbb', paddingRight: '1rem' }}>
            <ul style={{ padding: 0, listStyle: 'none' }}>
                <PageLink now={props.page} to={'interaction'}>Interaction</PageLink>
                <PageLink now={props.page} to={'debug'}>Debug</PageLink>
            </ul>
        </div>
        <div style={styles.page}>
            {renderPage(props.page)}
        </div>
    </Dialog>

    function renderPage(page: OptionsPage) {
        switch (page) {
            case 'debug': return <DebugPage />
            case 'interaction': return <InteractionPage />
        }
        return undefined
    }
}

function InteractionPage() {
    return <div>

    </div>
}

function DebugPage() {
    const canvas = useRef<HTMLCanvasElement>(null)
    useEffect(() => {
        if (canvas.current === null) { return }
        const [w, h] = [canvas.current.clientWidth, canvas.current.clientHeight]
        canvas.current.width = w
        canvas.current.height = h
        //canvas.current.attributes.setNamedItem('height', canvas.current.height)
        const ctx = canvas.current.getContext('2d')!
        drawDebugCanvas(ctx, w, h)
    }, [canvas.current])
    return <div style={{display: 'flex'}}>
        <canvas style={{background: '#fff', flex: 0.5 }} ref={canvas}></canvas>
    </div>
}

function PageLink(props: { now: OptionsPage, to: OptionsPage, children: any }) {
    return <li>
        <a
            style={{...styles.pageLink, ...(props.now === props.to ? styles.pageLinkActive : undefined)}}
            href={optionsPagePath(props.to)}
        >
            {props.children}
        </a>
    </li>
}

function optionsPagePath(page: OptionsPage) {
    return path(`/options/${page}`)
}

const styles = stylesHelper({
    pageLink: {
        color: '#000',
        textDecoration: 'none',
        display: 'block',
        padding: '0.5rem',
        textAlign: 'center',
        background: '#ddc',
        border: '1px solid #bbb',
        marginBottom: '1rem'
    },

    pageLinkActive: {
        background: '#ccd'
    },

    page: {
        padding: '1rem',
        marginBottom: '10rem',
        flex: 1
    }
})