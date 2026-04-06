// js/calculator.js — Calculator modal logic

const Calculator = {
    display: null,
    currentValue: '0',
    previousValue: '',
    operation: null,
    resetNext: false,

    init() {
        this.display = document.getElementById('calcDisplay');

        document.getElementById('btnCalculator').addEventListener('click', () => {
            this.reset();
            App.openModal('calculatorModal');
        });

        document.querySelector('.calc-buttons').addEventListener('click', (e) => {
            const btn = e.target.closest('.calc-btn');
            if (!btn) return;
            this.handleInput(btn.dataset.calc);
        });
    },

    handleInput(value) {
        if (value === 'C') {
            this.reset();
            return;
        }

        if (value === 'backspace') {
            this.currentValue = this.currentValue.length > 1
                ? this.currentValue.slice(0, -1)
                : '0';
            this.updateDisplay();
            return;
        }

        if (value === '=') {
            this.calculate();
            this.operation = null;
            this.previousValue = '';
            this.resetNext = true;
            return;
        }

        if (['+', '-', '*', '/', '%'].includes(value)) {
            if (this.operation && !this.resetNext) {
                this.calculate();
            }
            this.operation = value;
            this.previousValue = this.currentValue;
            this.resetNext = true;
            return;
        }

        // Number or decimal
        if (value === '.' && this.currentValue.includes('.')) return;

        if (this.resetNext) {
            this.currentValue = value === '.' ? '0.' : value;
            this.resetNext = false;
        } else {
            this.currentValue = this.currentValue === '0' && value !== '.'
                ? value
                : this.currentValue + value;
        }

        this.updateDisplay();
    },

    calculate() {
        if (!this.operation || !this.previousValue) return;
        const prev = parseFloat(this.previousValue);
        const curr = parseFloat(this.currentValue);
        let result = 0;

        switch (this.operation) {
            case '+': result = prev + curr; break;
            case '-': result = prev - curr; break;
            case '*': result = prev * curr; break;
            case '/': result = curr !== 0 ? prev / curr : 0; break;
            case '%': result = prev % curr; break;
        }

        this.currentValue = parseFloat(result.toFixed(10)).toString();
        this.updateDisplay();
    },

    reset() {
        this.currentValue = '0';
        this.previousValue = '';
        this.operation = null;
        this.resetNext = false;
        this.updateDisplay();
    },

    updateDisplay() {
        this.display.value = this.currentValue;
    }
};
