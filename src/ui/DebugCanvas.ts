export function drawDebugCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
    let counter = 0
    const padding = 10
    ctx.font = '1rem monospace'
    ctx.textBaseline = 'top'
   
    const lineHeight = ctx.measureText('I').fontBoundingBoxDescent * 1.5
    
    drawLine('1w solid zigzag line', (x, y, w, h) => {
        ctx.beginPath()
        const zigWidth = 25
        let posX = 0
        ctx.moveTo(x + posX, y)
        while (posX + zigWidth < w) {
            if (posX % (zigWidth*2) === 0) {
                ctx.lineTo(x + posX + zigWidth, y + h)
            } else {
                ctx.lineTo(x + posX + zigWidth, y)
            }
            posX += zigWidth
        }
        ctx.stroke()
    })

    drawLine('stroke after each', (x, y, w, h) => {
        ctx.beginPath()
        const zigWidth = 25
        let posX = 0
        ctx.moveTo(x + posX, y)
        while (posX + zigWidth < w) {
            if (posX % (zigWidth*2) === 0) {
                ctx.lineTo(x + posX + zigWidth, y + h)
                ctx.stroke()
            } else {
                ctx.lineTo(x + posX + zigWidth, y)
                ctx.stroke()
            }
            posX += zigWidth
        }
    })

    drawLine('beginPath after each', (x, y, w, h) => {
        const zigWidth = 25
        let posX = 0
        while (posX + zigWidth < w) {
            if (posX % (zigWidth*2) === 0) {
                ctx.beginPath()
                ctx.moveTo(x + posX, y)
                ctx.lineTo(x + posX + zigWidth, y + h)
                ctx.stroke()
            } else {
                ctx.beginPath()
                ctx.moveTo(x + posX, y + h)
                ctx.lineTo(x + posX + zigWidth, y)
                ctx.stroke()
            }
            posX += zigWidth
        }
    })

    drawLine('5w round join solid line', (x, y, w, h) => {
        ctx.lineWidth = 5
        ctx.lineJoin = 'round'
        ctx.beginPath()
        const zigWidth = 25
        let posX = 0
        ctx.moveTo(x + posX, y)
        while (posX + zigWidth < w) {
            if (posX % (zigWidth*2) === 0) {
                ctx.lineTo(x + posX + zigWidth, y + h)
            } else {
                ctx.lineTo(x + posX + zigWidth, y)
            }
            posX += zigWidth
        }
        ctx.stroke()
    })

    drawLine('5w individual segments', (x, y, w, h) => {
        const zigWidth = 25
        let posX = 0
        while (posX + zigWidth < w) {
            if (posX % (zigWidth*2) === 0) {
                ctx.beginPath()
                ctx.moveTo(x + posX, y)
                ctx.lineTo(x + posX + zigWidth, y + h)
                ctx.stroke()
            } else {
                ctx.beginPath()
                ctx.moveTo(x + posX, y + h)
                ctx.lineTo(x + posX + zigWidth, y)
                ctx.stroke()
            }
            posX += zigWidth
        }
    })

    function drawLine(text: string, f: (x: number, y: number, w: number, h: number) => void = () => {}) {
        const offsetY = padding + counter * (lineHeight + padding * 3)
        ctx.fillText(text, padding, offsetY)
        const offsetX = (padding * 3) + ctx.measureText(text).width
        f(offsetX, offsetY, width - offsetX - padding, lineHeight)
        counter++
    }
}
