class Calculator {
    constructor(previousOperandTextElement, currentOperandTextElement) {
        this.previousOperandTextElement = previousOperandTextElement
        this.currentOperandTextElement = currentOperandTextElement
        this.clear()
    }

    clear() {
        this.displayValue = '0'
        this.expression = ''
        this.shouldResetScreen = false
        if (this.currentOperandTextElement) {
            this.currentOperandTextElement.style.fontSize = '3rem' // Reset to default CSS value
            this.currentOperandTextElement.style.whiteSpace = 'nowrap'
        }
    }

    delete() {
        if (this.shouldResetScreen) {
            this.clear()
            return
        }
        if (this.displayValue === '0') return
        
        this.displayValue = this.displayValue.toString().slice(0, -1)
        if (this.displayValue === '' || this.displayValue === ' ') {
            this.displayValue = '0'
        }
    }

    appendNumber(number) {
        if (this.shouldResetScreen) {
            this.displayValue = ''
            this.shouldResetScreen = false
        }
        
        if (number === '.') {
            const parts = this.displayValue.split(/[\s×÷+-]/)
            const lastPart = parts[parts.length - 1]
            if (lastPart.includes('.')) return
        }
        
        if (number === '%') {
            if (this.displayValue === '0' || this.displayValue.endsWith('%')) return
            this.displayValue = this.displayValue.toString() + '%'
            return
        }

        if (this.displayValue === '0' && number !== '.') {
            this.displayValue = number.toString()
            return
        }
        this.displayValue = this.displayValue.toString() + number.toString()
    }

    appendParenthesis(parenthesis) {
        if (this.shouldResetScreen) {
            this.displayValue = ''
            this.shouldResetScreen = false
        }

        if (this.displayValue === '0') {
            this.displayValue = parenthesis
        } else {
            const lastChar = this.displayValue.slice(-1)
            if (parenthesis === '(' && !['+', '-', '×', '÷', '(', ' '].includes(lastChar)) {
                this.displayValue += ' ' + parenthesis
            } else {
                this.displayValue += parenthesis
            }
        }
    }

    chooseOperation(operation) {
        if (this.shouldResetScreen) {
            this.shouldResetScreen = false
        }

        const trimmedDisplay = this.displayValue.trim()
        const lastChar = trimmedDisplay[trimmedDisplay.length - 1]

        if (['+', '-', '×', '÷'].includes(lastChar)) {
            this.displayValue = trimmedDisplay.slice(0, -1) + operation
        } else {
            this.displayValue = this.displayValue + ' ' + operation + ' '
        }
    }

