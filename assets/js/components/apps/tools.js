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

        init() {
            this.updateFromStore();
            this.$watch('$store.os.windows', () => this.updateFromStore(), { deep: true });
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
            this.dialogPath = 'C:\\Users\\DeVante\\Documents';
        },

        navigateDialog(path) {
            this.dialogPath = path;
            this.selectedDialogFile = null;
        },

        handleDialogAction(file) {
            if (file.type === 'folder') {
                this.navigateDialog(this.dialogPath + (this.dialogPath.endsWith('\\') ? '' : '\\') + file.name);
                return;
            }

            this.selectedDialogFile = file;
            this.fileNameInput = file.name;
        },

        confirmDialog() {
            if (!this.selectedDialogFile && this.showDialog === 'open') return;

            if (this.showDialog === 'open') {
                this.content = this.selectedDialogFile.content || '';
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
        },

        linkify(text) {
            if (!text) return '';
            // Escaped first, as this goes through x-html.
            const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            return safe.replace(urlPattern, '<a href="$1" target="_blank" rel="noopener" class="text-blue-500 hover:underline cursor-pointer">$1</a>');
        }
    }));

    // FileZilla App Logic
    Alpine.data('filezillaApp', () => ({
        host: '',
        user: '',
        pass: '',
        port: '',
        isConnected: false,
        isConnecting: false,
        logs: [
            { type: 'status', text: 'Disconnected from server' }
        ],
        localPath: 'C:\\Users\\DeVante',
        remotePath: '/',
        
        connect() {
            if (!this.host) return;
            this.isConnecting = true;
            this.logs.push({ type: 'command', text: `Command: open sftp://${this.user}@${this.host}:${this.port || 22}` });
            
            setTimeout(() => {
                this.logs.push({ type: 'status', text: 'Status: Connecting to ' + this.host + '...' });
                setTimeout(() => {
                    this.logs.push({ type: 'status', text: 'Status: Using username "' + this.user + '".' });
                    this.logs.push({ type: 'status', text: 'Status: Connected to ' + this.host });
                    this.logs.push({ type: 'command', text: 'Command: remote path is "/"' });
                    this.logs.push({ type: 'status', text: 'Status: Listing directory /...' });
                    this.logs.push({ type: 'status', text: 'Status: Directory listing of "/" successful' });
                    this.isConnecting = false;
                    this.isConnected = true;
                }, 1000);
            }, 500);
        },

        disconnect() {
            this.isConnected = false;
            this.logs.push({ type: 'status', text: 'Status: Disconnected from server' });
        }
    }));

    // Password-protected references vault. Fetches /data/references.enc.json
    // and decrypts it client-side with Web Crypto. Same blob the v2 React
    // component uses.
    Alpine.data('referencesVault', () => ({
        envelope: null,
        loadError: null,
        password: '',
        busy: false,
        error: null,
        refs: null,
        selected: 0,

        async init() {
            try {
                const r = await fetch(window.portfolioConfig.basePath + 'data/references.enc.json', { credentials: 'same-origin' });
                if (!r.ok) throw new Error(`No vault file (${r.status})`);
                this.envelope = await r.json();
            } catch (e) {
                this.loadError = e.message;
            }
            try {
                const cached = sessionStorage.getItem('references.session');
                if (cached) this.refs = JSON.parse(cached);
            } catch (_) { /* ignore */ }
        },

        _b64ToBytes(b64) {
            const raw = atob(b64);
            const out = new Uint8Array(raw.length);
            for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
            return out;
        },

        async unlock() {
            if (!this.envelope || !this.password) return;
            this.busy = true;
            this.error = null;
            try {
                const salt = this._b64ToBytes(this.envelope.salt);
                const iv = this._b64ToBytes(this.envelope.iv);
                const ciphertext = this._b64ToBytes(this.envelope.ciphertext);
                const keyMaterial = await crypto.subtle.importKey(
                    'raw', new TextEncoder().encode(this.password),
                    { name: 'PBKDF2' }, false, ['deriveKey']
                );
                const key = await crypto.subtle.deriveKey(
                    { name: 'PBKDF2', salt, iterations: this.envelope.iterations, hash: 'SHA-256' },
                    keyMaterial,
                    { name: 'AES-GCM', length: 256 }, false, ['decrypt']
                );
                const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
                const decoded = new TextDecoder().decode(plaintext);
                this.refs = JSON.parse(decoded);
                this.selected = 0;
                sessionStorage.setItem('references.session', decoded);
                this.password = '';
            } catch (_) {
                this.error = 'Incorrect password.';
            } finally {
                this.busy = false;
            }
        },

        lock() {
            sessionStorage.removeItem('references.session');
            this.refs = null;
            this.selected = 0;
        },
    }));
});
