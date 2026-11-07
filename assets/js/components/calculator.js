// The sums are worked out in assets/js/windowing/calculator.js, shared with v2.
document.addEventListener('alpine:init', () => {
    const KEY_CLASS = {
        fn: 'bg-gray-100 dark:bg-white/5',
        op: 'bg-gray-100 dark:bg-white/5 text-xl',
        num: 'bg-white dark:bg-white/10 text-lg font-bold shadow-xs',
        sign: 'bg-white dark:bg-white/10 font-bold shadow-xs',
        equals: 'bg-win-blue text-white text-xl hover:bg-blue-600! shadow-xs',
    };

    Alpine.data('calcApp', () => ({
        calc: { ...OsWindowing.CALC_START },
        buttons: OsWindowing.CALC_BUTTONS.map((button) => ({ ...button, class: KEY_CLASS[button.kind] })),

        get display() { return this.calc.display; },
        get expression() { return this.calc.expression; },
        get displaySize() {
            if (this.display.length > 15) return 'text-xl';
            return this.display.length > 10 ? 'text-3xl' : 'text-5xl';
        },

        press(val) {
            this.calc = OsWindowing.calcPress(this.calc, val);
        },

        handleKeyboard(e) {
            const key = OsWindowing.calcKeyFromEvent(e, this.win?.id, Alpine.store('os').focusedWindowId);
            if (!key) return;
            // Enter would otherwise also press whichever key was clicked last.
            e.preventDefault();
            this.press(key);
        }
    }));
});
