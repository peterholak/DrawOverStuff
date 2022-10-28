import { JSX } from 'preact'
import { stylesHelper } from './Dialog'

export default function PageList() {
    return <div style={styles.pageList}>
        PageList
    </div>
}

const styles = stylesHelper({
    pageList: {
        height: '100vh',
        width: '15rem',
        background: '#fff',
        zIndex: 1
    }
})