    compute() {
        let finalExpression = this.displayValue

        if (finalExpression === '' || finalExpression === '0') return

        let sanitized = finalExpression
            .replace(/([0-9.%])\s*\(/g, '$1 * (')
            .replace(/\)\s*([0-9.])/g, ') * $1')
            .replace(/\)\s*\(/g, ') * (')
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')

        try {
            let openCount = (sanitized.match(/\(/g) || []).length;
            let closeCount = (sanitized.match(/\)/g) || []).length;

            if (openCount > closeCount) {
                const trimmed = sanitized.trim();
                if (trimmed.startsWith('(') && closeCount === 0) {
                    sanitized = sanitized.replace(/^\s*\(/, '');
                } else {
                    while (openCount > closeCount) {
                        sanitized += ')';
                        closeCount++;
                    }
                }
            }

            if (/[^-+*/().0-9\s]/.test(sanitized)) {
                throw new Error("Invalid expression")
            }
            
            const result = new Function(`return ${sanitized}`)()
            
            if (result === Infinity || isNaN(result)) {
                this.displayValue = "Error"
            } else {
                this.displayValue = parseFloat(result.toFixed(10)).toString()
            }
            this.expression = finalExpression
            this.shouldResetScreen = true
        } catch (e) {
            this.displayValue = "Error"
            this.expression = ''
            this.shouldResetScreen = true
        }
    }

    getFormattedDisplay(value) {
        if (value === 'Error') return 'Error'
        const parts = value.split(/([\s×÷+\-()])/g)
        return parts.map(part => {
            if (/[\s×÷+\-()]/.test(part) || part === '') return part
            const isPercent = part.endsWith('%')
            const numberPart = isPercent ? part.slice(0, -1) : part
            const [integer, decimal] = numberPart.split('.')
            const formattedInteger = parseFloat(integer).toLocaleString('en', {
                maximumFractionDigits: 0
            })
            if (formattedInteger === 'NaN') return part
            let result = decimal !== undefined ? `${formattedInteger}.${decimal}` : formattedInteger
            return isPercent ? result + '%' : result
        }).join('')
    }

    updateDisplay() {
        this.currentOperandTextElement.innerText = this.getFormattedDisplay(this.displayValue)
        this.previousOperandTextElement.innerText = this.getFormattedDisplay(this.expression)
        this.adjustDisplayLayout()
    }

    adjustDisplayLayout() {
        const el = this.currentOperandTextElement
        const container = el.parentElement
        const maxFontSize = 3 * 16 // 48px
        const minFontSize = 14 // Readable min size before wrapping

        // Initialize ghost element for measurement if it doesn't exist
        if (!this.ghost) {
            this.ghost = document.createElement('div')
            this.ghost.style.position = 'absolute'
            this.ghost.style.top = '-9999px'
            this.ghost.style.visibility = 'hidden'
            this.ghost.style.fontWeight = '500'
            this.ghost.style.fontFamily = "'Poppins', sans-serif"
            this.ghost.style.padding = '0 5px'
            document.body.appendChild(this.ghost)
        }

        // Configure ghost to measure ideal width at max font size
        this.ghost.style.fontSize = maxFontSize + 'px'
        this.ghost.style.whiteSpace = 'nowrap'
        this.ghost.innerText = el.innerText

        // Calculate available width inside the text element
        // Use clientWidth to account for padding, minus a small safety buffer
        const availableWidth = el.clientWidth - 10 
        const contentWidth = this.ghost.scrollWidth

        let newSize = maxFontSize
        let shouldWrap = false

        if (contentWidth > availableWidth) {
            // Calculate ratio to fit content within available width
            const ratio = availableWidth / contentWidth
            newSize = Math.floor(maxFontSize * ratio)

            if (newSize < minFontSize) {
                newSize = minFontSize
                shouldWrap = true
            }
        }

        // Apply calculated styles
        el.style.fontSize = newSize + 'px'
        
        if (shouldWrap) {
            el.style.whiteSpace = 'pre-wrap' // Allows wrapping
            el.style.wordBreak = 'break-all'
        } else {
            el.style.whiteSpace = 'nowrap'
            el.style.wordBreak = 'normal'
        }
    }
}


// DOM Elements
const numberButtons = document.querySelectorAll('[data-number]')
const operationButtons = document.querySelectorAll('[data-operation]')
const parenthesisButtons = document.querySelectorAll('[data-parenthesis]')
const equalsButton = document.querySelector('[data-action="equals"]')
const deleteButton = document.querySelector('[data-action="delete"]')
const clearButton = document.querySelector('[data-action="clear"]')
const previousOperandTextElement = document.querySelector('[data-previous-operand]')
const currentOperandTextElement = document.querySelector('[data-current-operand]')

// Initialize Calculator
const calculator = new Calculator(previousOperandTextElement, currentOperandTextElement)

// Event Listeners
numberButtons.forEach(button => {
    button.addEventListener('click', () => {
        calculator.appendNumber(button.innerText)
        calculator.updateDisplay()
    })
})

operationButtons.forEach(button => {
    button.addEventListener('click', () => {
        calculator.chooseOperation(button.innerText)
        calculator.updateDisplay()
    })
})

parenthesisButtons.forEach(button => {
    button.addEventListener('click', () => {
        calculator.appendParenthesis(button.innerText)
        calculator.updateDisplay()
    })
})

equalsButton.addEventListener('click', button => {
    calculator.compute()
    calculator.updateDisplay()
})

clearButton.addEventListener('click', button => {
    calculator.clear()
    calculator.updateDisplay()
})

deleteButton.addEventListener('click', button => {
    calculator.delete()
    calculator.updateDisplay()
})
