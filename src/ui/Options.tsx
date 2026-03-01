import { route } from "preact-router"
import { useEffect, useRef, useState } from "preact/hooks"
import { drawDebugCanvas } from "./DebugCanvas"
import Dialog, { stylesHelper } from "./Dialog"
import { path } from "./OverlayUi"
import { currentTheme, themes, showDebugInfo } from "./theme"

export type OptionsPage = 'interaction'|'debug'|'theme'

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
                <PageLink now={props.page} to={'theme'}>Theme</PageLink>
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
            case 'theme': return <ThemePage />
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
    const [debugVisible, setDebugVisible] = useState(showDebugInfo.value)

    useEffect(() => {
        if (canvas.current === null) { return }
        const [w, h] = [canvas.current.clientWidth, canvas.current.clientHeight]
        canvas.current.width = w
        canvas.current.height = h
        const ctx = canvas.current.getContext('2d')!
        drawDebugCanvas(ctx, w, h)
    }, [canvas.current])

    return <div>
        <div style={{ marginBottom: '2rem' }}>
            <h2>Debug Settings</h2>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                    type="checkbox"
                    checked={debugVisible}
                    onChange={(e: Event) => {
                        const target = e.target as HTMLInputElement
                        setDebugVisible(target.checked)
                        showDebugInfo.next(target.checked)
                    }}
                />
                Show debug information
            </label>
        </div>
        <div style={{display: 'flex'}}>
            <canvas style={{background: '#fff', flex: 0.5 }} ref={canvas}></canvas>
        </div>
    </div>
}

function ThemePage() {
    const [selectedTheme, setSelectedTheme] = useState(currentTheme.value)

    return <div>
        <h2>Theme Settings</h2>
        <div style={styles.themeGrid}>
            {themes.map(theme => (
                <div
                    key={theme.name}
                    style={{
                        ...styles.themeCard,
                        ...(theme.name === selectedTheme.name ? styles.themeCardSelected : {}),
                        background: theme.background,
                        color: theme.textColor,
                        border: `2px solid ${theme.textColor}`
                    }}
                    onClick={() => {
                        setSelectedTheme(theme)
                        currentTheme.next(theme)
                    }}
                >
                    <h3 style={styles.themeTitle}>{theme.name}</h3>
                    <div style={styles.themePreview}>
                        <div style={{ background: theme.defaultStrokeColor, width: '100%', height: '2px', margin: '4px 0' }} />
                        <div style={{ background: theme.eraseStrokeColor, width: '100%', height: '2px', margin: '4px 0' }} />
                    </div>
                </div>
            ))}
        </div>
    </div>
}

function PageLink(props: { now: OptionsPage, to: OptionsPage, children: any }) {
    const isActive = props.now === props.to
    return <li>
        <a
            href={`/options/${props.to}`}
            style={{ ...styles.pageLink, ...(isActive ? styles.pageLinkActive : {}) }}
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
    },

    themeGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem',
        padding: '1rem'
    },

    themeCard: {
        padding: '1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'transform 0.2s ease'
    },

    themeCardSelected: {
        boxShadow: '0 0 0 2px #000'
    },

    themeTitle: {
        margin: '0 0 1rem 0',
        fontSize: '1.2rem'
    },

    themePreview: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
    }
})