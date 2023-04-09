import { JSX } from 'preact'
import { useEffect, useState } from 'preact/hooks'
import { Page, PageList, Pages } from '../data/Pages'
import { stylesHelper } from './Dialog'
import { path } from './OverlayUi'

export default function PageListUi(props: { pages: Pages }) {
    const [currentPage, setCurrentPage] = useState<Readonly<Page>>()
    const [pageList, setPageList] = useState<PageList>([])
    useEffect(() => {
        const subscriptions = [
            props.pages.pageListChanges.subscribe(setPageList),
            props.pages.currentPageChanges.subscribe(setCurrentPage)
        ]

        return () => {
            subscriptions.forEach(s => s.unsubscribe())
        }
    }, [props.pages])

    return <div style={styles.pageList}>
        <div>
            <a href={path('/')}>[X]</a> {/* todo: just pop history stack instead */}
            Pages
            <button onClick={() => props.pages.addNewPage()}>Add page</button>
        </div>
        <div style={styles.scrollingPageList}>
            {pageList.map(p => <PageItemUi
                key={p.id}
                page={p} 
                active={p.id === currentPage?.id}
                onClick={() => props.pages.switchActivePage(p.id)}
                />
            )}
        </div>
    </div>
}

function PageItemUi(props: { page: Page, active: boolean, onClick?: () => void }) {
    return <div
        style={{...styles.pageItemBox, ...(props.active ? styles.pageItemBoxActive : undefined)}}
        onClick={props.onClick}
        >
        <h1 style={styles.pageItemTitle}>{props.page.title}</h1>
        {props.page.id}
    </div>
}

const styles = stylesHelper({
    pageList: {
        pointerEvents: 'auto',
        height: '100vh',
        width: '15rem',
        background: '#fff',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column'
    },

    scrollingPageList: {
        overflowY: 'auto'
    },

    pageItemBox: {
        border: '1px solid #ccc',
        margin: '1rem',
        padding: '0.5rem',
        cursor: 'pointer'
    },

    pageItemBoxActive: {
        background: '#eee'
    },

    pageItemTitle: {
        fontFamily: 'sans',
        fontSize: '14pt',
        margin: 0
    }
})