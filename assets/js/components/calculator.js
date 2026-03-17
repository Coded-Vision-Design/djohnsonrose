document.addEventListener('alpine:init', () => {
    Alpine.data('calcApp', () => ({
        display: '0',
        expression: '',
        currentOp: null,
        prevValue: null,
        newNumber: true,
        
        buttons: [
            { label: '%', val: '%', class: 'bg-gray-100 dark:bg-white/5' },
            { label: 'CE', val: 'CE', class: 'bg-gray-100 dark:bg-white/5' },
            { label: 'C', val: 'C', class: 'bg-gray-100 dark:bg-white/5' },
            { label: '⌫', val: 'back', class: 'bg-gray-100 dark:bg-white/5' },
            { label: '<sup>1</sup>/<sub>x</sub>', val: 'inv', class: 'bg-gray-100 dark:bg-white/5' },
            { label: 'x²', val: 'sq', class: 'bg-gray-100 dark:bg-white/5' },
            { label: '<sup>2</sup>√x', val: 'sqrt', class: 'bg-gray-100 dark:bg-white/5' },
            { label: '÷', val: '/', class: 'bg-gray-100 dark:bg-white/5 text-xl' },
            { label: '7', val: '7', class: 'bg-white dark:bg-white/10 text-lg font-bold shadow-sm' },
            { label: '8', val: '8', class: 'bg-white dark:bg-white/10 text-lg font-bold shadow-sm' },
            { label: '9', val: '9', class: 'bg-white dark:bg-white/10 text-lg font-bold shadow-sm' },
            { label: '×', val: '*', class: 'bg-gray-100 dark:bg-white/5 text-xl' },
            { label: '4', val: '4', class: 'bg-white dark:bg-white/10 text-lg font-bold shadow-sm' },
            { label: '5', val: '5', class: 'bg-white dark:bg-white/10 text-lg font-bold shadow-sm' },
            { label: '6', val: '6', class: 'bg-white dark:bg-white/10 text-lg font-bold shadow-sm' },
            { label: '-', val: '-', class: 'bg-gray-100 dark:bg-white/5 text-xl' },
            { label: '1', val: '1', class: 'bg-white dark:bg-white/10 text-lg font-bold shadow-sm' },
            { label: '2', val: '2', class: 'bg-white dark:bg-white/10 text-lg font-bold shadow-sm' },
            { label: '3', val: '3', class: 'bg-white dark:bg-white/10 text-lg font-bold shadow-sm' },
            { label: '+', val: '+', class: 'bg-gray-100 dark:bg-white/5 text-xl' },
            { label: '<sup>+</sup>/<sub>-</sub>', val: 'pm', class: 'bg-white dark:bg-white/10 font-bold shadow-sm' },
            { label: '0', val: '0', class: 'bg-white dark:bg-white/10 text-lg font-bold shadow-sm' },
            { label: '.', val: '.', class: 'bg-white dark:bg-white/10 font-bold shadow-sm' },
            { label: '=', val: '=', class: 'bg-win-blue text-white text-xl hover:!bg-blue-600 shadow-sm' },
        ],
        
        press(val) {
            if (!isNaN(val) || val === '.') {
                if (this.newNumber) {
                    this.display = val === '.' ? '0.' : val;
                    this.newNumber = false;
                } else {
                    if (val === '.' && this.display.includes('.')) return;
                    if (this.display === '0' && val !== '.') {
                        this.display = val;
                    } else {
                        this.display += val;
                    }
                }
            } else if (['+', '-', '*', '/', '%'].includes(val)) {
                this.calculate();
                this.prevValue = parseFloat(this.display);
                this.currentOp = val;
                this.expression = this.prevValue + ' ' + (val === '*' ? '×' : (val === '/' ? '÷' : val));
                this.newNumber = true;
            } else if (val === '=') {
                this.calculate();
                this.expression = '';
                this.currentOp = null;
                this.prevValue = null;
                this.newNumber = true;
            } else if (val === 'C') {
                this.display = '0';
                this.expression = '';
                this.currentOp = null;
                this.prevValue = null;
                this.newNumber = true;
            } else if (val === 'CE') {
                this.display = '0';
                this.newNumber = true;
            } else if (val === 'back') {
                if (this.display.length > 1) {
                    this.display = this.display.slice(0, -1);
                } else {
                    this.display = '0';
                    this.newNumber = true;
                }
            } else if (val === 'pm') {
                this.display = String(parseFloat(this.display) * -1);
            } else if (val === 'inv') {
                this.display = String(1 / parseFloat(this.display));
                this.newNumber = true;
            } else if (val === 'sq') {
                this.display = String(Math.pow(parseFloat(this.display), 2));
                this.newNumber = true;
            } else if (val === 'sqrt') {
                this.display = String(Math.sqrt(parseFloat(this.display)));
                this.newNumber = true;
            }
        },
        
        calculate() {
            if (this.currentOp === null || this.prevValue === null) return;
            const current = parseFloat(this.display);
            let result = 0;
            switch (this.currentOp) {
                case '+': result = this.prevValue + current; break;
                case '-': result = this.prevValue - current; break;
                case '*': result = this.prevValue * current; break;
                case '/': result = current !== 0 ? this.prevValue / current : 'Error'; break;
                case '%': result = (this.prevValue / 100) * current; break;
            }
            this.display = String(result);
            if (this.display.length > 12 && !isNaN(result)) {
                this.display = result.toPrecision(10);
            }
        },
        
        handleKeyboard(e) {
            if (!this.focusedWindowId || !this.windows.find(w => w.id === this.focusedWindowId && w.app === 'calculator')) return;
            if (e.key >= '0' && e.key <= '9') this.press(e.key);
            if (e.key === '.') this.press('.');
            if (e.key === '+') this.press('+');
            if (e.key === '-') this.press('-');
            if (e.key === '*') this.press('*');
            if (e.key === '/') this.press('/');
            if (e.key === 'Enter') this.press('=');
            if (e.key === 'Backspace') this.press('back');
            if (e.key === 'Escape') this.press('C');
            if (e.key === '%') this.press('%');
        }
    }));
});
