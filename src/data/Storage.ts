import Drawing from "./Drawing"
import { Pages } from "./Pages"

const OnePageKey = 'drawoverstuff-onepage'

export default class LocalStorageAutoSave {
    constructor(private drawing: Drawing, private pages: Pages) {
        let stored = window.localStorage.getItem(OnePageKey)
        if (stored !== null) {
            drawing.restore(JSON.parse(stored))
        }
        drawing.documentChanges.subscribe(c => {
            if (drawing.restoreInProgress) {
                return
            }
            this.#savePage()
        })
        pages.currentPageChanges.subscribe(page => {
            
        })
    }

    #savePage() {
        window.localStorage.setItem(OnePageKey, JSON.stringify(this.drawing.serialize()))
    }
}