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

        init() {
            this.updateFromStore();
            this.$watch('$store.os.windows', () => this.updateFromStore(), { deep: true });
        },

        updateFromStore() {
            const win = Alpine.store('os').windows.find(w => w.app === 'notepad' && (w.focused || !this.content));
            if (win && win.fileContent !== undefined) {
                this.content = win.fileContent;
                this.currentFile = { name: win.title, path: win.filePath || 'C:\\Users\\DeVante\\Desktop' };
            }
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
                
                const win = Alpine.store('os').windows.find(w => w.app === 'notepad' && w.focused);
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

            const win = Alpine.store('os').windows.find(w => w.app === 'notepad' && w.focused);
            if (win) win.title = name;
        },

        linkify(text) {
            if (!text) return '';
            const urlPattern = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
            return text.replace(urlPattern, '<a href="$1" target="_blank" onclick="event.stopPropagation()" class="text-blue-500 hover:underline cursor-pointer">$1</a>');
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
});
