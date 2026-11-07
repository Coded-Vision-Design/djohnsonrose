// assets/js/components/apps/tools.js
document.addEventListener('alpine:init', () => {
    // Notepad App Logic
    Alpine.data('notepadApp', () => ({
        content: '',
        isEditing: false,
        showFileMenu: false,
        showDialog: null, // 'open' or 'save'
        dialogPath: 'C:\\Users\\DeVante\\Documents',
        fileNameInput: 'document.txt',
        selectedDialogFile: null,
        currentFile: null,
        fileTypeFilter: 'txt', // 'txt' or 'all'
        loadedRevision: null,
        menus: OsWindowing.NOTEPAD_MENUS,
        options: OsWindowing.readNotepadOptions(localStorage.getItem(OsWindowing.NOTEPAD_OPTIONS_KEY)),
        openMenuId: null,
        undoStack: [],
        selection: { start: 0, end: 0 },
        findMode: null, // 'find' or 'replace'
        findQuery: '',
        replaceQuery: '',
        matchCase: false,
        findMessage: '',
        rootEl: null,

        get textBox() {
            return this.rootEl.querySelector('[data-notepad-text]');
        },

        get hasSelection() {
            return this.selection.start !== this.selection.end;
        },

        get caret() {
            return OsWindowing.lineColumn(this.content, this.selection.end);
        },

        get parts() {
            const mark = this.findMode && this.hasSelection ? this.selection : null;
            return OsWindowing.textParts(this.content, mark);
        },

        get textClass() {
            return [
                this.options.monospace ? 'font-mono' : 'font-sans',
                this.options.wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre overflow-auto'
            ].join(' ');
        },

        get textStyle() {
            return `font-size: ${(14 * this.options.zoom) / 100}px`;
        },

        // The shared commands in text-ops.js work through this.
        get editor() {
            return {
                read: () => ({ text: this.content, ...this.currentSelection() }),
                write: (state, remember = true) => {
                    if (remember && state.text !== this.content) {
                        this.undoStack = OsWindowing.pushUndo(this.undoStack, this.content);
                    }
                    this.content = state.text;
                    this.selection = { start: state.start, end: state.end };
                    this.startEditing();
                },
                popUndo: () => {
                    const text = this.undoStack[this.undoStack.length - 1];
                    this.undoStack = this.undoStack.slice(0, -1);
                    return text ?? null;
                },
                copy: (text) => OsWindowing.copyText(text),
                paste: () => navigator.clipboard.readText().catch(() => null),
                openFind: (mode) => this.openFind(mode),
                findNext: () => this.findAgain(),
                option: (name) => this.options[name],
                setOption: (name, value) => {
                    this.options = { ...this.options, [name]: value };
                    localStorage.setItem(OsWindowing.NOTEPAD_OPTIONS_KEY, JSON.stringify(this.options));
                },
                now: () => new Date(),
                toast: (message) => Alpine.store('os').showToast(message)
            };
        },

        currentSelection() {
            const box = this.textBox;
            return box ? { start: box.selectionStart, end: box.selectionEnd } : this.selection;
        },

        trackSelection() {
            this.selection = this.currentSelection();
        },

        startEditing() {
            this.isEditing = true;
            this.$nextTick(() => this.placeCaret());
        },

        // The text box also calls this as it is created, while still inside the tap,
        // as a phone only raises its keyboard for focus that comes from a tap.
        placeCaret() {
            const box = this.textBox;
            if (!box) return;
            box.focus();
            box.setSelectionRange(this.selection.start, this.selection.end);
        },

        onInput(e) {
            this.undoStack = OsWindowing.pushUndo(this.undoStack, this.content);
            this.content = e.target.value;
            this.trackSelection();
        },

        run(id) {
            this.openMenuId = null;
            OsWindowing.notepadCommands(this.editor)[id]();
        },

        isDisabled(item) {
            if (item.id === 'undo') return this.undoStack.length === 0;
            if (['cut', 'copy', 'delete'].includes(item.id)) return !this.hasSelection;
            if (item.id === 'findNext') return !this.findQuery;
            return false;
        },

        openFind(mode) {
            const selected = OsWindowing.selectedText(this.editor.read());
            if (selected) this.findQuery = selected;
            this.findMode = mode;
            this.findMessage = '';
            this.$nextTick(() => this.rootEl.querySelector('[data-find-input]')?.focus());
        },

        closeFind() {
            this.findMode = null;
            this.findMessage = '';
        },

        showMatch(state) {
            this.selection = { start: state.start, end: state.end };
            this.isEditing = false;
            this.$nextTick(() => this.rootEl.querySelector('[data-notepad-mark]')?.scrollIntoView({ block: 'nearest' }));
        },

        findAgain() {
            if (!this.findQuery) {
                this.openFind('find');
                return;
            }
            const found = OsWindowing.findNext(this.content, this.findQuery, this.selection.end, { matchCase: this.matchCase });
            this.findMessage = found ? '' : `Cannot find "${this.findQuery}"`;
            if (found) this.showMatch(found);
        },

        replaceOne() {
            const state = { text: this.content, ...this.selection };
            const next = OsWindowing.replaceNext(state, this.findQuery, this.replaceQuery, { matchCase: this.matchCase });
            if (next.text !== this.content) this.undoStack = OsWindowing.pushUndo(this.undoStack, this.content);
            this.content = next.text;
            this.showMatch(next);
        },

        replaceEverything() {
            const { text, count } = OsWindowing.replaceAll(this.content, this.findQuery, this.replaceQuery, { matchCase: this.matchCase });
            if (count) this.undoStack = OsWindowing.pushUndo(this.undoStack, this.content);
            this.content = text;
            this.selection = { start: 0, end: 0 };
            this.findMessage = `${count} replaced`;
        },

        handleKey(e) {
            if (!this.isFocused) return;
            const key = e.key.toLowerCase();
            const command = e.ctrlKey || e.metaKey;
            if (command && key === 's') {
                e.preventDefault();
                this.save();
            } else if (command && key === 'o') {
                e.preventDefault();
                this.openDialog('open');
            } else {
                const id = OsWindowing.notepadShortcut(e);
                const inFind = e.target.closest?.('[data-notepad-find]');
                if (!id || (inFind && id !== 'findNext')) return;
                e.preventDefault();
                this.run(id);
            }
        },

        init() {
            // Kept now, as $root finds nothing once x-if has removed the element that
            // was clicked, which is what happens when the text box replaces the preview.
            this.rootEl = this.$root;
            this.updateFromStore();
            this.$watch('$store.os.windows', () => this.updateFromStore(), { deep: true });
            // The text on screen, and its file, go with a switch to the other build.
            const win = Alpine.store('os').windows.find(w => w.app === 'notepad');
            if (win) this.stopSharing = OsWindowing.shareLiveExtras(win.id, () => ({ content: this.content, filePath: this.currentFile?.path }));
        },

        destroy() {
            this.stopSharing?.();
        },

        updateFromStore() {
            const win = Alpine.store('os').windows.find(w => w.app === 'notepad');
            if (!win || win.fileContent === undefined) return;

            // This runs on every window change, so only load a newly opened file.
            // Loading it again would overwrite whatever the visitor has typed.
            const revision = win.fileRevision ?? 0;
            if (revision === this.loadedRevision) return;
            this.loadedRevision = revision;

            this.content = win.fileContent;
            this.undoStack = [];
            this.selection = { start: 0, end: 0 };
            this.currentFile = { name: win.title, path: win.filePath || 'C:\\Users\\DeVante\\Desktop' };
        },

        get dialogFiles() {
            const fs = Alpine.store('os').fileSystem;
            const files = fs[this.dialogPath] || [];
            
            if (this.fileTypeFilter === 'txt') {
                return files.filter(f => f.type === 'folder' || f.name.endsWith('.txt'));
            }
            return files;
        },

        openDialog(type) {
            this.showDialog = type;
            this.showFileMenu = false;
            this.selectedDialogFile = null;
            this.fileTypeFilter = 'txt';
            this.dialogPath = this.currentFile?.path ?? 'C:\\Users\\DeVante\\Documents';
            if (this.currentFile) this.fileNameInput = this.currentFile.name;
        },

        save() {
            if (!this.currentFile) {
                this.openDialog('save');
                return;
            }
            this.dialogPath = this.currentFile.path;
            this.fileNameInput = this.currentFile.name;
            this.saveFile();
            this.showFileMenu = false;
        },

        get isFocused() {
            const win = Alpine.store('os').windows.find(w => w.app === 'notepad');
            return win?.id === Alpine.store('os').focusedWindowId;
        },

        navigateDialog(path) {
            this.dialogPath = path;
            this.selectedDialogFile = null;
        },

        handleDialogAction(file) {
            if (file.type === 'folder') {
                this.navigateDialog(OsWindowing.folderPath(file, this.dialogPath));
                return;
            }

            this.selectedDialogFile = file;
            this.fileNameInput = file.name;
        },

        confirmDialog() {
            if (!this.selectedDialogFile && this.showDialog === 'open') return;

            if (this.showDialog === 'open') {
                this.content = this.selectedDialogFile.content || '';
                this.undoStack = [];
                this.selection = { start: 0, end: 0 };
                this.currentFile = { name: this.selectedDialogFile.name, path: this.dialogPath };
                this.showDialog = null;
                
                const win = Alpine.store('os').windows.find(w => w.app === 'notepad');
                if (win) win.title = this.selectedDialogFile.name;
            } else {
                this.saveFile();
            }
        },

        saveFile() {
            const name = this.fileNameInput.endsWith('.txt') ? this.fileNameInput : this.fileNameInput + '.txt';
            const file = {
                name: name,
                type: 'file',
                icon: window.portfolioConfig.imgPath + 'notepad++.webp',
                content: this.content
            };
            
            Alpine.store('os').writeFile(this.dialogPath, file);
            this.currentFile = { name: name, path: this.dialogPath };
            this.showDialog = null;

            const win = Alpine.store('os').windows.find(w => w.app === 'notepad');
            if (win) win.title = name;
        }
    }));

    // FileZilla. The site details and both listings come from data/devtools.json,
    // and the connection log from assets/js/windowing/devtools.js, shared with v2.
    Alpine.data('filezillaApp', (site = {}) => ({
        host: site.host ?? '',
        user: site.user ?? '',
        pass: '',
        port: String(site.port ?? 22),
        isConnected: false,
        isConnecting: false,
        logs: [
            { type: 'status', text: 'Status: Disconnected from server' }
        ],
        localPath: site.localPath ?? '',
        remotePath: site.remotePath ?? '/',
        local: site.local ?? [],
        remote: site.remote ?? [],
        _timer: null,

        size(file) {
            return OsWindowing.transferSize(file);
        },

        connect() {
            if (!this.host || this.isConnecting) return;
            this.isConnecting = true;
            const steps = OsWindowing.quickconnectLog(this.host, this.user, this.port, this.remotePath);
            this._timer = setInterval(() => {
                this.logs.push(steps.shift());
                if (steps.length) return;
                clearInterval(this._timer);
                this.isConnecting = false;
                this.isConnected = true;
            }, 250);
        },

        disconnect() {
            this.isConnected = false;
            this.logs.push({ type: 'status', text: 'Status: Disconnected from server' });
        },

        destroy() {
            clearInterval(this._timer);
        }
    }));

    // Password-protected references vault. Fetches /data/references.enc.json
    // and decrypts it in the browser through assets/js/windowing/references.js,
    // shared with v2. The opened letters are forgotten on Lock and on sign-out.
    Alpine.data('referencesVault', () => ({
        envelope: null,
        loadError: null,
        password: '',
        busy: false,
        error: null,
        refs: OsWindowing.savedReferences(sessionStorage),
        selected: 0,

        // Alpine calls this once by itself; the partial must not call it again.
        async init() {
            try {
                const r = await fetch(window.portfolioConfig.basePath + 'data/references.enc.json', { credentials: 'same-origin' });
                if (!r.ok) throw new Error(`No vault file (${r.status})`);
                this.envelope = await r.json();
            } catch (e) {
                this.loadError = e.message;
            }
        },

        get current() {
            return this.refs?.[this.selected] ?? this.refs?.[0] ?? null;
        },

        async unlock() {
            if (!this.envelope || !this.password) return;
            this.busy = true;
            this.error = null;
            try {
                const { references, text } = await OsWindowing.decryptReferences(this.envelope, this.password);
                this.refs = references;
                this.selected = 0;
                OsWindowing.saveReferences(sessionStorage, text);
                this.password = '';
            } catch (_) {
                this.error = 'Incorrect password.';
            } finally {
                this.busy = false;
            }
        },

        lock() {
            OsWindowing.forgetReferences(sessionStorage);
            this.refs = null;
            this.selected = 0;
        },
    }));
});
