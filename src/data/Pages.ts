import { SerializedDrawing } from "./Drawing"
import { v4 } from 'uuid'
import { BehaviorSubject, Observable, Subject } from "rxjs"

export type Page = {
    id: string
    title: string
    savedState: SerializedDrawing|undefined
    lastModified: number
}

export type PageList = ReadonlyArray<Readonly<Page>>

export class Pages {
    readonly #pages = new BehaviorSubject<Page[]>([this.#newPage()])
    readonly #current = new BehaviorSubject<Page>(this.#pages.value[0])
    readonly errors = new Subject<string>()
    history: string[] = []

    get pageList(): ReadonlyArray<Readonly<Page>> {
        return this.#pages.value
    }

    get pageListChanges() {
        return this.#pages as Observable<PageList>
    }

    addNewPage() {
        this.#pages.next([...this.#pages.value, this.#newPage()])
    }

    switchActivePage(pageId: string) {
        const page = this.pageList.find(p => p.id === pageId)
        if (page === undefined) {
            this.errors.next(`no page has id ${pageId}`)
            return
        }
        this.#current.next(page)
    }

    updatePage(updatedPage: Page) {
        const index = this.#pages.value.findIndex(p => p.id === updatedPage.id)
        if (index === -1) {
            this.errors.next(`no page has id ${updatedPage.id}`)
            return
        }
        const newPages = [...this.#pages.value]
        newPages[index] = updatedPage
        this.#pages.next(newPages)
        
        // If this was the current page, update the current page reference
        if (this.#current.value.id === updatedPage.id) {
            this.#current.next(updatedPage)
        }
    }

    restorePages(pages: Page[]) {
        if (!Array.isArray(pages) || pages.length === 0) {
            return
        }
        // Update titles to use first segment of UUID
        const updatedPages = pages.map(page => ({
            ...page,
            title: page.id.split('-')[0]
        }))
        this.#pages.next(updatedPages)
        this.#current.next(updatedPages[0])
    }

    goToNextActivePage() {
        const currentIndex = this.#pages.value.findIndex(p => p.id === this.#current.value.id)
        if (currentIndex === -1 || currentIndex === this.#pages.value.length - 1) {
            return
        }
        this.#current.next(this.#pages.value[currentIndex + 1])
    }

    goToPreviousActivePage() {
        const currentIndex = this.#pages.value.findIndex(p => p.id === this.#current.value.id)
        if (currentIndex <= 0) {
            return
        }
        this.#current.next(this.#pages.value[currentIndex - 1])
    }

    deletePage(pageId: string) {
        const index = this.#pages.value.findIndex(p => p.id === pageId)
        if (index === -1) {
            this.errors.next(`no page has id ${pageId}`)
            return
        }

        // Don't allow deleting the last page
        if (this.#pages.value.length === 1) {
            this.errors.next('cannot delete the last page')
            return
        }

        const newPages = this.#pages.value.filter(p => p.id !== pageId)
        this.#pages.next(newPages)

        // If we deleted the current page, switch to the previous page (or the first page if we deleted the first one)
        if (this.#current.value.id === pageId) {
            const newCurrentIndex = Math.max(0, index - 1)
            this.#current.next(newPages[newCurrentIndex])
        }
    }

    current(): Readonly<Page> {
        return this.#current.value
    }

    get currentPageChanges() {
        return this.#current as Observable<Readonly<Page>>
    }

    #newPage() {
        const id = v4();
        return {
            id,
            title: id.split('-')[0],  // Get first segment of UUID
            savedState: undefined,
            lastModified: new Date().getTime()
        }
    }
}
