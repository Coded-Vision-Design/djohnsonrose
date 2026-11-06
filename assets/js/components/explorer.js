document.addEventListener('alpine:init', () => {
    Alpine.data('explorerApp', () => ({
        currentPath: 'C:\\Users\\DeVante',
        selectedByPath: {},
        history: ['C:\\Users\\DeVante'],
        historyStep: 0,
        searchQuery: '',
        manualPath: 'C:\\Users\\DeVante',
        addressBarActive: false,
        viewMode: 'grid',
        sortKey: 'name',
        sortDir: 'asc',
        detailsOpen: false,
        winId: null,

        get isRecycle() {
            return this.currentPath === 'C:\\Recycle Bin';
        },

        get sidebarItems() {
            const os = Alpine.store('os');
            return OsWindowing.explorerSidebar(os.fileSystem, os.favourites, window.portfolioConfig.imgPath);
        },

        get selected() {
            return this.selectedByPath[this.currentPath] ?? null;
        },

        set selected(name) {
            this.selectedByPath[this.currentPath] = name;
        },

        // A search result can come from below this folder, so it says where it is.
        pathOf(file) {
            return file.location ?? this.currentPath;
        },

        get currentFiles() {
            const fs = Alpine.store('os').fileSystem;
            const list = this.searchQuery
                ? OsWindowing.searchFolder(fs, this.currentPath, this.searchQuery)
                : fs[this.currentPath] ?? [];
            return OsWindowing.sortEntries(list, this.sortKey, this.sortDir);
        },

        get selectedFile() {
            return this.currentFiles.find(file => file.name === this.selected) ?? null;
        },

        get selectedRows() {
            const file = this.selectedFile;
            return file ? OsWindowing.entryProperties(Alpine.store('os').fileSystem, file, this.pathOf(file)) : [];
        },

        get cutName() {
            const clip = Alpine.store('os').fileClipboard;
            return clip?.mode === 'cut' && clip.fromPath === this.currentPath ? clip.name : null;
        },

        get renamingName() {
            const renaming = Alpine.store('os').renaming;
            return renaming?.path === this.currentPath ? renaming.name : null;
        },

        get sortArrow() {
            return this.sortDir === 'asc' ? ' ↑' : ' ↓';
        },

        init() {
            this.$nextTick(() => {
                this.winId = this.$el.closest('[id^="win-"]')?.id.replace('win-', '');

                const win = Alpine.store('os').windows.find(w => w.id == this.winId);
                if (win?.initialPath) this.startAt(win.initialPath);
                if (win?.selectName) this.selected = win.selectName;

                // An already open Explorer takes over when something else opens a folder.
                this.onNavigate = (e) => {
                    const explorer = Alpine.store('os').windows.find(w => w.app === 'explorer');
                    if (e.detail?.path && explorer?.id == this.winId) {
                        this.navigate(e.detail.path);
                        if (e.detail.selectName) this.selected = e.detail.selectName;
                    }
                };
                window.addEventListener('explorer-navigate', this.onNavigate);

                this.onKey = (e) => this.handleKey(e);
                window.addEventListener('keydown', this.onKey);
            });
        },

        destroy() {
            window.removeEventListener('explorer-navigate', this.onNavigate);
            window.removeEventListener('keydown', this.onKey);
        },

        // Where a window opens is its first stop, so there is nothing to go back to.
        startAt(path) {
            const start = path.length > 3 && path.endsWith('\\') ? path.slice(0, -1) : path;
            if (!Alpine.store('os').fileSystem[start]) return;
            this.currentPath = start;
            this.manualPath = start;
            this.history = [start];
            this.historyStep = 0;
        },

        handleKey(e) {
            const os = Alpine.store('os');
            if (os.focusedWindowId != this.winId) return;
            const active = document.activeElement;
            if (active && ['INPUT', 'TEXTAREA'].includes(active.tagName)) return;

            const file = this.selectedFile;
            const fileOs = this.explorerOs();
            const actions = file && OsWindowing.fileMenuHandlers(fileOs, file, this.pathOf(file));
            const command = e.ctrlKey || e.metaKey ? e.key.toLowerCase() : '';

            if (command === 'c' || command === 'x') {
                if (actions && !this.isRecycle) {
                    e.preventDefault();
                    if (command === 'c') actions.copy();
                    else actions.cut();
                }
            } else if (command === 'v') {
                if (!this.isRecycle && os.fileClipboard) {
                    e.preventDefault();
                    OsWindowing.folderMenuHandlers(fileOs, this.currentPath).paste();
                }
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                this.goBack();
            } else if (e.key === 'Delete') {
                if (actions) {
                    e.preventDefault();
                    if (this.isRecycle) actions.deleteForever();
                    else actions.delete();
                    this.selected = null;
                }
            } else if (e.key === 'Enter') {
                if (file) {
                    e.preventDefault();
                    this.openItem(file);
                }
            } else if (e.key === 'F2') {
                if (file && !this.isRecycle) {
                    e.preventDefault();
                    fileOs.beginRename(file, this.pathOf(file));
                }
            }
        },

        navigate(path) {
            const target = path.length > 3 && path.endsWith('\\') ? path.slice(0, -1) : path;
            const os = Alpine.store('os');
            if (!os.fileSystem[target]) return;

            this.searchQuery = '';
            this.addressBarActive = false;
            this.manualPath = target;
            os.renaming = null;
            if (this.currentPath === target) return;

            this.currentPath = target;
            this.historyStep++;
            this.history = this.history.slice(0, this.historyStep);
            this.history.push(target);
            os.logEvent('Explorer', 'Information', `Navigated to ${target}`);
        },

        submitPath() {
            const target = (this.manualPath || '').trim();
            if (target && Alpine.store('os').fileSystem[target]) {
                this.navigate(target);
            }
            this.addressBarActive = false;
            this.manualPath = this.currentPath;
        },

        goBack() {
            this.searchQuery = '';
            if (this.historyStep > 0) {
                this.historyStep--;
                this.currentPath = this.history[this.historyStep];
                this.manualPath = this.currentPath;
            }
        },

        goForward() {
            this.searchQuery = '';
            if (this.historyStep < this.history.length - 1) {
                this.historyStep++;
                this.currentPath = this.history[this.historyStep];
                this.manualPath = this.currentPath;
            }
        },

        goUp() {
            if (this.currentPath === 'C:\\' || this.isRecycle) return;
            this.navigate(OsWindowing.parentPath(this.currentPath));
        },

        toggleSort(key) {
            if (this.sortKey === key) {
                this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
            } else {
                this.sortKey = key;
                this.sortDir = 'asc';
            }
        },

        openItem(item, path = this.pathOf(item)) {
            if (this.isRecycle) {
                Alpine.store('os').properties = { entry: item, path };
            } else if (item.type === 'folder') {
                this.navigate(OsWindowing.folderPath(item, path));
            } else {
                this.openFile(item, path);
            }
        },

        openSidebarItem(item) {
            if (!item.entry) {
                if (item.path) this.navigate(item.path);
            } else if (item.entry.type === 'folder') {
                this.navigate(OsWindowing.folderPath(item.entry, item.path));
            } else {
                this.openFile(item.entry, item.path);
            }
        },

        explorerOs() {
            return this.fileOs({ openEntry: (entry, path) => this.openItem(entry, path) });
        },

        showExplorerItemMenu(e, file) {
            this.selected = file.name;
            this.showFileContextMenu(e, file, this.pathOf(file), this.explorerOs());
        },

        showExplorerPaneMenu(e) {
            const fileOs = this.explorerOs();
            this.openMenu('explorerPane', e, {
                view: () => { this.viewMode = this.viewMode === 'grid' ? 'details' : 'grid'; },
                details: () => { this.detailsOpen = !this.detailsOpen; },
                sortName: () => { this.sortKey = 'name'; },
                sortType: () => { this.sortKey = 'type'; },
                sortDate: () => { this.sortKey = 'date'; },
                sortSize: () => { this.sortKey = 'size'; },
                ...OsWindowing.folderMenuHandlers(fileOs, this.currentPath)
            }, {
                ...OsWindowing.folderMenuOverrides(fileOs),
                view: { label: this.viewMode === 'grid' ? 'View as details' : 'View as grid' },
                details: { label: this.detailsOpen ? 'Hide details pane' : 'Show details pane' },
                // The Recycle Bin only takes what is deleted into it.
                ...(this.isRecycle && {
                    paste: { hidden: true },
                    pasteShortcut: { hidden: true },
                    newFolder: { hidden: true },
                    newTextFile: { hidden: true }
                })
            });
        },

        restoreItem(item) {
            OsWindowing.fileMenuHandlers(this.explorerOs(), item, this.pathOf(item)).restore();
            this.playSound('click');
        },

        emptyBin() {
            this.emptyRecycleBin();
        }
    }));
});
