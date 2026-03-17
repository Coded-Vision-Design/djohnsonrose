document.addEventListener('alpine:init', () => {
    Alpine.data('explorerApp', () => ({
        currentPath: 'C:\\Users\\DeVante',
        selected: null,
        history: ['C:\\Users\\DeVante'],
        historyStep: 0,
        searchQuery: '',
        manualPath: 'C:\\Users\\DeVante',
        addressBarActive: false,
        sidebar: [
            { label: 'Quick access', type: 'header' },
            { id: 'desktop', label: 'Desktop', path: 'C:\\Users\\DeVante\\Desktop', icon: window.portfolioConfig.imgPath + 'desktop.webp' },
            { id: 'projects', label: 'Projects', path: 'C:\\Users\\DeVante\\Projects', icon: window.portfolioConfig.imgPath + 'folder.webp' },
            { id: 'downloads', label: 'Downloads', path: 'C:\\Users\\DeVante\\Downloads', icon: window.portfolioConfig.imgPath + 'downloads.webp' },
            { id: 'documents', label: 'Documents', path: 'C:\\Users\\DeVante\\Documents', icon: window.portfolioConfig.imgPath + 'documents.webp' },
            { id: 'pictures', label: 'Pictures', path: 'C:\\Users\\DeVante\\Pictures', icon: window.portfolioConfig.imgPath + 'pictures.webp' },
            { id: 'recycle', label: 'Recycle Bin', path: 'C:\\Recycle Bin', icon: '' }, // Handled dynamically
            { id: 'thispc', label: 'This PC', path: 'C:\\', icon: window.portfolioConfig.imgPath + 'thispc.webp' },
            { id: 'c-drive', label: 'Local Disk (C:)', path: 'C:\\', icon: window.portfolioConfig.imgPath + 'cdrive.webp', indent: true }
        ],
        
        get sidebarWithIcons() {
            const osStore = Alpine.store('os');
            return this.sidebar.map(item => {
                if (item.id === 'recycle') {
                    const items = osStore.fileSystem['C:\\Recycle Bin'] || [];
                    const imgPath = window.portfolioConfig.imgPath;
                    const iconName = items.length > 0 ? 'recyclebinfull.webp' : 'recyclebinempty.webp';
                    const icon = imgPath + iconName;
                    return { ...item, icon };
                }
                return item;
            });
        },

        get currentFiles() {
            const osStore = Alpine.store('os');
            const path = this.currentPath;
            
            if (this.searchQuery.trim().length > 0) {
                const results = [];
                const query = this.searchQuery.toLowerCase();
                Object.entries(osStore.fileSystem).forEach(([p, files]) => {
                    files.forEach(file => {
                        if (file.name.toLowerCase().includes(query)) {
                            results.push({ ...file, path: p });
                        }
                    });
                });
                return results;
            }
            
            // Standardise path for lookup
            let lookupPath = path;
            if (lookupPath.length > 3 && lookupPath.endsWith('\\')) {
                lookupPath = lookupPath.slice(0, -1);
            }
            
            return osStore.fileSystem[lookupPath] || 
                   osStore.fileSystem[lookupPath + '\\'] || 
                   [];
        },

        init() {
            // Get our window ID immediately
            this.$nextTick(() => {
                const myWinId = this.$el.closest('[id^="win-"]')?.id.replace('win-', '');
                
                // Check initial path
                const win = Alpine.store('os').windows.find(w => w.id == myWinId);
                if (win && win.initialPath) {
                    this.navigate(win.initialPath);
                }

                // Global listener for navigation
                window.addEventListener('explorer-navigate', (e) => {
                    const osStore = Alpine.store('os');
                    const focusedWin = osStore.windows.find(w => w.app === 'explorer' && w.focused);
                    
                    // If we are the focused window, or if we were just opened
                    if (e.detail && e.detail.path && focusedWin && focusedWin.id == myWinId) {
                        this.navigate(e.detail.path);
                    }
                });
            });
        },

        navigate(path) {
            console.log('Navigating to:', path);
            this.searchQuery = '';
            this.addressBarActive = false;
            
            // Standardise path: Ensure C:\ always has the trailing slash, others don't
            let cleanPath = path;
            if (cleanPath === 'C:' || cleanPath === 'C') {
                cleanPath = 'C:\\';
            } else if (cleanPath.length > 3 && cleanPath.endsWith('\\')) {
                cleanPath = cleanPath.slice(0, -1);
            }
            
            if (this.currentPath === cleanPath) {
                this.selected = null;
                this.manualPath = cleanPath;
                return;
            }
            
            this.currentPath = cleanPath;
            this.manualPath = cleanPath;
            this.selected = null;
            this.historyStep++;
            this.history = this.history.slice(0, this.historyStep);
            this.history.push(cleanPath);
            
            Alpine.store('os').logEvent('Explorer', 'Information', `Navigated to ${cleanPath}`);
        },

        submitPath() {
            if (!this.manualPath) {
                this.manualPath = this.currentPath;
                this.addressBarActive = false;
                return;
            }
            this.navigate(this.manualPath);
        },

        goBack() {
            this.searchQuery = '';
            if (this.historyStep > 0) {
                this.historyStep--;
                this.currentPath = this.history[this.historyStep];
            }
        },

        goForward() {
            this.searchQuery = '';
            if (this.historyStep < this.history.length - 1) {
                this.historyStep++;
                this.currentPath = this.history[this.historyStep];
            }
        },

        openItem(item) {
            const osStore = Alpine.store('os');
            if (item.extraData && item.extraData.locked) {
                osStore.playSound('error');
                const fullPath = item.fullPath || (this.currentPath.endsWith('\\') ? `${this.currentPath}${item.name}` : `${this.currentPath}\\${item.name}`);
                osStore.showError('File Access Denied', 'This document is currently locked. References are available upon request.', fullPath);
                return;
            }
            if (this.currentPath === 'C:\\Recycle Bin') {
                osStore.playSound('error');
                return;
            }
            if (item.type === 'folder') {
                let newPath;
                if (item.path) {
                    newPath = item.path;
                } else {
                    newPath = this.currentPath.endsWith('\\') ? 
                              `${this.currentPath}${item.name}` : 
                              `${this.currentPath}\\${item.name}`;
                }
                this.navigate(newPath);
            } else if (item.app === 'pdfreader') {
                osStore.openApp('pdfreader', item.name, { pdfUrl: item.pdfUrl || (item.extraData ? item.extraData.pdfUrl : (window.portfolioConfig.basePath + 'data/cv.pdf')) });
            } else if (item.type === 'app') {
                osStore.openApp(item.app, item.name, item.extraData || {});
            } else if (item.type === 'image') {
                osStore.openApp('photos', item.name, { imageName: item.name, folderPath: this.currentPath });
            } else if (item.type === 'video') {
                osStore.openApp('video', item.name, { videoUrl: item.url });
            } else if (item.type === 'file' && item.name.endsWith('.txt')) {
                osStore.openApp('notepad', item.name, { fileContent: item.content });
            }
        },

        restoreItem(item) {
            const osStore = Alpine.store('os');
            const recycleBin = osStore.fileSystem['C:\\Recycle Bin'];
            
            // Find item in recycle bin
            const index = recycleBin.findIndex(f => f.name === item.name);
            if (index > -1) {
                const fileToRestore = recycleBin.splice(index, 1)[0];
                const targetPath = fileToRestore.originalPath || 'C:\\Users\\DeVante\\Desktop';
                
                if (!osStore.fileSystem[targetPath]) {
                    osStore.fileSystem[targetPath] = [];
                }
                
                osStore.fileSystem[targetPath].push(fileToRestore);
                osStore.saveFileSystem();
                this.playSound('click'); // Feedback
            }
        }
    }));
});
