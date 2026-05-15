// assets/js/components/os/shell.js
document.addEventListener('alpine:init', () => {
    Alpine.data('os', () => ({
        booted: false,
        isBooting: localStorage.getItem('auth.loggedIn') !== 'true',
        loggingIn: false,
        loggedIn: localStorage.getItem('auth.loggedIn') === 'true',
        user: {
            name: 'DeVante Johnson-Rose',
            avatar: window.portfolioConfig.imgPath + 'profile.png'
        },
        clock: {
            time: '',
            date: ''
        },
        weather: {
            temp: '--',
            condition: 'Loading...',
            icon: '☁️',
            city: 'London'
        },
        widgetsOpen: false,
        startMenuOpen: false,
        startMenuView: 'pinned', // 'pinned' or 'allApps'
        quickSettingsOpen: false,
        contextMenu: { open: false, x: 0, y: 0, items: [] },
        snapPreview: { show: false, x: 0, y: 0, w: 0, h: 0, opacity: 0 },
        searchQuery: '',
        touchData: {
            startX: 0,
            startY: 0,
            timer: null,
            isLongPress: false,
            lastDistance: null
        },
        
        get settings() { return Alpine.store('os').settings; },
        get windows() { return Alpine.store('os').windows; },
        get focusedWindowId() { return Alpine.store('os').focusedWindowId; },
        get pinnedApps() { return Alpine.store('os').pinnedApps; },
        get recycleBinIcon() {
            const items = Alpine.store('os').fileSystem['C:\\Recycle Bin'] || [];
            const imgPath = window.portfolioConfig?.imgPath || 'assets/img/';
            const iconName = items.length > 0 ? 'recyclebinfull.webp' : 'recyclebinempty.webp';
            return imgPath + iconName;
        },
        get batteryIcon() {
            const isCharging = this.settings.isCharging;
            const imgPath = window.portfolioConfig.imgPath + 'win11/';
            return isCharging ? imgPath + 'energy.svg' : imgPath + 'battery.svg';
        },
        emptyRecycleBin() {
            Alpine.store('os').fileSystem['C:\\Recycle Bin'] = [];
            Alpine.store('os').saveFileSystem();
            Alpine.store('os').playSound('recycle');
            Alpine.store('os').logEvent('System', 'Information', 'Recycle Bin emptied');
        },
        get desktopIcons() {
            const icons = (Alpine.store('os').fileSystem['C:\\Users\\DeVante\\Desktop'] || []);
            const taskbarHeight = 48;
            const iconHeight = 110;
            const iconWidth = 110;
            const startTop = 16;
            const startLeft = 16;
            const availableHeight = Alpine.store('os').windowHeight - taskbarHeight - 32;
            const maxPerCol = Math.max(1, Math.floor(availableHeight / iconHeight));

            // Tracking occupied slots to prevent overlaps
            const occupiedSlots = new Set();
            
            // 1. Mark 'DeVanté's PC' (it's hardcoded at 0,0)
            occupiedSlots.add("0,0");

            // 2. Mark manually positioned icons as occupied
            icons.forEach(icon => {
                const pos = this.desktopIconPositions[icon.name];
                if (pos) {
                    const col = Math.round((pos.x - startLeft) / iconWidth);
                    const row = Math.round((pos.y - startTop) / iconHeight);
                    occupiedSlots.add(`${col},${row}`);
                }
            });

            // Helper to find the next truly empty slot
            let nextAvailableSlotIndex = 0;
            const findNextEmptySlot = () => {
                while (true) {
                    const col = Math.floor(nextAvailableSlotIndex / maxPerCol);
                    const row = nextAvailableSlotIndex % maxPerCol;
                    if (!occupiedSlots.has(`${col},${row}`)) {
                        occupiedSlots.add(`${col},${row}`);
                        return { col, row };
                    }
                    nextAvailableSlotIndex++;
                }
            };

            return icons.map((icon) => {
                const pos = this.desktopIconPositions[icon.name];
                let defaultX, defaultY;

                if (pos) {
                    defaultX = pos.x;
                    defaultY = pos.y;
                } else {
                    const slot = findNextEmptySlot();
                    defaultX = startLeft + (slot.col * iconWidth);
                    defaultY = startTop + (slot.row * iconHeight);
                }

                let iconData = { ...icon, defaultX, defaultY };
                if (icon.name === 'Recycle Bin') {
                    iconData.icon = this.recycleBinIcon;
                }
                return iconData;
            });
        },
        get isMobile() { return Alpine.store('os').isMobile; },
        get isTablet() { return Alpine.store('os').isTablet; },
        get isDesktop() { return Alpine.store('os').isDesktop; },

        init() {
            this.updateClock();
            setInterval(() => this.updateClock(), 1000);
            this.fetchWeather();
            setInterval(() => this.fetchWeather(), 1800000); // 30 mins
            
            // Initialise battery status
            if ('getBattery' in navigator) {
                navigator.getBattery().then(battery => {
                    const update = () => {
                        Alpine.store('os').settings.batteryLevel = Math.round(battery.level * 100);
                        Alpine.store('os').settings.isCharging = battery.charging;
                    };
                    update();
                    battery.addEventListener('levelchange', update);
                    battery.addEventListener('chargingchange', update);
                });
            } else {
                Alpine.store('os').settings.batteryLevel = 85;
                Alpine.store('os').settings.isCharging = false;
            }
            
            // Close context menu on scroll
            window.addEventListener('scroll', () => {
                Alpine.store('os').contextMenu.open = false;
            }, true);

            if (this.isBooting) {
                setTimeout(() => {
                    this.isBooting = false;
                }, 3000);
            }

            window.addEventListener('resize', () => {
                Alpine.store('os').isMobile = window.innerWidth < 640;
                Alpine.store('os').isTablet = window.innerWidth >= 640 && window.innerWidth < 1024;
                Alpine.store('os').isDesktop = window.innerWidth >= 1024;
                Alpine.store('os').windowWidth = window.innerWidth;
                Alpine.store('os').windowHeight = window.innerHeight;

                if (window.innerWidth < 1024) {
                    this.windows.forEach(win => {
                        win.maximized = true;
                    });
                }
            });

            this.$watch('settings.brightness', (val) => {
                localStorage.setItem('settings.brightness', val);
            });

            this.$watch('settings.volume', (val) => {
                localStorage.setItem('settings.volume', val);
            });

            this.$watch('settings.wallpaper', (val) => {
                localStorage.setItem('settings.wallpaper', val);
            });

            const initialApp = window.portfolioConfig.appToOpen;
            if (this.loggedIn && initialApp) {
                setTimeout(() => this.openApp(initialApp), 100);
            }
            
            this.booted = true;
        },

        openApp(a, t, e) { Alpine.store('os').openApp(a, t, e); this.startMenuOpen = false; },
        closeWindow(id) { Alpine.store('os').closeWindow(id); },
        focusWindow(id) { Alpine.store('os').focusWindow(id); },
        toggleMinimize(id) { Alpine.store('os').toggleMinimize(id); },
        toggleMaximize(id) { Alpine.store('os').toggleMaximize(id); },
        playSound(s) { Alpine.store('os').playSound(s); },
        setWallpaper(url) { Alpine.store('os').setWallpaper(url); },
        showError(title, message, path = '') { Alpine.store('os').showError(title, message, path); },
        sendTelemetry(a, d) { Alpine.store('os').sendTelemetry(a, d); },

        async fetchWeather() {
            try {
                const res = await fetch(`${window.portfolioConfig.basePath}api/weather.php`);
                const data = await res.json();
                if (data.current_weather) {
                    this.weather.temp = Math.round(data.current_weather.temperature);
                    this.weather.city = data.city || 'London';
                    const code = data.current_weather.weathercode;
                    // Windows 11 Weather Codes Mapping
                    const conditions = {
                        0: { label: 'Clear', icon: '☀️' },
                        1: { label: 'Mainly clear', icon: '🌤️' },
                        2: { label: 'Partly cloudy', icon: '⛅' },
                        3: { label: 'Overcast', icon: '☁️' },
                        45: { label: 'Foggy', icon: '🌫️' },
                        51: { label: 'Drizzle', icon: '🌦️' },
                        61: { label: 'Rain', icon: '🌧️' },
                        71: { label: 'Snow', icon: '❄️' },
                        95: { label: 'Thunderstorm', icon: '⛈️' }
                    };
                    const condition = conditions[code] || { label: 'Cloudy', icon: '☁️' };
                    this.weather.condition = condition.label;
                    this.weather.icon = condition.icon;
                }
            } catch (e) {
                console.warn('Weather fetch failed');
            }
        },

        async toggleWidgets() {
            this.widgetsOpen = !this.widgetsOpen;
            if (this.widgetsOpen && Alpine.store('os').news.length === 0) {
                console.log('Fetching news stories...');
                try {
                    const res = await fetch(`${window.portfolioConfig.basePath}api/news.php?t=${Date.now()}`);
                    const data = await res.json();
                    console.log('News data received:', data);
                    if (data && data.news) {
                        Alpine.store('os').news = data.news;
                    }
                } catch (e) {
                    console.error('News fetch failed:', e);
                }
            }
        },

        handleTouchStart(e, action = null) {
            if (e.touches.length === 1) {
                this.touchData.startX = e.touches[0].clientX;
                this.touchData.startY = e.touches[0].clientY;
                this.touchData.isLongPress = false;
                
                this.touchData.timer = setTimeout(() => {
                    this.touchData.isLongPress = true;
                    if (action) {
                        action({ clientX: this.touchData.startX, clientY: this.touchData.startY });
                    } else {
                        this.showDesktopContextMenu({ clientX: this.touchData.startX, clientY: this.touchData.startY });
                    }
                }, 600);
            } else if (e.touches.length === 2) {
                clearTimeout(this.touchData.timer);
                this.touchData.lastDistance = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
            }
        },

        handleTouchMove(e) {
            if (e.touches.length === 1) {
                const dist = Math.hypot(
                    e.touches[0].clientX - this.touchData.startX,
                    e.touches[0].clientY - this.touchData.startY
                );
                if (dist > 10) {
                    clearTimeout(this.touchData.timer);
                }
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[0].clientX - e.touches[1].clientX,
                    e.touches[0].clientY - e.touches[1].clientY
                );
                const delta = dist - this.touchData.lastDistance;
                
                if (Math.abs(delta) > 2) {
                    const zoomChange = delta > 0 ? 0.02 : -0.02;
                    Alpine.store('os').desktopZoom = Math.min(Math.max(0.7, Alpine.store('os').desktopZoom + zoomChange), 1.3);
                    this.touchData.lastDistance = dist;
                }
            }
        },

        handleTouchEnd(e) {
            clearTimeout(this.touchData.timer);
        },

        showDesktopContextMenu(e) {
            const menuWidth = 260;
            const menuHeight = 340; // Estimated height with "Show more options"
            let x = e.clientX;
            let y = e.clientY;

            // Edge awareness / Clamping
            if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8;
            if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 8;
            if (x < 8) x = 8;
            if (y < 8) y = 8;

            const isZoomed = Alpine.store('os').desktopZoom !== 1;
            const imgPath = window.portfolioConfig.imgPath + 'win11/';

            this.contextMenu = {
                open: true,
                x: x,
                y: y,
                items: [
                    { 
                        label: 'View', 
                        icon: `<img src="${imgPath}view.svg" class="w-4 h-4">`, 
                        action: () => {} 
                    },
                    { 
                        label: 'Auto-arrange icons', 
                        icon: '✅', 
                        action: () => this.clearDesktopPositions() 
                    },
                    { 
                        label: 'Sort by', 
                        icon: `<img src="${imgPath}sort.svg" class="w-4 h-4">`, 
                        action: () => this.clearDesktopPositions() 
                    },
                    { 
                        label: 'Refresh', 
                        icon: `<img src="${imgPath}refresh.svg" class="w-4 h-4">`, 
                        action: () => { 
                            // Fake refresh animation would happen here
                            location.reload(); 
                        } 
                    },
                    { separator: true },
                    { 
                        label: 'Reset Zoom', 
                        icon: '🔍', 
                        disabled: !isZoomed,
                        action: () => { Alpine.store('os').desktopZoom = 1; } 
                    },
                    { separator: true },
                    { label: 'New', icon: '✨', disabled: true, action: () => {} },
                    { separator: true },
                    { label: 'Display settings', icon: `<img src="${imgPath}display.png" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('settings') },
                    { label: 'Personalise', icon: `<img src="${imgPath}settings.png" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('settings', 'Settings', { currentTab: 'personalisation' }) },
                    { separator: true },
                    {
                        label: 'Open in PowerShell',
                        icon: `<img src="${window.portfolioConfig.imgPath}terminal.webp" class="w-4 h-4">`,
                        action: () => Alpine.store('os').openApp('terminal')
                    },
                    { separator: true },
                    {
                        label: 'Show more options',
                        icon: '⤓',
                        action: () => this.showClassicDesktopContextMenu(e)
                    }
                ]
            };
        },

        // Win10-style "classic" context menu — opened from the Win11 modern
        // menu via the "Show more options" item. v1 was missing this; it's
        // wired now so the right-click flow matches real Windows 11.
        showClassicDesktopContextMenu(e) {
            const menuWidth = 240;
            const menuHeight = 360;
            let x = e.clientX;
            let y = e.clientY;
            if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8;
            if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 8;
            if (x < 8) x = 8;
            if (y < 8) y = 8;

            const imgPath = window.portfolioConfig.imgPath + 'win11/';

            this.contextMenu = {
                open: true,
                variant: 'classic',
                x: x,
                y: y,
                items: [
                    { label: 'View', icon: `<img src="${imgPath}view.svg" class="w-4 h-4">`, disabled: true, action: () => {} },
                    { label: 'Sort by', icon: `<img src="${imgPath}sort.svg" class="w-4 h-4">`, disabled: true, action: () => {} },
                    { label: 'Refresh', icon: `<img src="${imgPath}refresh.svg" class="w-4 h-4">`, action: () => location.reload() },
                    { separator: true },
                    { label: 'Paste', icon: `<img src="${imgPath}copy.svg" class="w-4 h-4">`, disabled: true, action: () => {} },
                    { label: 'Paste shortcut', icon: `<img src="${imgPath}open.svg" class="w-4 h-4">`, disabled: true, action: () => {} },
                    { separator: true },
                    { label: 'New', icon: '✨', disabled: true, action: () => {} },
                    { label: 'Display settings', icon: `<img src="${imgPath}display.png" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('settings') },
                    { label: 'Personalise', icon: `<img src="${imgPath}personalize.png" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('settings', 'Settings', { currentTab: 'personalisation' }) },
                    { separator: true },
                    { label: 'Open in PowerShell', icon: `<img src="${window.portfolioConfig.imgPath}terminal.webp" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('terminal') },
                ]
            };
        },

        showTaskbarContextMenu(e) {
            const menuWidth = 240;
            const menuHeight = 180;
            let x = e.clientX;
            let y = e.clientY - menuHeight;

            if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8;
            if (y < 8) y = 8;

            const imgPath = window.portfolioConfig.imgPath + 'win11/';

            this.contextMenu = {
                open: true,
                x: x,
                y: y,
                items: [
                    { label: 'Taskbar settings', icon: `<img src="${imgPath}settings.png" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('settings') },
                    { label: 'Task Manager', icon: `<img src="${imgPath}taskmgr.png" class="w-4 h-4">`, shortcut: 'Ctrl+Shift+Esc', action: () => Alpine.store('os').openApp('taskmanager') },
                    { separator: true },
                    { label: 'Desktop', icon: `<img src="${imgPath}display.png" class="w-4 h-4">`, action: () => { Alpine.store('os').windows.forEach(w => w.minimized = true); } }
                ]
            };
        },

        showAppContextMenu(e, appHandle) {
            const isPinned = this.pinnedApps.includes(appHandle);
            const isSystemApp = ['taskmanager'].includes(appHandle);
            
            const items = [];
            
            // Core apps/buttons like Start, Search, and Task Manager cannot be unpinned
            if (!isSystemApp) {
                items.push({ 
                    label: isPinned ? 'Unpin from taskbar' : 'Pin to taskbar', 
                    icon: '📌', 
                    action: () => {
                        if (isPinned) {
                            Alpine.store('os').pinnedApps = Alpine.store('os').pinnedApps.filter(a => a !== appHandle);
                        } else {
                            Alpine.store('os').pinnedApps.push(appHandle);
                        }
                    } 
                });
            }
            
            const imgPath = window.portfolioConfig.imgPath + 'win11/';
            items.push({ label: 'Task Manager', icon: `<img src="${imgPath}taskmgr.png" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('taskmanager') });
            
            const win = this.windows.find(w => w.app === appHandle);
            if (win) {
                items.push({ separator: true });
                items.push({ label: 'Close window', icon: `<img src="${imgPath}delete.png" class="w-4 h-4">`, action: () => this.closeWindow(win.id) });
            }

            this.contextMenu = {
                open: true,
                x: e.clientX,
                y: e.clientY - (items.length * 36 + 20), // Adjusted for new item height
                items: items
            };
        },

        showFileContextMenu(e, item, path) {
            const menuWidth = 260;
            const menuHeight = 320;
            let x = e.clientX;
            let y = e.clientY;

            if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8;
            if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 8;

            const imgPath = window.portfolioConfig.imgPath + 'win11/';
            
            if (item.name === 'Recycle Bin') {
                this.contextMenu = {
                    open: true,
                    x: x,
                    y: y,
                    items: [
                        { label: 'Open', icon: `<img src="${imgPath}open.svg" class="w-4 h-4">`, action: () => this.openItem(item) },
                        { label: 'Empty Recycle Bin', icon: `<img src="${imgPath}delete.svg" class="w-4 h-4">`, disabled: (Alpine.store('os').fileSystem['C:\\Recycle Bin'] || []).length === 0, action: () => Alpine.store('os').emptyRecycleBin() },
                        { separator: true },
                        { label: 'Pin to Start', icon: '📌', action: () => {} },
                        { label: 'Properties', icon: `<img src="${imgPath}properties.svg" class="w-4 h-4">`, action: () => {} }
                    ]
                };
                return;
            }

            this.contextMenu = {
                open: true,
                x: x,
                y: y,
                actions: [
                    { label: 'Cut', icon: `<img src="${imgPath}cut.svg" class="w-4 h-4">`, action: () => {} },
                    { label: 'Copy', icon: `<img src="${imgPath}copy.svg" class="w-4 h-4">`, action: () => {} },
                    { label: 'Rename', icon: `<img src="${imgPath}rename.svg" class="w-4 h-4">`, action: () => {} },
                    { label: 'Share', icon: `<img src="${imgPath}share.svg" class="w-4 h-4">`, action: () => {} },
                    { label: 'Delete', icon: `<img src="${imgPath}delete.svg" class="w-4 h-4">`, action: () => this.deleteItem(item, path) }
                ],
                items: [
                    { label: 'Open', icon: `<img src="${imgPath}open.svg" class="w-4 h-4">`, action: () => this.openItem(item) },
                    { label: 'Open file location', icon: `<img src="${imgPath}folder_open.svg" class="w-4 h-4">`, action: () => {} },
                    { separator: true },
                    { label: 'Pin to Start', icon: '📌', action: () => {} },
                    { label: 'Add to Favourites', icon: '⭐', action: () => {} },
                    { separator: true },
                    { label: 'Compress to Zip file', icon: '🗜️', action: () => {} },
                    { label: 'Copy as path', icon: '📍', action: () => {} },
                    { label: 'Properties', icon: `<img src="${imgPath}properties.svg" class="w-4 h-4">`, action: () => {} }
                ]
            };

            // Add background option for images
            if (item.type === 'image' || (item.name && (item.name.endsWith('.webp') || item.name.endsWith('.jpg') || item.name.endsWith('.jpeg')))) {
                this.contextMenu.items.splice(2, 0, { label: 'Set as desktop background', icon: `<img src="${imgPath}image.png" class="w-4 h-4">`, action: () => this.setWallpaper(item.url || (window.portfolioConfig.basePath + item.name)) });
            }
        },

        openItem(item, path = null) {
            if (item.extraData && item.extraData.locked) {
                this.playSound('error');
                const fullPath = item.fullPath || (path ? (path.endsWith('\\') ? path : path + '\\') + item.name : `C:\\Users\\DeVante\\Desktop\\${item.name}`);
                this.showError('File Access Denied', 'This document is currently locked. References are available upon request.', fullPath);
                return;
            }
            if (item.type === 'folder') {
                this.openApp('explorer', item.name, { initialPath: item.path || (path ? path + (path.endsWith('\\') ? '' : '\\') + item.name : `C:\\Users\\DeVante\\${item.name}`) });
            } else if (item.app === 'pdfreader') {
                const pdfUrl = item.pdfUrl || (item.extraData ? item.extraData.pdfUrl : (window.portfolioConfig.basePath + 'data/cv.pdf'));
                this.openApp('pdfreader', item.name, { pdfUrl: pdfUrl });
                this.sendTelemetry('Document Viewed', { name: item.name, url: pdfUrl });
            } else if (item.type === 'app') {
                this.openApp(item.app, item.name, item.extraData);
            } else if (item.type === 'image') {
                this.openApp('photos', item.name, { imageName: item.name, folderPath: path || 'C:\\Users\\DeVante\\Desktop' });
            } else if (item.type === 'video') {
                this.openApp('video', item.name, { videoUrl: item.url });
            } else if (item.type === 'file' && item.name.endsWith('.txt')) {
                this.openApp('notepad', item.name, { fileContent: item.content, filePath: path });
            }
        },

        get searchResults() {
            if (!this.searchQuery) return [];
            const allFiles = [];
            Object.keys(Alpine.store('os').fileSystem).forEach(path => {
                Alpine.store('os').fileSystem[path].forEach(file => {
                    allFiles.push({ ...file, fullPath: path });
                });
            });
            return allFiles.filter(file => 
                file.name.toLowerCase().includes(this.searchQuery.toLowerCase())
            ).slice(0, 10);
        },

        get allApps() {
            const apps = [
                { id: 'edge', name: 'Chrome', icon: window.portfolioConfig.imgPath + 'chrome.webp' },
                { id: 'vscode', name: 'VS Code', icon: window.portfolioConfig.imgPath + 'vscode.webp' },
                { id: 'word', name: 'Word', icon: window.portfolioConfig.imgPath + 'word.webp' },
                { id: 'excel', name: 'Excel', icon: window.portfolioConfig.imgPath + 'excel.webp' },
                { id: 'powerpoint', name: 'PowerPoint', icon: window.portfolioConfig.imgPath + 'powerpoint.webp' },
                { id: 'outlook', name: 'Outlook', icon: window.portfolioConfig.imgPath + 'outlook.webp' },
                { id: 'photoshop', name: 'Photoshop', icon: window.portfolioConfig.imgPath + 'photoshop.webp' },
                { id: 'flstudio', name: 'FL Studio 24', icon: window.portfolioConfig.imgPath + 'fl studio.webp' },
                { id: 'docker', name: 'Docker', icon: window.portfolioConfig.imgPath + 'docker.webp' },
                { id: 'explorer', name: 'Explorer', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
                { id: 'notepad', name: 'Notepad++', icon: window.portfolioConfig.imgPath + 'notepad++.webp' },
                { id: 'putty', name: 'PuTTY', icon: window.portfolioConfig.imgPath + 'putty.webp' },
                { id: 'filezilla', name: 'FileZilla', icon: window.portfolioConfig.imgPath + 'filezilla.webp' },
                { id: 'terminal', name: 'Terminal', icon: window.portfolioConfig.imgPath + 'terminal.webp' },
                { id: 'database', name: 'SQL Server Management Studio', icon: window.portfolioConfig.imgPath + 'mssql.webp' },
                { id: 'settings', name: 'Settings', icon: window.portfolioConfig.imgPath + 'settings.webp' },
                { id: 'taskmanager', name: 'Task Manager', icon: window.portfolioConfig.imgPath + 'taskmanager.webp' },
                { id: 'eventviewer', name: 'Event Viewer', icon: window.portfolioConfig.imgPath + 'eventviewer.webp' },
                { id: 'calculator', name: 'Calculator', icon: window.portfolioConfig.imgPath + 'calculator.webp' }
            ];

            // Group by letter
            const groups = {};
            apps.sort((a, b) => a.name.localeCompare(b.name)).forEach(app => {
                const letter = app.name[0].toUpperCase();
                if (!groups[letter]) groups[letter] = [];
                groups[letter].push(app);
            });

            return Object.keys(groups).sort().map(letter => ({
                letter,
                apps: groups[letter]
            }));
        },

        updateClock() {
            const now = new Date();
            this.clock.time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            this.clock.date = now.toLocaleDateString();
        },

        login() {
            if (this.loggingIn) return;
            this.loggingIn = true;
            this.playSound('startup');

            setTimeout(() => {
                this.loggedIn = true;
                this.loggingIn = false;
                localStorage.setItem('auth.loginTime', Date.now());
                
                // Set session identifier for the session
                const sessionID = Math.random().toString(36).substring(7);
                sessionStorage.setItem('os.sessionID', sessionID);

                Alpine.store('os').logEvent('Security', 'Information', `User DeVante logged in successfully (Session: ${sessionID})`);
                localStorage.setItem('auth.loggedIn', 'true');
                
                if (window.location.pathname !== window.portfolioConfig.basePath + 'desktop') {
                    window.history.pushState({}, '', window.portfolioConfig.basePath + 'desktop');
                }
            }, 3000);
        },

        logout() {
            Alpine.store('os').logEvent('Security', 'Information', 'User DeVante logged out');
            this.loggedIn = false;
            localStorage.removeItem('auth.loggedIn');
            Alpine.store('os').windows = [];
            this.startMenuOpen = false;
            window.history.pushState({}, '', window.portfolioConfig.basePath + 'login');
        },

        toggleTheme() {
            this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
            localStorage.setItem('settings.theme', this.settings.theme);
        },

        toggleSound() {
            this.settings.sound = !this.settings.sound;
            localStorage.setItem('settings.sound', this.settings.sound);
        },

        toggleQuickSetting(id) {
            this.playSound('click');
            this.settings[id] = !this.settings[id];
            localStorage.setItem('settings.' + id, this.settings[id]);

            if (id === 'airplane') {
                if (this.settings.airplane) {
                    this.settings.wifi = false;
                    this.settings.bluetooth = false;
                } else {
                    this.settings.wifi = true;
                    this.settings.bluetooth = true;
                }
                localStorage.setItem('settings.wifi', this.settings.wifi);
                localStorage.setItem('settings.bluetooth', this.settings.bluetooth);
            } else if (id === 'batterySaver') {
                if (this.settings.batterySaver) {
                    this.settings.brightness = Math.min(this.settings.brightness, 50);
                } else {
                    this.settings.brightness = 100;
                }
            } else if (id === 'wifi' || id === 'bluetooth') {
                if (this.settings[id]) {
                    this.settings.airplane = false;
                    localStorage.setItem('settings.airplane', false);
                }
            }
        },

        desktopIconPositions: JSON.parse(localStorage.getItem('os.iconPositions') || '{}'),
        saveIconPosition(name, x, y, snap = false) {
            if (snap) {
                const gridX = 110;
                const gridY = 110;
                const padding = 16;
                x = Math.round((x - padding) / gridX) * gridX + padding;
                y = Math.round((y - padding) / gridY) * gridY + padding;
            }
            this.desktopIconPositions[name] = { x, y };
            localStorage.setItem('os.iconPositions', JSON.stringify(this.desktopIconPositions));
        },
        clearDesktopPositions() {
            this.desktopIconPositions = {};
            localStorage.removeItem('os.iconPositions');
            this.playSound('click');
        },
        draggedIcon: null,
        isDragging: false,
        dragMoved: false,
        hoveredOverRecycleBin: false,
        startIconDrag(icon, e) {
            // Failsafe: Clear any existing drag listeners
            if (this._iconMoveHandler) {
                window.removeEventListener('mousemove', this._iconMoveHandler);
                window.removeEventListener('mouseup', this._iconUpHandler);
            }

            this.draggedIcon = icon;
            this.isDragging = true;
            this.dragMoved = false;
            
            const container = e.target.closest('.desktop-icon-container');
            if (!container) return;
            const rect = container.getBoundingClientRect();
            this._dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            const startX = e.clientX;
            const startY = e.clientY;
            
            this._iconMoveHandler = (moveEvt) => {
                const dist = Math.sqrt(Math.pow(moveEvt.clientX - startX, 2) + Math.pow(moveEvt.clientY - startY, 2));
                if (dist > 5) {
                    this.dragMoved = true;
                }
                
                const x = moveEvt.clientX - this._dragOffset.x;
                const y = moveEvt.clientY - this._dragOffset.y;
                this.saveIconPosition(icon.name, x, y);

                // Check if hovering over recycle bin
                const elements = document.elementsFromPoint(moveEvt.clientX, moveEvt.clientY);
                this.hoveredOverRecycleBin = elements.some(el => el.closest('.recycle-bin-icon')) && icon.name !== 'Recycle Bin';
            };
            
            this._iconUpHandler = (e) => {
                // Realistic Drop Detection
                const elements = document.elementsFromPoint(e.clientX, e.clientY);
                const recycleBin = elements.find(el => el.closest('.recycle-bin-icon'));
                
                if (recycleBin && this.draggedIcon && this.draggedIcon.name !== 'Recycle Bin') {
                    // It was dropped over the Recycle Bin
                    this.deleteItem(this.draggedIcon, 'C:\\Users\\DeVante\\Desktop');
                } else if (this.draggedIcon) {
                    // Snap to grid on drop
                    const rect = document.getElementById('desktop-icons-container').getBoundingClientRect();
                    const x = e.clientX - this._dragOffset.x;
                    const y = e.clientY - this._dragOffset.y;
                    this.saveIconPosition(this.draggedIcon.name, x, y, true);
                }

                this.hoveredOverRecycleBin = false;

                window.removeEventListener('mousemove', this._iconMoveHandler);
                window.removeEventListener('mouseup', this._iconUpHandler);
                this._iconMoveHandler = null;
                this._iconUpHandler = null;
                
                // Immediate state reset for "stuck" prevention
                this.isDragging = false;
                
                // Brief delay before clearing draggedIcon to allow other handlers to see it if needed
                setTimeout(() => {
                    this.draggedIcon = null;
                    this.dragMoved = false;
                }, 100);
            };
            
            window.addEventListener('mousemove', this._iconMoveHandler);
            window.addEventListener('mouseup', this._iconUpHandler);
        },

        deleteItem(item, fromPath) {
            if (!item || !fromPath || item.name === 'Recycle Bin' || item.name === 'DeVanté\'s PC') return;

            const fs = Alpine.store('os').fileSystem;
            if (!fs[fromPath]) return;

            const index = fs[fromPath].findIndex(f => f.name === item.name);
            if (index > -1) {
                const deletedItem = fs[fromPath].splice(index, 1)[0];
                deletedItem.originalPath = fromPath;
                if (!fs['C:\\Recycle Bin']) fs['C:\\Recycle Bin'] = [];
                fs['C:\\Recycle Bin'].push(deletedItem);
                Alpine.store('os').saveFileSystem();

                // Remove from custom positions so it resets to grid on restore
                if (fromPath === 'C:\\Users\\DeVante\\Desktop') {
                    const newPositions = { ...this.desktopIconPositions };
                    delete newPositions[item.name];
                    this.desktopIconPositions = newPositions;
                    localStorage.setItem('os.iconPositions', JSON.stringify(this.desktopIconPositions));
                }

                this.playSound('recycle');
                Alpine.store('os').logEvent('Explorer', 'Information', `Moved to Recycle Bin: ${item.name}`);
            }
        },

        handleGlobalKeys(e) {
            // Start Menu (Win key)
            if (e.key === 'Meta' || e.key === 'Super') {
                e.preventDefault();
                this.startMenuOpen = !this.startMenuOpen;
                if (!this.startMenuOpen) {
                    this.startMenuView = 'pinned';
                }
                if (this.startMenuOpen) {
                    Alpine.store('os').logEvent('Explorer', 'Information', 'Start Menu opened');
                }
            }

            // Search (Win + S)
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                this.startMenuOpen = true;
                this.$nextTick(() => {
                    const searchInput = document.querySelector('input[x-model="searchQuery"]');
                    if (searchInput) searchInput.focus();
                });
            }

            // Task Manager (Ctrl + Shift + Esc)
            if (e.ctrlKey && e.shiftKey && e.key === 'Escape') {
                e.preventDefault();
                this.openApp('taskmanager');
            }

            // Snap Left (Win + Left)
            if (e.metaKey && e.key === 'ArrowLeft') {
                e.preventDefault();
                const win = this.windows.find(w => w.id === this.focusedWindowId);
                if (win) {
                    win.maximized = false;
                    win.x = 0;
                    win.y = 0;
                    win.width = window.innerWidth / 2;
                    win.height = window.innerHeight - 48;
                }
            }

            // Snap Right (Win + Right)
            if (e.metaKey && e.key === 'ArrowRight') {
                e.preventDefault();
                const win = this.windows.find(w => w.id === this.focusedWindowId);
                if (win) {
                    win.maximized = false;
                    win.x = window.innerWidth / 2;
                    win.y = 0;
                    win.width = window.innerWidth / 2;
                    win.height = window.innerHeight - 48;
                }
            }

            // Maximize (Win + Up)
            if (e.metaKey && e.key === 'ArrowUp') {
                e.preventDefault();
                const win = this.windows.find(w => w.id === this.focusedWindowId);
                if (win && !win.maximized) {
                    this.toggleMaximize(win.id);
                }
            }
        },

        dragData: { id: null, startX: 0, startY: 0, initialX: 0, initialY: 0 },
        startDrag(id, e) {
            // Failsafe: Clear any existing window drag listeners
            if (this._windowMoveHandler) {
                window.removeEventListener('mousemove', this._windowMoveHandler);
                window.removeEventListener('mouseup', this._windowUpHandler);
            }

            const win = this.windows.find(w => w.id === id);
            if (!win) return;
            
            if (win.maximized) {
                const ratio = e.clientX / window.innerWidth;
                win.maximized = false;
                win.width = 800;
                win.height = 600;
                win.x = e.clientX - (win.width * ratio);
                win.y = 0;
            }

            this.focusWindow(id);
            this.dragData = {
                id,
                startX: e.clientX,
                startY: e.clientY,
                initialX: win.x,
                initialY: win.y
            };

            this._windowMoveHandler = (moveEvt) => this.doDrag(moveEvt);
            this._windowUpHandler = () => {
                this.endDrag();
                window.removeEventListener('mousemove', this._windowMoveHandler);
                window.removeEventListener('mouseup', this._windowUpHandler);
                this._windowMoveHandler = null;
                this._windowUpHandler = null;
            };

            window.addEventListener('mousemove', this._windowMoveHandler);
            window.addEventListener('mouseup', this._windowUpHandler);
        },
        doDrag(e) {
            const win = this.windows.find(w => w.id === this.dragData.id);
            if (win) {
                win.x = this.dragData.initialX + (e.clientX - this.dragData.startX);
                win.y = this.dragData.initialY + (e.clientY - this.dragData.startY);

                // Snapping Logic
                if (e.clientY < 10) {
                    this.snapPreview = { show: true, x: 0, y: 0, w: window.innerWidth, h: window.innerHeight - 48, opacity: 0.5 };
                } else if (e.clientX < 10) {
                    this.snapPreview = { show: true, x: 0, y: 0, w: window.innerWidth / 2, h: window.innerHeight - 48, opacity: 0.5 };
                } else if (e.clientX > window.innerWidth - 10) {
                    this.snapPreview = { show: true, x: window.innerWidth / 2, y: 0, w: window.innerWidth / 2, h: window.innerHeight - 48, opacity: 0.5 };
                } else {
                    this.snapPreview.show = false;
                }
            }
        },
        endDrag() {
            const win = this.windows.find(w => w.id === this.dragData.id);
            if (win && this.snapPreview.show) {
                win.x = this.snapPreview.x;
                win.y = this.snapPreview.y;
                win.width = this.snapPreview.w;
                win.height = this.snapPreview.h;
                if (win.width === window.innerWidth) {
                    win.maximized = true;
                }
            }
            this.snapPreview.show = false;
        },

        /* 
           Window Chrome Resizing (Windows-style)
           - Implementation: Window border hit-testing with drag-based resizing.
           - Professional: Manual window resizing via resize handles.
           - Realism: Uses ~6-8px resize hit-areas, cursor capture, and directional cursors (ew/ns/nwse).
           - UX: Snap-aware resizing that integrates with Windows 11 snapping logic.
        */
        resizeData: { id: null, startX: 0, startY: 0, initialX: 0, initialY: 0, initialW: 0, initialH: 0, dir: '' },
        startResize(id, dir, e) {
            const win = this.windows.find(w => w.id === id);
            if (!win || win.maximized) return;
            
            this.resizeData = {
                id,
                startX: e.clientX,
                startY: e.clientY,
                initialX: win.x,
                initialY: win.y,
                initialW: win.width,
                initialH: win.height,
                dir: dir
            };

            // Cursor Capture: Force cursor on body to prevent flickering during fast movements
            const originalCursor = document.body.style.cursor;
            document.body.style.cursor = window.getComputedStyle(e.target).cursor;

            const moveHandler = (moveEvt) => this.doResize(moveEvt);
            const upHandler = () => {
                document.body.style.cursor = originalCursor;
                document.removeEventListener('mousemove', moveHandler);
                document.removeEventListener('mouseup', upHandler);
            };
            document.addEventListener('mousemove', moveHandler);
            document.addEventListener('mouseup', upHandler);
        },
        doResize(e) {
            const win = this.windows.find(w => w.id === this.resizeData.id);
            if (!win) return;

            const dx = e.clientX - this.resizeData.startX;
            const dy = e.clientY - this.resizeData.startY;
            const dir = this.resizeData.dir;

            let newX = this.resizeData.initialX;
            let newY = this.resizeData.initialY;
            let newW = this.resizeData.initialW;
            let newH = this.resizeData.initialH;

            // East/West
            if (dir.includes('e')) {
                newW = Math.max(300, this.resizeData.initialW + dx);
            }
            if (dir.includes('w')) {
                const potentialW = this.resizeData.initialW - dx;
                if (potentialW >= 300) {
                    newW = potentialW;
                    newX = this.resizeData.initialX + dx;
                } else {
                    newX = this.resizeData.initialX + (this.resizeData.initialW - 300);
                    newW = 300;
                }
            }

            // North/South
            if (dir.includes('s')) {
                newH = Math.max(200, this.resizeData.initialH + dy);
            }
            if (dir.includes('n')) {
                const potentialH = this.resizeData.initialH - dy;
                if (potentialH >= 200) {
                    newH = potentialH;
                    newY = this.resizeData.initialY + dy;
                } else {
                    newY = this.resizeData.initialY + (this.resizeData.initialH - 200);
                    newH = 200;
                }
            }

            win.x = newX;
            win.y = newY;
            win.width = newW;
            win.height = newH;
        }
    }));
});
