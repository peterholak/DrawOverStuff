import { BehaviorSubject } from "rxjs"

export type Theme = {
    name: string
    background: string
    defaultStrokeColor: string
    eraseStrokeColor: string
    textColor: string
    extraCursor: boolean
}

export const lightTheme: Theme = {
    name: 'Light',
    background: '#fff',
    defaultStrokeColor: '#000',
    eraseStrokeColor: '#eee',
    textColor: '#000',
    extraCursor: false,
}

export const darkTheme: Theme = {
    name: 'Dark',
    background: '#222',
    defaultStrokeColor: '#fff',
    eraseStrokeColor: '#333',
    textColor: '#fff',
    extraCursor: true,
}

export const sepiaTone: Theme = {
    name: 'Sepia',
    background: '#f4ecd8',
    defaultStrokeColor: '#5b4636',
    eraseStrokeColor: '#e8d5b7',
    textColor: '#5b4636',
    extraCursor: false,
}

export const nightBlue: Theme = {
    name: 'Night Blue',
    background: '#0a192f',
    defaultStrokeColor: '#64ffda',
    eraseStrokeColor: '#172a45',
    textColor: '#64ffda',
    extraCursor: true,
}

export const themes: Theme[] = [lightTheme, darkTheme, sepiaTone, nightBlue]

// Load the saved theme or use dark theme as default
const savedThemeName = localStorage.getItem('selectedTheme')
const initialTheme = savedThemeName 
    ? themes.find(t => t.name === savedThemeName) ?? darkTheme 
    : darkTheme

export const currentTheme = new BehaviorSubject<Theme>(initialTheme)

// Save theme whenever it changes
currentTheme.subscribe(theme => {
    localStorage.setItem('selectedTheme', theme.name)
})

// Debug info visibility is a separate user preference, off by default
export const showDebugInfo = new BehaviorSubject<boolean>(false)
