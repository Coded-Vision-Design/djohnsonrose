document.addEventListener('alpine:init', () => {
    Alpine.data('paintApp', () => ({
        tool: 'pencil',
        color: '#000000',
        size: 4,
        isDrawing: false,
        isResizing: false,
        resizeType: null,
        ctx: null,
        mousePos: { x: 0, y: 0 },
        canvasSize: { w: 800, h: 600 },
        history: [],
        historyStep: -1,
        palette: [
            '#000000', '#7f7f7f', '#880015', '#ed1c24', '#ff7f27', '#fff200', '#22b14c', '#00a2e8', '#3f48cc', '#a349a4',
            '#ffffff', '#c3c3c3', '#b97a57', '#ffaec9', '#ffc90e', '#efe4b0', '#b5e61d', '#99d9ea', '#7092be', '#c8bfe7'
        ],
        
        init() {
            this.$nextTick(() => {
                const canvas = this.$refs.canvas;
                this.ctx = canvas.getContext('2d', { willReadFrequently: true });
                this.setupCanvas();
                
                window.addEventListener('keydown', (e) => {
                    if (this.focusedWindowId && this.windows.find(w => w.id === this.focusedWindowId && w.app === 'paint')) {
                        if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undo(); }
                        if (e.ctrlKey && e.key === 'y') { e.preventDefault(); this.redo(); }
                    }
                });
            });
        },
        
        setupCanvas() {
            const canvas = this.$refs.canvas;
            canvas.width = this.canvasSize.w;
            canvas.height = this.canvasSize.h;
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, canvas.width, canvas.height);
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.saveState();
        },
        
        startAction(e) {
            const rect = this.$refs.canvas.getBoundingClientRect();
            const x = Math.round(e.clientX - rect.left);
            const y = Math.round(e.clientY - rect.top);

            if (this.tool === 'picker') {
                const pixel = this.ctx.getImageData(x, y, 1, 1).data;
                this.color = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
                this.tool = 'pencil';
                return;
            }

            if (this.tool === 'fill') {
                this.floodFill(x, y, this.color);
                this.saveState();
                return;
            }

            if (this.tool === 'text') {
                const text = prompt('Enter text:');
                if (text) {
                    this.ctx.font = `${this.size * 2}px Segoe UI`;
                    this.ctx.fillStyle = this.color;
                    this.ctx.fillText(text, x, y);
                    this.saveState();
                }
                return;
            }

            this.isDrawing = true;
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.doAction(e);
        },
        
        doAction(e) {
            const rect = this.$refs.canvas.getBoundingClientRect();
            const x = Math.round(e.clientX - rect.left);
            const y = Math.round(e.clientY - rect.top);
            this.mousePos = { x, y };

            if (this.isDrawing && (this.tool === 'pencil' || this.tool === 'eraser')) {
                this.ctx.lineWidth = this.size;
                this.ctx.strokeStyle = this.tool === 'eraser' ? '#ffffff' : this.color;
                this.ctx.lineTo(x, y);
                this.ctx.stroke();
            }
        },
        
        stopAction() {
            if (this.isDrawing) {
                this.isDrawing = false;
                this.ctx.beginPath();
                this.saveState();
            }
        },

        startCanvasResize(type, e) {
            this.isResizing = true;
            this.resizeType = type;
            const startX = e.clientX;
            const startY = e.clientY;
            const startW = this.canvasSize.w;
            const startH = this.canvasSize.h;

            const onMouseMove = (moveEvent) => {
                if (this.resizeType === 'width' || this.resizeType === 'both') {
                    this.canvasSize.w = Math.max(100, startW + (moveEvent.clientX - startX));
                }
                if (this.resizeType === 'height' || this.resizeType === 'both') {
                    this.canvasSize.h = Math.max(100, startH + (moveEvent.clientY - startY));
                }
            };

            const onMouseUp = () => {
                this.isResizing = false;
                this.applyCanvasResize();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        },

        applyCanvasResize() {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.$refs.canvas.width;
            tempCanvas.height = this.$refs.canvas.height;
            tempCanvas.getContext('2d').drawImage(this.$refs.canvas, 0, 0);

            const canvas = this.$refs.canvas;
            canvas.width = this.canvasSize.w;
            canvas.height = this.canvasSize.h;

            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(0, 0, canvas.width, canvas.height);
            this.ctx.drawImage(tempCanvas, 0, 0);
            
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            this.saveState();
        },

        saveState() {
            this.historyStep++;
            if (this.historyStep < this.history.length) {
                this.history = this.history.slice(0, this.historyStep);
            }
            this.history.push({
                image: this.$refs.canvas.toDataURL(),
                w: this.canvasSize.w,
                h: this.canvasSize.h
            });
            if (this.history.length > 20) {
                this.history.shift();
                this.historyStep--;
            }
        },

        undo() {
            if (this.historyStep > 0) {
                this.historyStep--;
                this.restoreHistory(this.history[this.historyStep]);
            }
        },

        redo() {
            if (this.historyStep < this.history.length - 1) {
                this.historyStep++;
                this.restoreHistory(this.history[this.historyStep]);
            }
        },

        restoreHistory(state) {
            this.canvasSize.w = state.w;
            this.canvasSize.h = state.h;
            this.$refs.canvas.width = state.w;
            this.$refs.canvas.height = state.h;
            
            const img = new Image();
            img.src = state.image;
            img.onload = () => {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(0, 0, state.w, state.h);
                this.ctx.drawImage(img, 0, 0);
                this.ctx.lineCap = 'round';
                this.ctx.lineJoin = 'round';
            };
        },
        
        clearCanvas() {
            if (confirm('Clear entire drawing?')) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.fillRect(0, 0, this.canvasSize.w, this.canvasSize.h);
                this.saveState();
            }
        },
        
        download() {
            const link = document.createElement('a');
            link.download = 'painting.png';
            link.href = this.$refs.canvas.toDataURL();
            link.click();
        },

        floodFill(startX, startY, fillColor) {
            const imageData = this.ctx.getImageData(0, 0, this.canvasSize.w, this.canvasSize.h);
            const targetColor = this.getPixel(imageData, startX, startY);
            const fillRGB = this.hexToRgb(fillColor);
            if (this.colorsMatch(targetColor, [fillRGB.r, fillRGB.g, fillRGB.b, 255])) return;
            const pixelsToCheck = [startX, startY];
            while (pixelsToCheck.length > 0) {
                const y = pixelsToCheck.pop();
                const x = pixelsToCheck.pop();
                const currentColor = this.getPixel(imageData, x, y);
                if (this.colorsMatch(currentColor, targetColor)) {
                    this.setPixel(imageData, x, y, fillRGB);
                    if (x > 0) pixelsToCheck.push(x - 1, y);
                    if (x < this.canvasSize.w - 1) pixelsToCheck.push(x + 1, y);
                    if (y > 0) pixelsToCheck.push(x, y - 1);
                    if (y < this.canvasSize.h - 1) pixelsToCheck.push(x, y + 1);
                }
            }
            this.ctx.putImageData(imageData, 0, 0);
        },

        getPixel(imageData, x, y) {
            const index = (y * imageData.width + x) * 4;
            return [imageData.data[index], imageData.data[index+1], imageData.data[index+2], imageData.data[index+3]];
        },
        setPixel(imageData, x, y, color) {
            const index = (y * imageData.width + x) * 4;
            imageData.data[index] = color.r;
            imageData.data[index+1] = color.g;
            imageData.data[index+2] = color.b;
            imageData.data[index+3] = 255;
        },
        colorsMatch(a, b) {
            return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
        },
        hexToRgb(hex) {
            const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
            return { r, g, b };
        }
    }));
});
