/**
 * Calculator Configuration & Constants
 */
const CONFIG = {
    DISPLAY: {
        DEFAULT_FONT_SIZE_PX: 48,
        MIN_FONT_SIZE_PX: 14,
        PADDING_BUFFER_PX: 10,
        RESULT_PRECISION: 10,
    },
    OPERATORS: ['+', '-', '×', '÷'],
    OPERATOR_MAP: { '×': '*', '÷': '/' },
    VALID_CHARS: /^[0-9.+\-*/%() ]+$/,
}

class Calculator {
    constructor(previousOperandElement, currentOperandElement) {
        this.previousOperandElement = previousOperandElement
        this.currentOperandElement = currentOperandElement
        this.ghostElement = null
        this.clear()
    }

    /**
     * Reset calculator state
     */
    clear() {
        this.currentValue = '0'
        this.previousExpression = ''
        this.shouldResetScreen = false
        this._lastMeasuredText = null

        if (this.currentOperandElement) {
            this.currentOperandElement.style.fontSize = `${CONFIG.DISPLAY.DEFAULT_FONT_SIZE_PX}px`
            this.currentOperandElement.style.whiteSpace = 'nowrap'
        }
    }

    /**
     * Remove the last character from current value
     */
    delete() {
        if (this.shouldResetScreen) {
            this.clear()
            return
        }
        if (this.currentValue === '0') return

        this.currentValue = String(this.currentValue).slice(0, -1)
        if (!this.currentValue.trim()) {
            this.currentValue = '0'
        }
    }

    /**
     * Append a number or decimal point
     */
    appendNumber(number) {
        if (this.shouldResetScreen) {
            this.currentValue = ''
            this.shouldResetScreen = false
        }

        if (number === '.') {
            const parts = this.currentValue.split(/[\s×÷+-]/)
            const lastPart = parts[parts.length - 1]
            if (lastPart.includes('.')) return
        }

        if (number === '%') {
            if (this.currentValue === '0' || this.currentValue.endsWith('%')) return
            this.currentValue += '%'
            return
        }

        if (this.currentValue === '0' && number !== '.') {
            this.currentValue = number.toString()
        } else {
            this.currentValue += number.toString()
        }
    }

    /**
     * Append a parenthesis intelligently
     */
    appendParenthesis() {
        if (this.shouldResetScreen) {
            this.currentValue = ''
            this.shouldResetScreen = false
        }

        if (this.currentValue === '0' || this.currentValue === '') {
            this.currentValue = '('
            return
        }

        const openCount = (this.currentValue.match(/\(/g) || []).length
        const closeCount = (this.currentValue.match(/\)/g) || []).length
        const lastChar = this.currentValue.trim().slice(-1)
        const isOperator = CONFIG.OPERATORS.includes(lastChar)

        // If we have open parentheses and last char is not an operator or '('
        if (openCount > closeCount && !isOperator && lastChar !== '(') {
            this.currentValue += ')'
        } else {
            // Add space before opening parenthesis if it follows a number or %
            const needsSpace = !isOperator && lastChar !== '(' && lastChar !== ' '
            if (needsSpace) {
                this.currentValue += ' ('
            } else {
                this.currentValue += '('
            }
        }
    }

    /**
     * Handle operator selection and replacement
     */
    chooseOperation(operation) {
        if (this.shouldResetScreen) this.shouldResetScreen = false

        const trimmed = this.currentValue.trim()
        const lastChar = trimmed.slice(-1)

        if (CONFIG.OPERATORS.includes(lastChar)) {
            this.currentValue = trimmed.slice(0, -1) + operation + ' '
        } else {
            this.currentValue = trimmed + ' ' + operation + ' '
        }
    }

