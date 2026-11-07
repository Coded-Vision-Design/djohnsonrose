// assets/js/components/apps/system.js
document.addEventListener('alpine:init', () => {
    // Task Manager: the same as v2's TaskManager.tsx. Every figure comes from the
    // page (the store, Web Vitals, Resource Timing, the heap) or from build.json,
    // through assets/js/windowing/metrics.js.
    let taskManagers = 0;
    Alpine.data('taskManagerApp', () => {
        // The browser's own entries stay out of Alpine's reactivity: wrapping them
        // in a proxy breaks their getters. tick tells the getters to read again.
        let entries = [];
        let buildRequest = null;
        return {
            tabs: OsWindowing.TASK_MANAGER_TABS,
            tab: 'processes',
            uid: 'tm-' + (++taskManagers),
            tick: 0,
            vitals: [],
            downloads: OsWindowing.summariseDownloads([]),
            heap: null,
            build: null,
            init() {
                this.refresh();
                this.timer = setInterval(() => this.refresh(), 1000);
            },
            destroy() {
                clearInterval(this.timer);
            },
            refresh() {
                const reading = OsWindowing.startVitals().read();
                entries = performance.getEntriesByType('resource');
                const navigation = performance.getEntriesByType('navigation')[0] ?? null;
                this.vitals = OsWindowing.vitalCards(reading);
                this.downloads = OsWindowing.summariseDownloads(entries, { navigation, full: reading.resourcesFull });
                this.heap = OsWindowing.jsHeap(performance);
                this.tick++;
            },
            get rows() {
                this.tick;
                return OsWindowing.processRows(Alpine.store('os').windows, entries);
            },
            get countText() {
                return OsWindowing.windowCountText(Alpine.store('os').windows.length);
            },
            get info() {
                return OsWindowing.buildView(this.build);
            },
            iconFor(app) {
                // Each app's own picture from data/apps.json, as in v2.
                return window.portfolioConfig.imgPath + (window.portfolioConfig.apps[app]?.icon ?? 'win11/taskmgr.webp');
            },
            toneColour(tone) {
                return OsWindowing.TONE_COLOURS[tone];
            },
            select(id) {
                this.tab = id;
                // build.json is read the first time the Build tab opens.
                if (id === 'build' && !buildRequest) {
                    buildRequest = OsWindowing.loadBuildInfo(fetch, window.portfolioConfig.basePath + 'build.json')
                        .then((result) => { this.build = result; });
                }
            },
            onTabKey(event, index) {
                const next = OsWindowing.tabAfterKey(event.key, index, this.tabs.length);
                if (next === null) return;
                event.preventDefault();
                this.select(this.tabs[next].id);
                this.$nextTick(() => this.$root.querySelectorAll('[role="tab"]')[next]?.focus());
            },
            endTask(id) {
                Alpine.store('os').closeWindow(id);
            }
        };
    });

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
            const win = Alpine.store('os').windows.find(w => w.app === 'settings');
            return win?.currentTab || this._currentTab;
        },
        set currentTab(val) {
            this._currentTab = val;
            const win = Alpine.store('os').windows.find(w => w.app === 'settings');
            if (win) win.currentTab = val;
        },
        user: {
            name: 'DeVanté Johnson-Rose',
            avatar: window.portfolioConfig.imgPath + 'profile.webp'
        },
        // Windows 11 icons, the same as v2's Settings.tsx.
        nav: [
            { id: 'system', label: 'System', icon: 'win11/display.webp' },
            { id: 'personalisation', label: 'Personalisation', icon: 'win11/personalize.webp' },
            { id: 'experience', label: 'Experience', icon: 'win11/documents.webp' },
            { id: 'qualifications', label: 'Qualifications', icon: 'win11/star.svg' },
            { id: 'about', label: 'About', icon: 'win11/thispc.webp' }
        ],
        // Replaced by data/portfolio.json, as in v2, once it loads.
        summary: 'Applications Support Engineer and Full-Stack Developer with enterprise infrastructure experience across finance, education, and global technology.',
        philosophy: 'Technique over brute force. I prioritise precision, efficient troubleshooting, and clear communication of complex technical concepts.',
        experience: [],
        certs: [],
        education: [],
        interests: [],
        skills: { frameworks: [], tools: [], operations: [], apis: [] },
        wallpapers: [
            { id: 'Bloom', url: window.portfolioConfig.imgPath + 'wallpaper-bloom.webp' },
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
                this.education = data.education || [];
                this.interests = data.interests || [];
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
        // Reset drops the preview on the desktop as well as in Settings.
        resetWallpaper() {
            this.selectedWallpaper = Alpine.store('os').settings.wallpaper;
            Alpine.store('os').previewWallpaper = null;
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
