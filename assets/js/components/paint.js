// assets/js/components/paint.js
// Paint. Everything it does lives in assets/js/windowing/drawing.js, which v2
// shares, so this file only keeps Alpine's state and plugs it in.
document.addEventListener('alpine:init', () => {
    Alpine.data('paintApp', () => {
        const D = window.Drawing;
        // Kept outside Alpine's reactivity: the controller that owns the canvas.
        let paint = null;

        return {
            ICONS: D.DRAWING_ICONS,
            TABS: D.PAINT_TABS,
            TOOLS: D.PAINT_TOOLS,
            SHAPES: D.PAINT_SHAPES,
            PALETTE: D.PAINT_PALETTE,
            ZOOM_LEVELS: D.ZOOM_LEVELS,
            MIN_SIZE: D.MIN_SIZE,
            MAX_SIZE: D.MAX_SIZE,
            s: D.paintInitialState(),

            init() {
                const id = Alpine.store('os').windows.find((w) => w.app === 'paint')?.id;
                this.$nextTick(() => {
                    paint = D.createPaint(this.$el, {
                        onChange: (state) => { this.s = state; },
                        isActive: () => Alpine.store('os').focusedWindowId === id,
                    });
                });
            },

            destroy() {
                paint?.dispose();
                paint = null;
            },

            off(id) {
                return D.commandState(id, this.s).disabled;
            },

            run(id) {
                paint?.run(id);
            },

            call(method, ...args) {
                paint?.[method](...args);
            },

            zoomIndex() {
                return D.zoomIndex(this.s.zoom);
            },
        };
    });
});
