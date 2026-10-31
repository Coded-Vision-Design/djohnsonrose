// assets/js/components/os/shell.js
document.addEventListener('alpine:init', () => {
    Alpine.data('os', () => ({
        booted: false,
        isBooting: localStorage.getItem('auth.loggedIn') !== 'true',
        loggingIn: false,
        loggedIn: localStorage.getItem('auth.loggedIn') === 'true',
        user: {
            name: 'DeVanté Johnson-Rose',
            avatar: window.portfolioConfig.imgPath + 'profile.webp'
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
        flyoutPreview: null,
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

            // The usable desktop is measured from this layer, never from the viewport.
            OsWindowing.watchDesktop(document.getElementById('windows-layer'), (desktop, mode) => {
                Alpine.store('os').setDesktop(desktop, mode);
            });

            // Dismisses Snap Assist and the flyout, as a click elsewhere does in Windows.
            document.addEventListener('pointerdown', (e) => {
                const store = Alpine.store('os');
                if (store.snapAssist && !e.target.closest('[data-snap-assist]')) store.snapAssist = null;
                if (store.snapFlyout && !e.target.closest('[data-snap-flyout]')) {
                    store.snapFlyout = null;
                    this.flyoutPreview = null;
                }
            }, true);

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

        get snapPreviewRect() { return Alpine.store('os').snapPreview.rect ?? this.flyoutPreview; },
        rectStyle(r) {
            return { left: r.x + 'px', top: r.y + 'px', width: r.width + 'px', height: r.height + 'px' };
        },
        resizeDirs(win) { return OsWindowing.resizableEdges(win, Alpine.store('os').desktop); },
        recentWindows() { return [...this.windows].sort((a, b) => b.z - a.z); },
        appIcon(app) {
            return window.portfolioConfig.imgPath + (window.portfolioConfig.apps[app]?.icon ?? 'favicon.webp');
        },
        appTitle(app) {
            return window.portfolioConfig.apps[app]?.title ?? app;
        },
        manifestApp(id) {
            return { id, name: this.appTitle(id), icon: this.appIcon(id) };
        },
        get startPinnedApps() {
            return window.portfolioConfig.startPinned.map(id => this.manifestApp(id));
        },
        assistWindows() {
            return Alpine.store('os').snapAssist.candidates
                .map(id => this.windows.find(w => w.id === id))
                .filter(Boolean);
        },
        barZones() {
            const { bar, target } = Alpine.store('os').snapPreview;
            return bar.tiles.flatMap(tile => tile.zones.map(z => ({
                key: tile.layout + ':' + z.zone,
                active: target?.layout === tile.layout && target?.zone === z.zone,
                x: z.x - bar.x,
                y: z.y - bar.y,
                width: z.width,
                height: z.height
            })));
        },
        previewZone(layoutId, zoneId) {
            const frac = OsWindowing.getLayout(layoutId)?.zones.find(z => z.id === zoneId);
            this.flyoutPreview = frac ? OsWindowing.fractionToRect(frac, Alpine.store('os').desktop) : null;
        },
        taskbarClick(appId) {
            const store = Alpine.store('os');
            const focused = this.windows.find(w => w.app === appId && w.id === store.focusedWindowId);
            if (focused) store.toggleMinimize(focused.id);
            else this.openApp(appId);
        },
        titleBarToggle(id) {
            const store = Alpine.store('os');
            this.cancelFlyoutHover();
            if (store.windowMode === 'phone') return;
            OsWindowing.animateGeometry(document.getElementById('win-' + id));
            store.toggleMaximize(id);
        },
        hoverMaximize(id, e) {
            clearTimeout(this.flyoutCloseTimer);
            clearTimeout(this.flyoutOpenTimer);
            if (e.pointerType !== 'mouse' || !OsWindowing.canHoverLayouts(Alpine.store('os').windowMode)) return;
            this.flyoutOpenTimer = setTimeout(() => this.openSnapFlyout(id, e.target, false), 300);
        },
        leaveSnapFlyout() {
            clearTimeout(this.flyoutOpenTimer);
            clearTimeout(this.flyoutCloseTimer);
            this.flyoutCloseTimer = setTimeout(() => {
                Alpine.store('os').snapFlyout = null;
                this.flyoutPreview = null;
            }, 250);
        },
        holdSnapFlyout() { clearTimeout(this.flyoutCloseTimer); },
        cancelFlyoutHover() { clearTimeout(this.flyoutOpenTimer); },
        openSnapFlyout(id, button, fromKeyboard) {
            const store = Alpine.store('os');
            const model = OsWindowing.snapFlyoutModel(button.getBoundingClientRect(), store.desktop, store.windowMode);
            store.snapFlyout = { windowId: id, model, fromKeyboard };
        },
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
            // Long press and pinch belong to the desktop, not to an open app.
            if (!action && e.target.closest('.os-window, .os-taskbar, .os-task-switcher')) return;
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
                    { label: 'Display settings', icon: `<img src="${imgPath}display.webp" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('settings') },
                    { label: 'Personalise', icon: `<img src="${imgPath}settings.webp" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('settings', 'Settings', { currentTab: 'personalisation' }) },
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
                    { label: 'Display settings', icon: `<img src="${imgPath}display.webp" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('settings') },
                    { label: 'Personalise', icon: `<img src="${imgPath}personalize.webp" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('settings', 'Settings', { currentTab: 'personalisation' }) },
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
                    { label: 'Taskbar settings', icon: `<img src="${imgPath}settings.webp" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('settings') },
                    { label: 'Task Manager', icon: `<img src="${imgPath}taskmgr.webp" class="w-4 h-4">`, shortcut: 'Ctrl+Shift+Esc', action: () => Alpine.store('os').openApp('taskmanager') },
                    { separator: true },
                    { label: 'Desktop', icon: `<img src="${imgPath}display.webp" class="w-4 h-4">`, action: () => { Alpine.store('os').Alpine.store('os').minimizeAll(); } }
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
            items.push({ label: 'Task Manager', icon: `<img src="${imgPath}taskmgr.webp" class="w-4 h-4">`, action: () => Alpine.store('os').openApp('taskmanager') });
            
            const win = this.windows.find(w => w.app === appHandle);
            if (win) {
                items.push({ separator: true });
                items.push({ label: 'Close window', icon: `<img src="${imgPath}delete.webp" class="w-4 h-4">`, action: () => this.closeWindow(win.id) });
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
                this.contextMenu.items.splice(2, 0, { label: 'Set as desktop background', icon: `<img src="${imgPath}image.webp" class="w-4 h-4">`, action: () => this.setWallpaper(item.url || (window.portfolioConfig.basePath + item.name)) });
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
            } else if (item.type === 'link' && item.url) {
                // Cross-build hop (e.g. React/PHP Desktop shortcuts). Mirrored
                // by v2's DesktopIcons → fires the same Security/System event
                // shape so the email logs read identically across builds.
                Alpine.store('os').logEvent('System', 'Information', `Version switch: opening ${item.name} (${item.url})`);
                window.location.href = item.url;
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
            const query = this.searchQuery.toLowerCase();
            const apps = Object.keys(window.portfolioConfig.apps)
                .map(id => this.manifestApp(id))
                .filter(app => app.name.toLowerCase().includes(query))
                .map(app => ({ name: app.name, type: 'app', app: app.id, icon: app.icon, fullPath: '' }));

            const allFiles = [];
            Object.keys(Alpine.store('os').fileSystem).forEach(path => {
                Alpine.store('os').fileSystem[path].forEach(file => {
                    allFiles.push({ ...file, fullPath: path });
                });
            });
            // Apps come first, as in v2. A shortcut to one of them would only
            // repeat it, but a document that opens in one still counts.
            const files = allFiles.filter(file =>
                file.name.toLowerCase().includes(query) &&
                !(file.type === 'app' && apps.some(app => app.name === file.name))
            );
            return [...apps, ...files].slice(0, 10);
        },

        get allApps() {
            const apps = Object.keys(window.portfolioConfig.apps).map(id => this.manifestApp(id));

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
                
                // Set session identifier for the session. Uses
                // crypto.getRandomValues (cryptographically secure) — Math.random
                // is predictable enough that CodeQL flags it for session IDs.
                const sessionBuf = new Uint8Array(8);
                window.crypto.getRandomValues(sessionBuf);
                const sessionID = Array.from(sessionBuf, b => b.toString(16).padStart(2, '0')).join('');
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
            this.metaAlone = e.key === 'Meta' || e.key === 'Super';

            if (e.key === 'Escape') {
                Alpine.store('os').snapFlyout = null;
                Alpine.store('os').snapAssist = null;
                this.flyoutPreview = null;
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

            const shortcut = OsWindowing.shortcutFromEvent(e);
            if (!shortcut) return;

            const store = Alpine.store('os');
            if (shortcut === 'layouts') {
                const button = document.querySelector(`#win-${store.focusedWindowId} .os-win-max`);
                if (!button || store.windowMode === 'phone') return;
                e.preventDefault();
                this.openSnapFlyout(store.focusedWindowId, button, true);
                return;
            }
            if (store.runShortcut(shortcut)) e.preventDefault();
        },

        // Start menu (Win key alone). Waiting for keyup leaves Win+Left and the
        // other combinations free, and is what Windows does.
        handleGlobalKeyUp(e) {
            if ((e.key === 'Meta' || e.key === 'Super') && this.metaAlone) {
                this.startMenuOpen = !this.startMenuOpen;
                if (!this.startMenuOpen) {
                    this.startMenuView = 'pinned';
                }
                if (this.startMenuOpen) {
                    Alpine.store('os').logEvent('Explorer', 'Information', 'Start Menu opened');
                }
            }
        },

        windowGesture(id) {
            const store = Alpine.store('os');
            return {
                element: document.getElementById('win-' + id),
                getWindow: () => store.windows.find(w => w.id === id),
                getDesktop: () => store.desktop,
                getMode: () => store.windowMode
            };
        },
        startDrag(id, e) {
            const store = Alpine.store('os');
            OsWindowing.beginWindowDrag(e, {
                ...this.windowGesture(id),
                handle: e.currentTarget,
                onDetach: (rect) => store.detachWindow(id, rect),
                onPreview: (rect, bar, target) => { store.snapPreview = { rect, bar, target }; },
                onMove: (x, y) => store.moveWindow(id, x, y),
                onMaximize: () => store.toggleMaximize(id),
                onSnap: (layout, zone) => store.snapWindow(id, layout, zone)
            });
        },
        startResize(id, dir, e) {
            const store = Alpine.store('os');
            OsWindowing.beginWindowResize(e, {
                ...this.windowGesture(id),
                handle: e.currentTarget,
                dir,
                getWindows: () => store.windows,
                getElement: (windowId) => document.getElementById('win-' + windowId),
                onCommit: (patches) => store.applyWindowPatches(patches)
            });
        },

    }));
});
