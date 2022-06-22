document.addEventListener('DOMContentLoaded', start)

function start() {
    const canvas = document.createElement('canvas')
    canvas.style.border = '1px solid #000'
    canvas.style.width = '500px'
    canvas.style.height = '500px'
    canvas.width = 500
    canvas.height = 500
    document.body.appendChild(canvas)
    attachDrawingCanvas(canvas)
}

type Stroke = Point[]
type Point = [number, number]

function attachDrawingCanvas(canvas: HTMLCanvasElement) {
    const strokes: Stroke[] = []
    let currentStroke = 0
    let isDown = false

    canvas.addEventListener('pointermove', e => {
        if (e.pointerType === 'pen') {
            canvas.style.cursor = 'crosshair'
        } else {
            canvas.style.cursor = 'default'
        }

        if (isDown) {
            // throttle it to some whatever, optimize straight lines, ...
            strokes[currentStroke] ??= []
            strokes[currentStroke].push([e.x, e.y])
            redraw(strokes, canvas)
        }
    })

    canvas.addEventListener('pointerdown', e => {
        isDown = true
    })

    canvas.addEventListener('pointerup', e => {
        isDown = false
        currentStroke++
    })
}

function redraw(strokes: Stroke[], canvas: HTMLCanvasElement) {
    // console.log(`redraw ${points}`)
    const ctx = canvas.getContext('2d')!
    
    strokes.forEach(s => drawStroke(s, ctx))
}

function drawStroke(stroke: Stroke, ctx: CanvasRenderingContext2D) {
    if (stroke.length === 0) {
        return
    }
    stroke.forEach((pt, index) => {
        if (index === 0) {
            ctx.moveTo(pt[0], pt[1])
        } else {
            ctx.lineTo(pt[0], pt[1])
        }
    })
    ctx.stroke()
}