// assets/js/components/apps.js
document.addEventListener('alpine:init', () => {
    // Word App Logic
    Alpine.data('wordApp', () => ({
        content: '',
        fontSize: 11,
        fontFamily: 'Calibri',
        isBold: false,
        isItalic: false,
        isUnderline: false,
        alignment: 'left',
        
        init() {
            // Load initial content from the CV partial if needed
            this.$nextTick(() => {
                const cvContent = document.querySelector('#word-document-content');
                if (cvContent) {
                    this.content = cvContent.innerText;
                }
            });
        },

        execCommand(command, value = null) {
            document.execCommand(command, false, value);
            this.updateState();
        },

        updateState() {
            this.isBold = document.queryCommandState('bold');
            this.isItalic = document.queryCommandState('italic');
            this.isUnderline = document.queryCommandState('underline');
            this.alignment = document.queryCommandValue('justifyLeft') === 'true' ? 'left' : 
                             document.queryCommandValue('justifyCenter') === 'true' ? 'center' : 
                             document.queryCommandValue('justifyRight') === 'true' ? 'right' : 'left';
        },

        print() {
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>Print Document</title>
                        <style>
                            body { font-family: ${this.fontFamily}, sans-serif; padding: 20px; }
                            @media print { .no-print { display: none; } }
                        </style>
                    </head>
                    <body>
                        ${document.querySelector('[contenteditable]').innerHTML}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        }
    }));

    // Outlook App Logic
    Alpine.data('outlookApp', () => ({
        recipient: 'devante@johnson-rose.co.uk',
        subject: 'Project Inquiry - Portfolio OS',
        body: 'Hi,\n\nI was browsing your portfolio and would like to get in touch regarding...',
        isSending: false,
        attachments: [],
        honeypot: '', // Honeypot field
        
        async send() {
            if (this.isSending) return;
            if (this.honeypot) {
                console.warn('Spam detected via honeypot');
                alert('Message sent successfully!'); // Fake success for bots
                return;
            }
            
            this.isSending = true;

            try {
                const formData = new FormData();
                formData.append('recipient', this.recipient);
                formData.append('subject', this.subject);
                formData.append('body', this.body);
                formData.append('website_hp', this.honeypot);
                
                this.attachments.forEach((file, index) => {
                    formData.append(`attachment_${index}`, file);
                });

                const response = await fetch(window.portfolioConfig.basePath + 'api/send_email.php', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    Alpine.store('os').logEvent('Outlook', 'Information', `Email sent via no-reply to ${this.recipient}`);
                    alert('Email sent successfully via our secure server!');
                    this.subject = '';
                    this.body = '';
                    this.attachments = [];
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (e) {
                alert('Failed to send email. Check if the database is running.');
            } finally {
                this.isSending = false;
            }
        },

        sendViaPersonalMail() {
            const mailto = `mailto:${this.recipient}?subject=${encodeURIComponent(this.subject)}&body=${encodeURIComponent(this.body)}`;
            window.location.href = mailto;
            Alpine.store('os').logEvent('Outlook', 'Information', `External mail client opened for ${this.recipient}`);
        },

        triggerAttach() {
            this.$refs.fileInput.click();
        },

        handleFileSelect(e) {
            const files = Array.from(e.target.files);
            this.attachments.push(...files);
        },

        removeAttachment(index) {
            this.attachments.splice(index, 1);
        }
    }));

    // VS Code App Logic
    Alpine.data('vscodeApp', () => ({
        activeFile: 'English Open BJJ',
        explorerOpen: true,
        activeTab: 'editor', // 'editor' or 'terminal'
        terminalOutput: [],
        isBuilding: false,
        
        init() {
            this.terminalOutput = [
                { type: 'info', text: 'Microsoft (R) Build Engine version 17.0.0' },
                { type: 'info', text: 'Copyright (C) Microsoft Corporation. All rights reserved.' },
                { type: 'command', text: 'PS C:\\Users\\DeVante> git status' },
                { type: 'info', text: 'On branch main' },
                { type: 'info', text: 'Your branch is up to date with \'origin/main\'.' },
                { type: 'info', text: 'nothing to commit, working tree clean' }
            ];
        },

        runBuild() {
            if (this.isBuilding) return;
            this.isBuilding = true;
            this.activeTab = 'terminal';
            
            const steps = [
                { type: 'command', text: `PS C:\\Users\\DeVante> npm run build --project "${this.activeFile}"` },
                { type: 'info', text: '> vite build' },
                { type: 'info', text: 'transforming...' },
                { type: 'info', text: '✓ 142 modules transformed.' },
                { type: 'info', text: 'rendering chunks...' },
                { type: 'success', text: 'dist/assets/index.js   42.12 kB │ gzip: 12.01 kB' },
                { type: 'success', text: 'dist/assets/index.css   18.45 kB │ gzip: 5.12 kB' },
                { type: 'success', text: '✓ built in 1.24s' }
            ];

            let i = 0;
            const interval = setInterval(() => {
                this.terminalOutput.push(steps[i]);
                i++;
                if (i >= steps.length) {
                    clearInterval(interval);
                    this.isBuilding = false;
                }
                // Scroll to bottom of terminal
                this.$nextTick(() => {
                    const term = document.querySelector('#vscode-terminal');
                    if (term) term.scrollTop = term.scrollHeight;
                });
            }, 300);
        },

        selectFile(name) {
            this.activeFile = name;
            this.runBuild();
        }
    }));

    // Database Explorer Logic
    Alpine.data('databaseApp', () => ({
        activeTable: 'projects',
        data: null,
        loading: true,
        results: null,
        error: null,
        
        async init() {
            try {
                const response = await fetch(window.portfolioConfig.basePath + 'data/portfolio.json');
                this.data = await response.json();
                this.loading = false;
            } catch (e) {
                console.error('Failed to load database:', e);
            }
        },

        async executeQuery() {
            const editor = document.querySelector('[contenteditable="true"]');
            if (!editor) return;
            
            this.loading = true;
            this.error = null;
            this.results = null;

            const query = editor.innerText;

            try {
                const response = await fetch(window.portfolioConfig.basePath + 'api/database_query.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                
                const result = await response.json();
                
                if (result.error) {
                    this.error = result.error;
                } else {
                    this.results = result;
                }
            } catch (e) {
                this.error = 'Failed to execute query';
            } finally {
                this.loading = false;
            }
        },

        get tableData() {
            if (this.results) return this.results.data;
            if (!this.data || !this.activeTable) return [];
            return this.data[this.activeTable] || [];
        },

        get columns() {
            if (this.results) return this.results.columns;
            if (!this.data || !this.data.schema) return [];
            return this.data.schema[this.activeTable] || [];
        }
    }));

    // Video App Logic
    Alpine.data('videoApp', () => ({
        playing: false,
        currentTime: 0,
        duration: 0,
        progress: 0,
        volume: 1,
        videoUrl: '',
        videoName: '',

        init() {
            this.updateFromStore();
            this.$watch('$store.os.windows', () => this.updateFromStore(), { deep: true });

            this.$nextTick(() => {
                const player = this.$refs.videoPlayer;
                if (player) {
                    player.load(); // Ensure video is loaded
                    player.onloadedmetadata = () => {
                        this.duration = player.duration;
                    };
                }
            });
        },

        updateFromStore() {
            const win = Alpine.store('os').windows.find(w => w.app === 'video' && (w.focused || !this.videoUrl));
            if (win) {
                this.videoUrl = win.videoUrl;
                this.videoName = win.title;
            }
        },

        togglePlay() {
            const player = this.$refs.videoPlayer;
            if (player.paused) {
                player.play();
                this.playing = true;
            } else {
                player.pause();
                this.playing = false;
            }
        },

        updateProgress() {
            const player = this.$refs.videoPlayer;
            this.currentTime = player.currentTime;
            this.progress = (this.currentTime / this.duration) * 100;
        },

        seek(e) {
            const player = this.$refs.videoPlayer;
            const rect = e.target.closest('.relative.h-1').getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            player.currentTime = pos * this.duration;
        },

        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },

        toggleFullscreen() {
            const player = this.$refs.videoPlayer;
            if (player.requestFullscreen) {
                player.requestFullscreen();
            }
        }
    }));

    // PDF Reader App Logic
    Alpine.data('pdfReaderApp', () => ({
        pdfUrl: '',
        fileName: '',
        init() {
            // Force immediate check
            this.updateFromStore();
            
            // Watch for focus changes or property updates on windows
            this.$watch('$store.os.windows', () => {
                this.updateFromStore();
            }, { deep: true });
        },
        updateFromStore() {
            // Find the active pdfreader window
            const win = Alpine.store('os').windows.find(w => w.app === 'pdfreader' && (w.focused || !this.pdfUrl));
            if (win) {
                // Priority: window data > fallback
                this.pdfUrl = win.pdfUrl || (window.portfolioConfig.basePath + 'data/cv.pdf');
                this.fileName = win.title;
            } else if (!this.pdfUrl) {
                // Hard fallback for initialization
                this.pdfUrl = window.portfolioConfig.basePath + 'data/cv.pdf';
                this.fileName = 'CV - DeVanté Johnson-Rose.pdf';
            }
        }
    }));

    // Task Manager App Logic
    Alpine.data('taskManagerApp', () => ({
        processes: [],
        cpu: 0,
        ram: 0,
        network: 0,
        uptime: '0:00:00',
        startTime: Date.now(),
        init() {
            this.updateStats();
            setInterval(() => this.updateStats(), 2000);
            this.updateUptime();
            setInterval(() => this.updateUptime(), 1000);
        },
        updateStats() {
            const osStore = Alpine.store('os');
            this.processes = osStore.windows.map(win => {
                let icon = '⚙️';
                if (win.app === 'vscode') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}vscode.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'edge') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}chrome.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'outlook') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}outlook.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'word') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}word.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'pdfreader') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}pdf.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'explorer') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}explorer.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'terminal') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}terminal.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'settings') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}settings.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'taskmanager') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}taskmanager.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'excel') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}excel.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'powerpoint') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}powerpoint.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'photoshop') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}photoshop.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'filezilla') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}filezilla.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'calculator') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}calculator.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'database') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}mssql.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'putty') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}putty.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'flstudio') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}fl studio.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'references') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}notepad++.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'admin') icon = `<img src="${osStore.settings.imgPath || window.portfolioConfig.imgPath}mssql.webp" class="w-4 h-4 object-contain">`;

                return {
                    id: win.id,
                    name: win.title,
                    icon: icon,
                    cpu: Math.floor(Math.random() * 5) + (win.focused ? 2 : 0),
                    ram: Math.floor(Math.random() * 100) + 150,
                    network: Math.random() > 0.7 ? (Math.random() * 2).toFixed(1) : 0,
                    status: win.minimized ? 'Suspended' : 'Running'
                };
            });
            
            // Total stats
            this.cpu = this.processes.reduce((acc, p) => acc + p.cpu, 5) + Math.floor(Math.random() * 5);
            this.ram = this.processes.reduce((acc, p) => acc + p.ram, 2400) + Math.floor(Math.random() * 200);
            this.network = (parseFloat(this.processes.reduce((acc, p) => acc + parseFloat(p.network), 0)) + Math.random()).toFixed(1);
        },
        updateUptime() {
            const loginTime = parseInt(localStorage.getItem('auth.loginTime')) || this.startTime;
            const diff = Math.floor((Date.now() - loginTime) / 1000);
            const h = Math.floor(diff / 3600);
            const m = Math.floor((diff % 3600) / 60);
            const s = diff % 60;
            this.uptime = `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        },
        endTask(id) {
            Alpine.store('os').closeWindow(id);
        }
    }));

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

    // Event Viewer Logic
    Alpine.data('eventViewerApp', () => ({
        selectedLog: null,
        filter: 'All',
        get logs() {
            const allLogs = Alpine.store('os').eventLogs;
            if (this.filter === 'All') return allLogs;
            return allLogs.filter(l => l.level === this.filter);
        },
        init() {
            if (this.logs.length > 0) this.selectedLog = this.logs[0];
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

    // Settings App Logic
    Alpine.data('settingsApp', () => ({
        _currentTab: 'system',
        get currentTab() {
            const win = Alpine.store('os').windows.find(w => w.app === 'settings' && w.focused);
            return win?.currentTab || this._currentTab;
        },
        set currentTab(val) {
            this._currentTab = val;
            const win = Alpine.store('os').windows.find(w => w.app === 'settings' && w.focused);
            if (win) win.currentTab = val;
        },
        user: {
            name: 'DeVanté Johnson-Rose',
            avatar: window.portfolioConfig.imgPath + 'profile.png'
        },
        nav: [
            { id: 'system', label: 'System', icon: '💻' },
            { id: 'personalisation', label: 'Personalisation', icon: '🎨' },
            { id: 'experience', label: 'Experience', icon: '🏢' },
            { id: 'qualifications', label: 'Qualifications', icon: '🎓' },
            { id: 'about', label: 'About', icon: 'ℹ️' }
        ],
        summary: "Applications Support Engineer and Full-Stack Developer with enterprise infrastructure experience across finance, education, and global technology. Specialises in automation, deployment workflows, integrations, and scalable software delivery, pairing hands-on systems engineering with full-stack development and AI-assisted tooling.",
        philosophy: "Technique over brute force. Whether managing 8,000+ devices at UEA or competing internationally in Brazilian Jiu-Jitsu, I prioritise precision, efficient troubleshooting, and clear communication of complex technical concepts.",
        experience: [],
        certs: [],
        education: [],
        skills: { frameworks: [], tools: [], operations: [], apis: [] },
        wallpapers: [
            { id: 'Bloom', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop' },
            { id: 'Flow', url: 'https://images.unsplash.com/photo-1635776062127-d379bfcba9f8?q=80&w=1974&auto=format&fit=crop' },
            { id: 'Glow', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1974&auto=format&fit=crop' },
            { id: 'Sunrise', url: 'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?q=80&w=1970&auto=format&fit=crop' },
            { id: 'Urban', url: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?q=80&w=1920&auto=format&fit=crop' },
            { id: 'Nature', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1920&auto=format&fit=crop' }
        ],
        selectedWallpaper: null,
        async init() {
            const osStore = Alpine.store('os');
            this.selectedWallpaper = osStore.settings.wallpaper;
            
            // Load career data
            try {
                const response = await fetch(window.portfolioConfig.basePath + 'data/portfolio.json');
                const data = await response.json();
                this.experience = data.experience || [];
                this.certs = data.certifications || [];
                this.skills = data.skills || { frameworks: [], tools: [], operations: [], apis: [] };
                this.education = data.education || [];
                if (data.summary) this.summary = data.summary;
                if (data.philosophy) this.philosophy = data.philosophy;
            } catch (e) {
                console.error('Failed to load portfolio data for settings:', e);
            }

            // Restore tab from window state if available
            const win = osStore.windows.find(w => w.app === 'settings');
            if (win && win.currentTab) {
                this._currentTab = win.currentTab;
            }
        },
        setWallpaper(url) {
            this.selectedWallpaper = url;
            // Real-time update for preview
            Alpine.store('os').previewWallpaper = url;
        },
        saveWallpaper() {
            if (!this.selectedWallpaper) return;
            Alpine.store('os').setWallpaper(this.selectedWallpaper);
            Alpine.store('os').logEvent('Settings', 'Information', 'Desktop wallpaper saved');
        },
        toggleTheme() {
            const newTheme = Alpine.store('os').settings.theme === 'dark' ? 'light' : 'dark';
            Alpine.store('os').settings.theme = newTheme;
            localStorage.setItem('settings.theme', newTheme);
            Alpine.store('os').logEvent('Settings', 'Information', `Theme changed to ${newTheme}`);
        },
        toggleSound() {
            Alpine.store('os').settings.sound = !Alpine.store('os').settings.sound;
            localStorage.setItem('settings.sound', Alpine.store('os').settings.sound);
            Alpine.store('os').logEvent('Settings', 'Information', `System sounds ${Alpine.store('os').settings.sound ? 'enabled' : 'disabled'}`);
        }
    }));

    // Docker Desktop App – realistic containers (Node.js, Nextcloud, Postgres), start/stop, CLI output
    Alpine.data('dockerApp', () => {
        const makeContainers = () => [
            { id: 'a1b2c3d4e5f6', name: 'node-app', image: 'node:20-alpine', status: 'running', statusLabel: 'Up 2 hours', ports: '0.0.0.0:3000->3000/tcp', created: '2 days ago' },
            { id: 'b2c3d4e5f6a7', name: 'nextcloud', image: 'nextcloud:apache', status: 'running', statusLabel: 'Up 5 hours', ports: '0.0.0.0:8080->80/tcp', created: '1 week ago' },
            { id: 'c3d4e5f6a7b8', name: 'postgres-db', image: 'postgres:16-alpine', status: 'exited', statusLabel: 'Exited (0) 3 days ago', ports: '0.0.0.0:5432->5432/tcp', created: '2 weeks ago' },
        ];
        return {
            activeView: 'containers',
            searchQuery: '',
            selectedId: null,
            containerDetailTab: 'logs',
            containers: makeContainers(),
            lastCommand: '',
            cliOutput: [],

            get filteredContainers() {
                const q = (this.searchQuery || '').toLowerCase().trim();
                if (!q) return this.containers;
                return this.containers.filter(c =>
                    c.name.toLowerCase().includes(q) ||
                    c.image.toLowerCase().includes(q) ||
                    c.id.toLowerCase().includes(q)
                );
            },

            runDockerCommand(cmd, lines) {
                this.lastCommand = cmd;
                this.cliOutput = (lines || []).map(t => (typeof t === 'string' ? { text: t, type: 'out' } : t));
            },

            startContainer(c) {
                if (c.status === 'running') return;
                c.status = 'running';
                c.statusLabel = 'Up 2 seconds';
                this.runDockerCommand(`docker start ${c.id}`, [c.id]);
            },

            stopContainer(c) {
                if (c.status !== 'running') return;
                c.status = 'exited';
                c.statusLabel = 'Exited (0) just now';
                this.runDockerCommand(`docker stop ${c.id}`, [c.id]);
            },

            restartContainer(c) {
                if (c.status !== 'running') return;
                c.statusLabel = 'Restarting...';
                this.runDockerCommand(`docker restart ${c.id}`, [c.id]);
                setTimeout(() => {
                    c.statusLabel = 'Up 1 second';
                }, 600);
            },

            get selectedContainer() {
                return this.selectedId ? this.containers.find(c => c.id === this.selectedId) : null;
            },

            get containerLogs() {
                const c = this.selectedContainer;
                if (!c) return [];
                if (c.name === 'node-app') return ['Server listening on port 3000', 'GET / 200', 'GET /api/health 200'];
                if (c.name === 'nextcloud') return ['apache2 -D FOREGROUND', 'AH00558: apache2: Could not reliably determine...', '[Tue Feb 02 10:00:00.000000 2026] [mpm_prefork:notice]'];
                if (c.name === 'postgres-db') return ['database system is ready to accept connections', 'LOG:  checkpoint starting'];
                return ['(no logs)'];
            },

            get containerInspect() {
                const c = this.selectedContainer;
                if (!c) return '{}';
                return JSON.stringify({
                    Id: c.id,
                    Name: '/' + c.name,
                    State: { Status: c.status, Running: c.status === 'running' },
                    Config: { Image: c.image },
                    NetworkSettings: { Ports: c.ports || {} },
                }, null, 2);
            },
        };
    });

    // Password-protected references vault — fetches /data/references.enc.json
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
