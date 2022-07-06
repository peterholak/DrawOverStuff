import type { JSX } from "preact/jsx-runtime"
import { path } from "./OverlayUi"

export default function Dialog(props: { children: any, style?: JSX.CSSProperties }) {
    return <div style={{...styles.dialogBackground, ...props.style}}>
        <a href={path('/')} style={styles.closeButton}>✖</a>
        {props.children}
    </div>
}

const styles = stylesHelper({
    dialogBackground: {
        border: '1px solid #ccc',
        flex: 1,
        margin: '5rem',
        zIndex: 1,
        background: 'rgba(200, 200, 200, 0.3)',
        backdropFilter: 'blur(6px)',
        boxShadow: '2px 2px 10px #aaa',
        padding: '2rem',
        pointerEvents: 'auto',
        position: 'relative'
    },

    closeButton: {
        display: 'block',
        position: 'absolute',
        left: '1rem',
        top: '1rem',
        textDecoration: 'none',
        color: '#000'
    }
})

export function stylesHelper<T>(s: {[P in keyof T]: JSX.CSSProperties}) { return s }
