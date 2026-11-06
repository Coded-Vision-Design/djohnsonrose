// assets/js/components/photoshop.js
// Photoshop. Everything it does lives in assets/js/windowing/drawing.js, which
// v2 shares, so this file only keeps Alpine's state and plugs it in.
document.addEventListener('alpine:init', () => {
    Alpine.data('photoshopApp', () => {
        const D = window.Drawing;
        // Kept outside Alpine's reactivity: the controller that owns the layers.
        let ps = null;

        return {
            ICONS: D.DRAWING_ICONS,
            TOOL_ICONS: { move: 'move', brush: 'brush', eraser: 'eraser', bucket: 'fill', text: 'text' },
            MENUS: D.PS_MENUS,
            TOOLS: D.PS_TOOLS,
            SWATCHES: D.PS_SWATCHES,
            ZOOM_LEVELS: D.ZOOM_LEVELS,
            MIN_SIZE: D.MIN_SIZE,
            MAX_SIZE: D.MAX_SIZE,
            SIZE: D.PS_SIZE,
            s: D.photoshopInitialState(),

            init() {
                const id = Alpine.store('os').windows.find((w) => w.app === 'photoshop')?.id;
                this.$nextTick(() => {
                    ps = D.createPhotoshop(this.$el, {
                        onChange: (state) => { this.s = state; },
                        isActive: () => Alpine.store('os').focusedWindowId === id,
                    });
                });
            },

            destroy() {
                ps?.dispose();
                ps = null;
            },

            off(id) {
                return D.commandState(id, this.s).disabled;
            },

            run(id) {
                ps?.run(id);
            },

            call(method, ...args) {
                ps?.[method](...args);
            },

            zoomIndex() {
                return D.zoomIndex(this.s.zoom);
            },

            toolLabel() {
                return this.TOOLS.find((item) => item.id === this.s.tool)?.label ?? '';
            },

            layerName() {
                return this.s.layers.find((item) => item.id === this.s.active)?.name ?? '';
            },
        };
    });
});