    /**
     * Evaluate the current expression
     */
    compute() {
        if (this.currentValue === '' || this.currentValue === '0') return

        try {
            const expression = this.currentValue
            let sanitized = Calculator.sanitize(expression)
            sanitized = Calculator.balance(sanitized)

            // Safety check
            if (!CONFIG.VALID_CHARS.test(sanitized)) {
                throw new Error('Invalid characters')
            }

            // Using Function constructor as a safer alternative to eval
            const result = new Function(`return ${sanitized}`)()

            if (!isFinite(result) || isNaN(result)) {
                this.currentValue = 'Error'
            } else {
                // Limit precision and convert back to string
                this.currentValue = String(Number(result.toFixed(CONFIG.DISPLAY.RESULT_PRECISION)))
            }

            this.previousExpression = expression
            this.shouldResetScreen = true
        } catch (e) {
            this.currentValue = 'Error'
            this.previousExpression = ''
            this.shouldResetScreen = true
        }
    }

    /**
     * Static helper to sanitize expression for JS evaluation
     */
    static sanitize(value) {
        return value
            .replace(/([0-9.%])\s*\(/g, '$1 * (') // Implicit multiplication: 5( -> 5*(
            .replace(/\)\s*([0-9.])/g, ') * $1') // Implicit multiplication: )5 -> )*5
            .replace(/\)\s*\(/g, ') * (')       // Implicit multiplication: )( -> )*(
            .replace(/×/g, CONFIG.OPERATOR_MAP['×'])
            .replace(/÷/g, CONFIG.OPERATOR_MAP['÷'])
            .replace(/(\d+(?:\.\d+)?)%/g, '($1/100)')
    }

