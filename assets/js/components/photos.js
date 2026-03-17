// assets/js/components/photos.js
document.addEventListener('alpine:init', () => {
    Alpine.data('photosApp', () => ({
        allImages: [],
        currentIndex: 0,
        currentPath: '',
        zoom: 1,
        rotation: 0,

        init() {
            this.updateFromStore();
            this.$watch('$store.os.windows', () => this.updateFromStore(), { deep: true });

            // Watch currentIndex to update the window title and store state
            this.$watch('currentIndex', (newIdx) => {
                const win = Alpine.store('os').windows.find(w => w.app === 'photos' && w.focused);
                if (win && this.allImages[newIdx]) {
                    const img = this.allImages[newIdx];
                    win.title = img.name;
                    win.imageName = img.name; // Keep store in sync to prevent revert
                }
            });

            // Handle arrow keys
            window.addEventListener('keydown', (e) => {
                const win = Alpine.store('os').windows.find(w => w.app === 'photos' && w.focused);
                if (!win) return;
                if (e.key === 'ArrowRight') this.next();
                if (e.key === 'ArrowLeft') this.prev();
            });
        },

        updateFromStore() {
            // Get the imageName passed from the window object
            const win = Alpine.store('os').windows.find(w => w.app === 'photos' && (w.focused || !this.currentImage));
            if (!win) return;

            const folderPath = win.folderPath || 'C:\\Users\\DeVante\\Pictures';
            if (this.currentPath !== folderPath) {
                this.currentPath = folderPath;
                this.allImages = (Alpine.store('os').fileSystem[folderPath] || []).filter(f => f.type === 'image' || (f.name && (f.name.endsWith('.webp') || f.name.endsWith('.png') || f.name.endsWith('.jpg'))));
            }
            
            const targetName = win.imageName;
            
            if (targetName) {
                let idx = this.allImages.findIndex(img => img.name === targetName);
                
                // If not found in current folder, search all folders (fallback)
                if (idx === -1) {
                    const fs = Alpine.store('os').fileSystem;
                    for (const path in fs) {
                        const folderItems = fs[path];
                        const found = folderItems.find(f => f.name === targetName && (f.type === 'image' || f.name?.endsWith('.webp') || f.name?.endsWith('.png')));
                        if (found) {
                            this.currentPath = path;
                            this.allImages = folderItems.filter(f => f.type === 'image' || f.name?.endsWith('.webp') || f.name?.endsWith('.png'));
                            idx = this.allImages.findIndex(img => img.name === targetName);
                            break;
                        }
                    }
                }

                if (idx !== -1 && idx !== this.currentIndex) {
                    this.currentIndex = idx;
                    this.resetView();
                }
            }
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
