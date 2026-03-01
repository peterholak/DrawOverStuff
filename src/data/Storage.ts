import Drawing from "./Drawing"
import { Pages } from "./Pages"

const PAGES_KEY = 'drawoverstuff-pages'

export default class LocalStorageAutoSave {
    constructor(private drawing: Drawing, private pages: Pages) {
        // Load saved pages
        const storedPages = window.localStorage.getItem(PAGES_KEY)
        if (storedPages !== null) {
            const pageData = JSON.parse(storedPages)
            this.pages.restorePages(pageData)
        }

        // Subscribe to drawing changes to save current page
        drawing.documentChanges.subscribe(() => {
            if (drawing.restoreInProgress) {
                return
            }
            this.#saveCurrentPage()
        })

        // Subscribe to page changes to load the selected page
        pages.currentPageChanges.subscribe(page => {
            if (page.savedState) {
                drawing.restore(page.savedState)
            } else {
                drawing.clear()
            }
        })

        // Subscribe to page list changes to save all pages
        pages.pageListChanges.subscribe(() => {
            this.#savePages()
        })
    }

    #saveCurrentPage() {
        const currentPage = this.pages.current()
        const updatedPage = {
            ...currentPage,
            savedState: this.drawing.serialize(),
            lastModified: new Date().getTime()
        }
        this.pages.updatePage(updatedPage)
    }

    #savePages() {
        window.localStorage.setItem(PAGES_KEY, JSON.stringify(this.pages.pageList))
    }
}