    /**
     * Static helper to auto-close unmatched parentheses
     */
    static balance(value) {
        const openCount = (value.match(/\(/g) || []).length
        const closeCount = (value.match(/\)/g) || []).length

        if (openCount <= closeCount) {
            // If it starts with an unmatched open, and has no closes, just strip it
            if (value.trim().startsWith('(') && closeCount === 0) {
                return value.replace(/^\s*\(/, '')
            }
            return value
        }

        return value + ')'.repeat(openCount - closeCount)
    }

    /**
     * Format numbers for display (adding commas)
     */
    getFormattedValue(value) {
        if (value === 'Error') return 'Error'

        const parts = value.split(/([\s×÷+\-()])/g)
        return parts.map(part => {
            if (/[\s×÷+\-()]/.test(part) || part === '') return part

            const isPercent = part.endsWith('%')
            const numberStr = isPercent ? part.slice(0, -1) : part
            const [integer, decimal] = numberStr.split('.')

            if (isNaN(parseFloat(integer))) return part

            const formattedInt = parseFloat(integer).toLocaleString('en-US', {
                maximumFractionDigits: 0
            })

            const result = decimal !== undefined ? `${formattedInt}.${decimal}` : formattedInt
            return isPercent ? result + '%' : result
        }).join('')
    }

    /**
     * Update UI elements
     */
    updateDisplay() {
        this.currentOperandElement.innerText = this.getFormattedValue(this.currentValue)
        this.previousOperandElement.innerText = this.getFormattedValue(this.previousExpression)
        this.adjustLayout()
    }

    /**
     * Dynamically adjust font size to fit container
     */
    adjustLayout() {
        const el = this.currentOperandElement
        const text = el.innerText
        if (this._lastMeasuredText === text) return
        this._lastMeasuredText = text

        if (!this.ghostElement) {
            this.ghostElement = document.createElement('div')
            Object.assign(this.ghostElement.style, {
                position: 'absolute',
                top: '-9999px',
                visibility: 'hidden',
                whiteSpace: 'nowrap',
                fontWeight: '500',
                fontFamily: "'Poppins', sans-serif",
            })
            document.body.appendChild(this.ghostElement)
        }

        this.ghostElement.innerText = text
        this.ghostElement.style.fontSize = `${CONFIG.DISPLAY.DEFAULT_FONT_SIZE_PX}px`

        const availableWidth = el.clientWidth - CONFIG.DISPLAY.PADDING_BUFFER_PX
        const contentWidth = this.ghostElement.scrollWidth

        let fontSize = CONFIG.DISPLAY.DEFAULT_FONT_SIZE_PX
        let isWrapping = false

        if (contentWidth > availableWidth) {
            const ratio = availableWidth / contentWidth
            fontSize = Math.floor(CONFIG.DISPLAY.DEFAULT_FONT_SIZE_PX * ratio)

            if (fontSize < CONFIG.DISPLAY.MIN_FONT_SIZE_PX) {
                fontSize = CONFIG.DISPLAY.MIN_FONT_SIZE_PX
                isWrapping = true
            }
        }

        el.style.fontSize = `${fontSize}px`
        el.style.whiteSpace = isWrapping ? 'pre-wrap' : 'nowrap'
        el.style.wordBreak = isWrapping ? 'break-all' : 'normal'
    }
}

// --- Initialization ---

const previousOperandElement = document.querySelector('[data-previous-operand]')
const currentOperandElement = document.querySelector('[data-current-operand]')
const keypad = document.querySelector('.keypad-container')

const calculator = new Calculator(previousOperandElement, currentOperandElement)

/**
 * Event Delegation for keypad clicks
 */
keypad.addEventListener('click', (e) => {
    const btn = e.target.closest('button')
    if (!btn) return

    const { action, number, operation, parenthesis } = btn.dataset
    const text = btn.innerText

    if (number !== undefined) {
        calculator.appendNumber(text)
    } else if (operation !== undefined) {
        calculator.chooseOperation(text)
    } else if (parenthesis !== undefined) {
        calculator.appendParenthesis()
    } else {
        switch (btn.dataset.action) {
            case 'equals':
                calculator.compute()
                break
            case 'clear':
                calculator.clear()
                break
            case 'delete':
                calculator.delete()
                break
        }
    }

    calculator.updateDisplay()
})

/**
 * Keyboard & Numpad / Ten-Key Input Listener
 */
document.addEventListener('keydown', (e) => {
    // Ignore keyboard shortcuts with modifier keys (e.g. Ctrl+C, Cmd+R)
    if (e.ctrlKey || e.metaKey || e.altKey) return

    // Ignore if user is typing into an input/textarea element
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable) {
        return
    }

    const key = e.key
    let targetBtn = null

    if (key >= '0' && key <= '9') {
        calculator.appendNumber(key)
        targetBtn = findButtonByText(key, '[data-number]')
    } else if (key === '.' || key === ',') {
        calculator.appendNumber('.')
        targetBtn = findButtonByText('.', '[data-number]')
    } else if (key === '%') {
        calculator.appendNumber('%')
        targetBtn = findButtonByText('%', '[data-number]')
    } else if (key === '+' || key === '-') {
        e.preventDefault()
        calculator.chooseOperation(key)
        targetBtn = findButtonByText(key, '[data-operation]')
    } else if (key === '*' || key === 'x' || key === 'X') {
        e.preventDefault()
        calculator.chooseOperation('×')
        targetBtn = findButtonByText('×', '[data-operation]')
    } else if (key === '/') {
        e.preventDefault()
        calculator.chooseOperation('÷')
        targetBtn = findButtonByText('÷', '[data-operation]')
    } else if (key === '(' || key === ')') {
        calculator.appendParenthesis()
        targetBtn = document.querySelector('[data-parenthesis]')
    } else if (key === 'Enter' || key === '=') {
        e.preventDefault()
        calculator.compute()
        targetBtn = document.querySelector('[data-action="equals"]')
    } else if (key === 'Backspace'|| key === 'Delete') {
        e.preventDefault()
        calculator.delete()
        targetBtn = document.querySelector('[data-action="delete"]')
    } else if (key === 'Escape'  || key.toLowerCase() === 'c') {
        e.preventDefault()
        calculator.clear()
        targetBtn = document.querySelector('[data-action="clear"]')
    } else {
        return
    }

    calculator.updateDisplay()

    if (targetBtn) {
        triggerButtonAnimation(targetBtn)
    }
})

/**
 * Helper to find a button by its displayed text
 */
function findButtonByText(text, selector) {
    const buttons = document.querySelectorAll(selector)
    return Array.from(buttons).find(btn => btn.innerText.trim() === text)
}

/**
 * Trigger visual button press feedback
 */
function triggerButtonAnimation(button) {
    button.classList.remove('pressed')
    // Trigger reflow to restart transition on rapid key presses
    void button.offsetWidth
    button.classList.add('pressed')

    clearTimeout(button._pressTimer)
    button._pressTimer = setTimeout(() => {
        button.classList.remove('pressed')
    }, 150)
}
