// assets/js/components/os/shell.js
const PC_NAME = 'DeVanté\'s PC';

document.addEventListener('alpine:init', () => {
    // Edits a name in place. Enter or clicking away keeps it, and Escape cancels.
    Alpine.data('renameInput', (name) => ({
        value: name,

        init() {
            this.$nextTick(() => {
                this.$el.focus();
                // The name without its extension, as Windows selects it.
                const dot = name.lastIndexOf('.');
                this.$el.setSelectionRange(0, dot > 0 ? dot : name.length);
            });
        },

        commit() {
            const moved = Alpine.store('os').commitRename(this.value);
            if (moved?.path === OsWindowing.DESKTOP && this.desktopIconPositions?.[moved.from]) {
                const { [moved.from]: position, ...others } = this.desktopIconPositions;
                this.desktopIconPositions = { ...others, [moved.to]: position };
                localStorage.setItem('os.iconPositions', JSON.stringify(this.desktopIconPositions));
            }
        },

        onKey(e) {
            if (e.key === 'Enter') this.commit();
            if (e.key === 'Escape') Alpine.store('os').renaming = null;
        }
    }));

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
            city: 'Essex',
            // 'loading', 'ready' or 'error', as in v2's store.
            status: 'loading'
        },
        widgetsOpen: false,
        startMenuOpen: false,
        startMenuView: 'pinned', // 'pinned' or 'allApps'
        quickSettingsOpen: false,
        // The clock's notifications and calendar. See os/calendar.js.
        calendarOpen: false,
        contextMenu: { open: false, x: 0, y: 0, items: [] },
        flyoutPreview: null,
        searchQuery: '',
        touchData: {
            startX: 0,
            startY: 0,
            timer: null,
            isLongPress: false,
            pinchGap: 0,
            pinchZoom: 1
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
            Alpine.store('os').changeFiles(OsWindowing.emptyBin);
            Alpine.store('os').playSound('recycle');
            Alpine.store('os').logEvent('System', 'Information', 'Recycle Bin emptied');
        },
        get propertiesRows() {
            const os = Alpine.store('os');
            if (!os.properties) return [];
            const { entry, path } = os.properties;
            return OsWindowing.entryProperties(os.fileSystem, entry, path);
        },
        get startPinnedFiles() {
            const os = Alpine.store('os');
            return os.startPins
                .map(full => ({ full, found: OsWindowing.findEntry(os.fileSystem, full) }))
                .filter(pin => pin.found)
                .map(pin => ({ full: pin.full, entry: pin.found.entry, path: pin.found.path }));
        },
        isCutOnDesktop(icon) {
            const clip = Alpine.store('os').fileClipboard;
            return clip?.mode === 'cut' && clip.fromPath === OsWindowing.DESKTOP && clip.name === icon.name;
        },
        isRenamingOnDesktop(icon) {
            const renaming = Alpine.store('os').renaming;
            return renaming?.path === OsWindowing.DESKTOP && renaming.name === icon.name;
        },
        // Where every desktop icon goes, the PC first. Shared with v2 (layoutDesktopIcons
        // in shell-ui.js), and worked out again whenever the desktop changes size.
        get desktopLayout() {
            const icons = Alpine.store('os').fileSystem['C:\\Users\\DeVante\\Desktop'] || [];
            const { width, height } = Alpine.store('os').desktop;
            return OsWindowing.layoutDesktopIcons([PC_NAME, ...icons.map(icon => icon.name)], this.desktopIconPositions, { width, height });
        },
        get pcPosition() { return this.desktopLayout[PC_NAME]; },
        get desktopIcons() {
            const icons = Alpine.store('os').fileSystem['C:\\Users\\DeVante\\Desktop'] || [];
            const layout = this.desktopLayout;
            return icons.map((icon) => {
                const iconData = { ...icon, defaultX: layout[icon.name].x, defaultY: layout[icon.name].y };
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

            // Boot lasts until the lock screen's pictures are ready, not a fixed time.
            if (this.isBooting) {
                OsWindowing.whenAssetsReady([this.settings.wallpaper, this.user.avatar], { minMs: OsWindowing.BOOT_MIN_MS })
                    .then(() => { this.isBooting = false; });
            }

            // The usable desktop is measured from this layer, never from the viewport.
            OsWindowing.watchDesktop(document.getElementById('windows-layer'), (desktop, mode) => {
                Alpine.store('os').setDesktop(desktop, mode);
            });
            OsWindowing.keepFileLongPress();

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

            if (this.loggedIn) this.openSharedFile();

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
        // When a Recommended item was last opened. Reading the clock keeps it current.
        recentLabel(key) {
            const now = this.clock.time && new Date();
            return OsWindowing.relativeTime(Alpine.store('os').recent[key] ?? null, now || new Date()) ?? 'Recently added';
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
                // The reply is read in assets/js/windowing/weather.js, shared with v2.
                const weather = await OsWindowing.weatherFromResponse(res);
                Object.assign(this.weather, weather, { status: 'ready' });
            } catch (e) {
                // Widgets says so, rather than showing NaN. A later refresh can still succeed.
                if (this.weather.status !== 'ready') {
                    Object.assign(this.weather, { status: 'error', temp: '--', condition: 'Weather unavailable', icon: '☁️' });
                }
            }
        },

        async toggleWidgets() {
            this.widgetsOpen = !this.widgetsOpen;
            if (this.widgetsOpen) {
                this.startMenuOpen = false;
                this.quickSettingsOpen = false;
            }
            const os = Alpine.store('os');
            if (this.widgetsOpen && os.news.length === 0) {
                os.newsStatus = 'loading';
                try {
                    const res = await fetch(`${window.portfolioConfig.basePath}api/news.php?t=${Date.now()}`);
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    os.news = Array.isArray(data?.news) ? data.news : [];
                    os.newsStatus = os.news.length ? 'ready' : 'error';
                } catch (e) {
                    os.newsStatus = 'error';
                }
            }
        },

        // Opening the clock's flyout closes the other panels, as v2's toggleCalendar does.
        toggleCalendar() {
            this.calendarOpen = !this.calendarOpen;
            if (this.calendarOpen) {
                this.startMenuOpen = false;
                this.quickSettingsOpen = false;
                this.widgetsOpen = false;
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
                this.touchData.pinchGap = OsWindowing.fingerGap(e.touches);
                this.touchData.pinchZoom = Alpine.store('os').desktopZoom;
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
            } else if (e.touches.length === 2 && !e.target.closest('.os-window')) {
                const { pinchZoom, pinchGap } = this.touchData;
                Alpine.store('os').desktopZoom = OsWindowing.pinchZoom(pinchZoom, pinchGap, OsWindowing.fingerGap(e.touches));
            }
        },

        handleTouchEnd(e) {
            clearTimeout(this.touchData.timer);
            // Lifting the finger would click, which would close the menu it just opened.
            if (this.touchData.isLongPress) e.preventDefault();
        },

        // Opens a menu from data/menus.json, which v2 shares, so that the two
        // cannot drift apart. Each menu here only says what its items do.
        openMenu(name, e, handlers, overrides = {}, above = false) {
            const config = window.portfolioConfig;
            const menu = OsWindowing.buildMenu(config.menus[name], config.imgPath, handlers, overrides);
            const viewport = { width: window.innerWidth, height: window.innerHeight };
            this.contextMenu = { open: true, ...menu, ...OsWindowing.placeMenu(e.clientX, e.clientY, menu, viewport, above) };
        },

        // Plugs v1 into the shared file rules in file-ops.js. Explorer overrides
        // what differs inside it, such as opening a folder in the same window.
        fileOs(overrides = {}) {
            const os = Alpine.store('os');
            const imgPath = window.portfolioConfig.imgPath;
            return {
                files: () => os.fileSystem,
                changeFiles: (change) => os.changeFiles(change),
                clipboard: () => os.fileClipboard,
                setClipboard: (clip) => { os.fileClipboard = clip; },
                startPins: () => os.startPins,
                favourites: () => os.favourites,
                toggleStartPin: (full) => os.toggleStartPin(full),
                toggleFavourite: (full) => os.toggleFavourite(full),
                openEntry: (entry, path) => this.openFile(entry, path),
                openLocation: (path, name) => os.openApp('explorer', path.split('\\').filter(Boolean).pop(), { initialPath: path, selectName: name }),
                beginRename: (entry, path) => { os.renaming = { path, name: entry.name }; },
                showProperties: (entry, path) => { os.properties = { entry, path }; },
                setWallpaper: (url) => os.setWallpaper(url),
                toast: (message) => os.showToast(message),
                playSound: (name) => os.playSound(name),
                shareBase: window.location.origin + window.portfolioConfig.basePath,
                icons: { zip: imgPath + 'win11/zipfolder.webp', folder: imgPath + 'win11/folder.webp', text: imgPath + 'notepad++.webp' },
                iconSize: () => os.desktopIconSize,
                setIconSize: (size) => os.setDesktopIconSize(size),
                iconsVisible: () => os.desktopIconsVisible,
                setIconsVisible: (visible) => os.setDesktopIconsVisible(visible),
                resetIconPositions: () => this.clearDesktopPositions(),
                ...overrides
            };
        },

        desktopMenuHandlers(e) {
            const os = Alpine.store('os');
            const show = (name, point, handlers, overrides) => this.openMenu(name, point, handlers, overrides);
            return {
                ...OsWindowing.desktopMenuHandlers(this.fileOs(), show, e),
                refresh: () => location.reload(),
                displaySettings: () => os.openApp('settings'),
                personalise: () => os.openApp('settings', 'Settings', { currentTab: 'personalisation' }),
                terminal: () => os.openApp('terminal')
            };
        },

        // Apps have their own right-click: the desktop's menu does not belong on them.
        onDesktopContextMenu(e) {
            if (e.target.closest('input, textarea')) return;
            e.preventDefault();
            if (!e.target.closest('.os-window')) this.showDesktopContextMenu(e);
        },

        showDesktopContextMenu(e) {
            const os = Alpine.store('os');
            this.openMenu('desktop', e, {
                ...this.desktopMenuHandlers(e),
                resetZoom: () => { os.desktopZoom = 1; },
                classic: () => this.showClassicDesktopContextMenu(e)
            }, {
                ...OsWindowing.folderMenuOverrides(this.fileOs()),
                resetZoom: { disabled: os.desktopZoom === 1 }
            });
        },

        // Win10-style menu, opened from "Show more options".
        showClassicDesktopContextMenu(e) {
            this.openMenu('desktopClassic', e, this.desktopMenuHandlers(e), OsWindowing.folderMenuOverrides(this.fileOs()));
        },

        showTaskbarContextMenu(e) {
            const os = Alpine.store('os');
            this.openMenu('taskbar', e, {
                taskbarSettings: () => os.openApp('settings'),
                taskManager: () => os.openApp('taskmanager'),
                desktop: () => os.minimizeAll(),
                classic: () => this.showClassicDesktopContextMenu(e)
            }, {}, true);
        },

        showAppContextMenu(e, appHandle) {
            const os = Alpine.store('os');
            const isPinned = this.pinnedApps.includes(appHandle);
            const win = this.windows.find(w => w.app === appHandle);
            this.openMenu('taskbarApp', e, {
                pin: () => os.togglePinned(appHandle),
                taskManager: () => os.openApp('taskmanager'),
                close: () => this.closeWindow(win.id),
                classic: () => this.showClassicDesktopContextMenu(e)
            }, {
                // Task Manager cannot be unpinned, as in Windows.
                pin: { label: isPinned ? 'Unpin from taskbar' : 'Pin to taskbar', hidden: appHandle === 'taskmanager' },
                close: { hidden: !win }
            }, true);
        },

        showFileContextMenu(e, item, path, fileOs = this.fileOs()) {
            const { name, handlers, overrides } = OsWindowing.fileMenuFor(fileOs, item, path);
            this.openMenu(name, e, { ...handlers, classic: () => this.showClassicDesktopContextMenu(e) }, overrides);
        },

        showComputerMenu(e) {
            const pc = { name: 'DeVanté\'s PC', type: 'folder', path: 'C:\\', icon: window.portfolioConfig.imgPath + 'thispc.webp' };
            this.openMenu('computer', e, {
                open: () => this.openApp('explorer', 'This PC', { initialPath: 'C:\\' }),
                properties: () => { Alpine.store('os').properties = { entry: pc, path: 'C:\\' }; },
                classic: () => this.showClassicDesktopContextMenu(e)
            });
        },

        openSharedFile() {
            const shared = OsWindowing.sharedPath(window.location.hash);
            if (!shared) return;
            window.history.replaceState(null, '', window.location.pathname);
            const found = OsWindowing.findEntry(Alpine.store('os').fileSystem, shared);
            if (found) this.openFile(found.entry, found.path);
        },

        // Explorer has its own openItem, which opens folders in its own window.
        openItem(item, path = null) {
            this.openFile(item, path);
        },

        openFile(item, path = null) {
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
                // shape so the event logs read identically across builds.
                Alpine.store('os').logEvent('System', 'Information', `Version switch: opening ${item.name} (${item.url})`);
                window.location.href = item.url;
            } else if (item.type === 'image') {
                this.openApp('photos', item.name, { imageName: item.name, folderPath: path || 'C:\\Users\\DeVante\\Desktop' });
            } else if (item.type === 'video') {
                this.openApp('video', item.name, { videoUrl: item.url });
            } else if (item.type === 'file') {
                this.openApp(OsWindowing.appForFile(item.name), item.name, { fileContent: item.content, filePath: path });
            }
        },

        get searchResults() {
            const apps = Object.keys(window.portfolioConfig.apps).map(id => ({
                id,
                title: this.appTitle(id),
                icon: this.appIcon(id)
            }));
            return OsWindowing.searchOs(this.searchQuery, apps, Alpine.store('os').fileSystem);
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
            this.clock.time = OsWindowing.clockTime(now);
            this.clock.date = OsWindowing.clockDate(now);
        },

        // The pictures the desktop shows first: the wallpaper and the taskbar.
        desktopAssets() {
            return [this.settings.wallpaper, window.portfolioConfig.imgPath + 'startmenu.webp', ...this.pinnedApps.map(app => this.appIcon(app))];
        },

        login() {
            if (this.loggingIn) return;
            this.loggingIn = true;
            this.playSound('startup');

            // Signing in lasts until the desktop is ready, not a fixed time. See v2's LockScreen.
            OsWindowing.whenAssetsReady(this.desktopAssets(), { minMs: OsWindowing.SIGN_IN_MIN_MS }).then(() => {
                this.loggedIn = true;
                this.loggingIn = false;
                localStorage.setItem('auth.loginTime', Date.now());
                
                // Set session identifier for the session. Uses
                // crypto.getRandomValues (cryptographically secure), as Math.random
                // is predictable enough that CodeQL flags it for session IDs.
                const sessionBuf = new Uint8Array(8);
                window.crypto.getRandomValues(sessionBuf);
                const sessionID = Array.from(sessionBuf, b => b.toString(16).padStart(2, '0')).join('');
                sessionStorage.setItem('os.sessionID', sessionID);

                Alpine.store('os').logEvent('Security', 'Information', `User DeVante logged in successfully (Session: ${sessionID})`);
                localStorage.setItem('auth.loggedIn', 'true');
                // The cookie banner shows from here (loggedIn), not after a reload.
                this.openSharedFile();

                if (window.location.pathname !== window.portfolioConfig.basePath + 'desktop') {
                    window.history.pushState({}, '', window.portfolioConfig.basePath + 'desktop');
                }
            });
        },

        logout() {
            Alpine.store('os').logEvent('Security', 'Information', 'User DeVante logged out');
            // Letters opened in References must not outlast the visitor's session.
            OsWindowing.forgetReferences(sessionStorage);
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

        // What each toggle changes is shared with v2: see quickTogglePatch in shell-ui.js.
        toggleQuickSetting(id) {
            const patch = OsWindowing.quickTogglePatch(this.settings, id);
            Object.assign(this.settings, patch);
            for (const [key, value] of Object.entries(patch)) localStorage.setItem('settings.' + key, value);
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
            if (!item || !fromPath) return;
            const os = Alpine.store('os');
            os.changeFiles(fs => OsWindowing.deleteEntry(fs, fromPath, item.name));

            // Remove from custom positions so it resets to grid on restore
            if (fromPath === OsWindowing.DESKTOP) {
                const newPositions = { ...this.desktopIconPositions };
                delete newPositions[item.name];
                this.desktopIconPositions = newPositions;
                localStorage.setItem('os.iconPositions', JSON.stringify(this.desktopIconPositions));
            }

            this.playSound('recycle');
            os.logEvent('Explorer', 'Information', `Moved to Recycle Bin: ${item.name}`);
        },

        handleGlobalKeys(e) {
            this.metaAlone = e.key === 'Meta' || e.key === 'Super';

            // The shell's own keys, shared with v2: see shellKeyFromEvent in shell-ui.js.
            // Ctrl+S is not one of them, so that it stays with the app.
            const shellKey = OsWindowing.shellKeyFromEvent(e);
            if (shellKey === 'dismiss') {
                Alpine.store('os').snapFlyout = null;
                Alpine.store('os').snapAssist = null;
                this.flyoutPreview = null;
                this.closePopups();
            } else if (shellKey === 'search') {
                e.preventDefault();
                this.widgetsOpen = false;
                this.quickSettingsOpen = false;
                this.startMenuOpen = true;
                this.$nextTick(() => document.querySelector('[data-start-menu] input[type="text"]')?.focus());
            } else if (shellKey === 'taskManager') {
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

        // Phone windows keep clear of the cookie bar while it shows. Alpine would call
        // a function returned straight from x-init, so the stop function stays here.
        reserveConsentSpace(el) {
            this.stopConsentSpace = OsWindowing.reserveBottomSpace(el);
        },

        // Esc closes Start, Quick Settings and Widgets, and gives focus back to
        // the button that opened them if it was inside one.
        closePopups() {
            const inside = document.activeElement?.closest?.('[data-start-menu], [data-quick-settings], [data-widgets]');
            const opener = inside?.matches('[data-start-menu]') ? '[data-start-button]'
                : inside?.matches('[data-quick-settings]') ? '[data-tray-item="status"]'
                : inside ? '[data-widgets-toggle]' : null;
            this.startMenuOpen = false;
            this.startMenuView = 'pinned';
            this.quickSettingsOpen = false;
            this.widgetsOpen = false;
            if (opener) document.querySelector(opener)?.focus();
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
