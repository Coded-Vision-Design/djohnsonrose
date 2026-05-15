// assets/js/components/apps/system.js
document.addEventListener('alpine:init', () => {
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
                const imgPath = window.portfolioConfig.imgPath;
                if (win.app === 'vscode') icon = `<img src="${imgPath}vscode.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'edge') icon = `<img src="${imgPath}chrome.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'outlook') icon = `<img src="${imgPath}outlook.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'word') icon = `<img src="${imgPath}word.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'pdfreader') icon = `<img src="${imgPath}pdf.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'explorer') icon = `<img src="${imgPath}explorer.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'terminal') icon = `<img src="${imgPath}terminal.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'settings') icon = `<img src="${imgPath}settings.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'taskmanager') icon = `<img src="${imgPath}taskmanager.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'excel') icon = `<img src="${imgPath}excel.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'powerpoint') icon = `<img src="${imgPath}powerpoint.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'photoshop') icon = `<img src="${imgPath}photoshop.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'filezilla') icon = `<img src="${imgPath}filezilla.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'calculator') icon = `<img src="${imgPath}calculator.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'database') icon = `<img src="${imgPath}mssql.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'putty') icon = `<img src="${imgPath}putty.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'flstudio') icon = `<img src="${imgPath}fl studio.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'references') icon = `<img src="${imgPath}notepad++.webp" class="w-4 h-4 object-contain">`;
                else if (win.app === 'admin') icon = `<img src="${imgPath}mssql.webp" class="w-4 h-4 object-contain">`;

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
        summary: "An ambitious, self-motivated IT Systems Administrator with a proven track record in supporting Microsoft and Apple systems. Expert in root cause analysis, ITIL processes, and high-pressure problem solving. Senior Desktop Developer specialising in SCCM, JAMF, and enterprise-scale deployments.",
        philosophy: "Technique over brute force. Whether managing >8000 devices at UEA or competing at the highest levels of Brazilian Jiu-Jitsu, I prioritize precision, efficient troubleshooting, and clear communication of complex technical concepts.",
        experience: [],
        certs: [],
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
                this.experience = data.experience;
                this.certs = data.certifications;
                this.skills = data.skills;
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
});
