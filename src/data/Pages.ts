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

    goToNextActivePage() {

    }

    goToPreviousActivePage() {

    }

    current(): Readonly<Page> {
        return this.#current.value
    }

    get currentPageChanges() {
        return this.#current as Observable<Readonly<Page>>
    }

    #newPage() {
        return {
            id: v4(),
            title: 'New Page',
            savedState: undefined,
            lastModified: new Date().getTime()
        }
    }
}
