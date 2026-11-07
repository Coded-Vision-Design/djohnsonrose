// assets/js/components/photos.js
// Photos shows a folder of the shared file system, Pictures by default, which
// holds the portfolio screenshots and the competition photos. Which pictures,
// and which one is open, is worked out in assets/js/windowing/media.js, shared with v2.
document.addEventListener('alpine:init', () => {
    Alpine.data('photosApp', () => ({
        allImages: [],
        currentIndex: 0,
        currentPath: '',
        zoom: 1,
        rotation: 0,
        _opened: '',

        init() {
            this.updateFromStore();
            this.$watch('$store.os.windows', () => this.updateFromStore(), { deep: true });

            // Keep the window title, and the picture the store remembers, in step.
            this.$watch('currentIndex', (newIdx) => {
                const win = this.win;
                const img = this.allImages[newIdx];
                if (win && img) {
                    win.title = img.name;
                    win.imageName = img.name;
                    this._opened = this.openKey(win);
                }
            });
        },

        openKey(win) {
            return [win.folderPath, win.imageName, win.imageUrl].join('|');
        },

        updateFromStore() {
            const win = this.win;
            if (!win) return;
            // Only a new file or folder sent to this window moves it.
            const key = this.openKey(win);
            if (key === this._opened) return;
            this._opened = key;
            const album = OsWindowing.photoAlbum(Alpine.store('os').fileSystem, {
                folderPath: win.folderPath,
                imageName: win.imageName,
                imageUrl: win.imageUrl,
            });
            this.currentPath = album.path;
            this.allImages = album.images;
            if (album.index !== this.currentIndex) {
                this.currentIndex = album.index;
                this.resetView();
            }
        },

        handleKey(e) {
            if (this.win?.id !== Alpine.store('os').focusedWindowId) return;
            if (e.target.closest?.('input, textarea')) return;
            if (e.key === 'ArrowRight') this.next();
            if (e.key === 'ArrowLeft') this.prev();
        },

        get currentImage() {
            return this.allImages[this.currentIndex];
        },

        next() {
            if (this.allImages.length <= 1) return;
            this.currentIndex = (this.currentIndex + 1) % this.allImages.length;
            this.resetView();
        },

        prev() {
            if (this.allImages.length <= 1) return;
            this.currentIndex = (this.currentIndex - 1 + this.allImages.length) % this.allImages.length;
            this.resetView();
        },

        setIndex(index) {
            this.currentIndex = index;
            this.resetView();
        },

        resetView() {
            this.zoom = 1;
            this.rotation = 0;
        },

        zoomIn() { this.zoom = Math.min(this.zoom + 0.2, 3); },
        zoomOut() { this.zoom = Math.max(this.zoom - 0.2, 0.5); },
        rotate() { this.rotation = (this.rotation + 90) % 360; }
    }));
});
