// assets/js/components/os/store.js
// Matches WindowErrorBoundary in v2. closeWindow and win resolve from the
// window's Alpine scope once this is mounted.
const APP_LOAD_ERROR = `
    <div role="alert" class="h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-black dark:text-white">
        <p class="font-semibold">This app could not be opened.</p>
        <p class="text-xs opacity-70">Reload the page to try again.</p>
        <div class="flex gap-2">
            <button @click="window.location.reload()" class="min-h-[44px] px-4 rounded-sm bg-win-blue text-white text-xs font-semibold">Reload</button>
            <button @click="closeWindow(win.id)" class="min-h-[44px] px-4 rounded-sm border border-gray-300 dark:border-white/20 text-xs">Close</button>
        </div>
    </div>`;

const readList = (key) => {
    try {
        const list = JSON.parse(localStorage.getItem(key));
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
};

const toggled = (list, item) => (list.includes(item) ? list.filter(value => value !== item) : [...list, item]);

// Storage can be blocked, which throws. The page still works, it just forgets.
const stored = (key) => {
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
};

const store = (key, value) => {
    try {
        localStorage.setItem(key, value);
    } catch {
        // Kept until the page closes.
    }
};

const prefersDark = () => !!window.matchMedia?.('(prefers-color-scheme: dark)').matches;

const readRecent = () => {
    try {
        return JSON.parse(localStorage.getItem('os.recent')) || {};
    } catch {
        return {};
    }
};

document.addEventListener('alpine:init', () => {
    Alpine.store('os', {
        windows: [],
        focusedWindowId: null,
        contextMenu: { open: false, x: 0, y: 0, items: [], variant: 'modern' },
        nextWindowZ: 100,
        // How many windows have opened, so that the address can tell an open from a focus. See address.js.
        windowsOpened: 0,
        eventLogs: [],
        logEvent(source, level, description, details = {}) {
            this.eventLogs.unshift({
                id: Date.now() + Math.random(),
                time: new Date().toLocaleTimeString(),
                date: new Date().toLocaleDateString(),
                source: source,
                level: level, // 'Information', 'Warning', 'Error'
                description: description
            });
            // Keep only last 100 logs
            if (this.eventLogs.length > 100) this.eventLogs.pop();

            // Send telemetry for important events
            if (source === 'Security' || source === 'System' || source === 'Explorer') {
                this.sendTelemetry(source + ': ' + level, { description, ...details });
            }
        },

        // The same as v2's: see deviceInfo in shell-ui.js.
        getDeviceInfo() {
            return OsWindowing.deviceInfo({
                userAgent: navigator.userAgent,
                screen: window.screen,
                touchPoints: navigator.maxTouchPoints
            });
        },

        sendTelemetry(action, details = {}) {
            // GDPR: no telemetry fires until the visitor accepts the cookie
            // banner, and none after they withdraw it. Mirrors v2/src/lib/telemetry.ts.
            if (!this.cookieConsent) return;
            let sessionID = 'guest';
            try {
                sessionID = sessionStorage.getItem('os.sessionID') || 'guest';
            } catch {
                // Blocked storage: the event is still worth sending.
            }
            const data = {
                action: action,
                details: {
                    ...details,
                    // Tag every event with which build it came from so the
                    // daily digest and the Admin Console stats can split
                    // v1 (PHP) and v2 (React) activity.
                    source: 'php',
                    sessionID
                },
                deviceInfo: this.getDeviceInfo()
            };

            fetch(`${window.portfolioConfig.basePath}api/log.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(err => console.warn('Telemetry failed:', err));
        },
        // Kept up to date by setDesktop.
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth,
        previewWallpaper: null,
        // Saved when the visitor pins or unpins, so the taskbar comes back the same.
        pinnedApps: (() => {
            const saved = readList('os.taskbarPins');
            return stored('os.taskbarPins') === null ? window.portfolioConfig.pinned : saved;
        })(),
        snapPreview: { rect: null, bar: null, target: null },
        snapFlyout: null,
        snapAssist: null,
        taskSwitcherOpen: false,
        desktop: { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight - 48 },
        windowMode: OsWindowing.detectMode({
            width: window.innerWidth,
            height: window.innerHeight,
            coarse: window.matchMedia('(pointer: coarse)').matches
        }),
        cookieConsent: stored('cookie.consent') === 'true',
        // Set again after sign-in, so that a new visitor sees it at once.
        showCookieNotification: stored('cookie.consent') === null,
        errorDialog: { open: false, title: '', message: '', path: '' },
        showError(title, message, path = '') {
            this.errorDialog = { open: true, title, message, path };
        },
        news: [],
        // 'loading', 'ready' or 'error', so that Widgets can say when headlines failed.
        newsStatus: 'loading',
        // When Start's Recommended items were last opened, by key.
        recent: readRecent(),
        desktopZoom: 1,
        settings: {
            // A first visit follows the system; a choice made in Settings is saved and wins.
            theme: OsWindowing.initialTheme(stored('settings.theme'), prefersDark()),
            sound: stored('settings.sound') !== 'false',
            volume: OsWindowing.storedNumber(stored('settings.volume'), 75),
            brightness: OsWindowing.storedNumber(stored('settings.brightness'), 100),
            wallpaper: stored('settings.wallpaper') || window.portfolioConfig.imgPath + 'wallpaper-bloom.webp',
            email: window.portfolioConfig.email,
            wifi: stored('settings.wifi') !== 'false',
            bluetooth: stored('settings.bluetooth') !== 'false',
            airplane: stored('settings.airplane') === 'true',
            batterySaver: stored('settings.batterySaver') === 'true',
            nightLight: stored('settings.nightLight') === 'true',
            accessibility: stored('settings.accessibility') === 'true'
        },
        // Windows makes no sound for a click, or for opening or minimising a
        // window, so neither do we. v2's lib/sounds.ts has the same list.
        sounds: {
            startup: window.portfolioConfig.basePath + 'assets/sounds/Windows Logon.m4a',
            error: window.portfolioConfig.basePath + 'assets/sounds/Windows Error.m4a',
            notify: window.portfolioConfig.basePath + 'assets/sounds/Windows Notify.m4a',
            recycle: window.portfolioConfig.basePath + 'assets/sounds/Windows Recycle.m4a',
            uac: window.portfolioConfig.basePath + 'assets/sounds/Windows User Account Control.m4a'
        },
        // Injected from filesystem.js
        fileSystem: window.loadFileSystem(),
        fileClipboard: null,
        renaming: null,
        properties: null,
        toastMessage: null,
        startPins: readList('os.startPins'),
        favourites: readList('os.favourites'),
        desktopIconSize: localStorage.getItem('os.iconSize') || 'medium',
        desktopIconsVisible: localStorage.getItem('os.iconsVisible') !== 'false',

        // Each change comes from a function in file-ops.js.
        changeFiles(change) {
            const next = change(this.fileSystem);
            if (next === this.fileSystem) return;
            this.fileSystem = next;
            this.saveFileSystem();
        },

        toggleStartPin(full) {
            this.startPins = toggled(this.startPins, full);
            localStorage.setItem('os.startPins', JSON.stringify(this.startPins));
        },

        toggleFavourite(full) {
            this.favourites = toggled(this.favourites, full);
            localStorage.setItem('os.favourites', JSON.stringify(this.favourites));
        },

        togglePinned(app) {
            this.pinnedApps = toggled(this.pinnedApps, app);
            store('os.taskbarPins', JSON.stringify(this.pinnedApps));
        },

        markRecent(key) {
            this.recent = { ...this.recent, [key]: Date.now() };
            store('os.recent', JSON.stringify(this.recent));
        },

        setDesktopIconSize(size) {
            this.desktopIconSize = size;
            localStorage.setItem('os.iconSize', size);
        },

        setDesktopIconsVisible(visible) {
            this.desktopIconsVisible = visible;
            localStorage.setItem('os.iconsVisible', visible);
        },

        /** Returns the old and new names, so that the desktop can move the icon's spot. */
        commitRename(value) {
            if (!this.renaming) return null;
            const { path, name } = this.renaming;
            const newName = value.trim();
            this.renaming = null;
            this.changeFiles(fs => OsWindowing.renameEntry(fs, path, name, newName));
            const renamed = (this.fileSystem[path] || []).some(entry => entry.name === newName);
            return renamed && newName !== name ? { path, from: name, to: newName } : null;
        },

        showToast(message) {
            this.toastMessage = message;
            setTimeout(() => {
                if (this.toastMessage === message) this.toastMessage = null;
            }, 3000);
        },

        saveFileSystem() {
            localStorage.setItem('os.fileSystem', JSON.stringify(this.fileSystem));
            localStorage.setItem('os.fileSystem.version', window.osFileSystemVersion);
        },

        playSound(soundType) {
            if (!this.settings.sound || !this.sounds[soundType]) return;
            
            let soundPath = this.sounds[soundType];
            
            // If in dark mode, check if there's a subdued version in assets/sounds/dm/
            if (this.settings.theme === 'dark') {
                const fileName = soundPath.split('/').pop();
                // Only these three have official dark mode variants in the dm folder
                const dmVariants = ['Windows Background.m4a', 'Windows Notify.m4a', 'Windows User Account Control.m4a'];
                if (dmVariants.includes(fileName)) {
                    soundPath = soundPath.replace('assets/sounds/', 'assets/sounds/dm/');
                }
            }

            const audio = new Audio(soundPath);
            audio.volume = this.settings.volume / 100;
            audio.play().catch(e => console.log('Sound playback blocked by browser policy'));
        },

        openApp(appHandle, title = null, extraData = {}) {
            this.contextMenu.open = false; // Close menu when opening app
            this.taskSwitcherOpen = false;
            this.logEvent('System', 'Information', `Starting application: ${title || appHandle}`, { app: appHandle });
            const recent = OsWindowing.recentKey(appHandle, extraData);
            if (recent) this.markRecent(recent);
            if (extraData.fromRecycleBin) {
                this.playSound('error');
                return;
            }

            const existing = this.windows.find(w => w.app === appHandle);
            if (existing) {
                if (appHandle === 'photos') {
                    if (extraData.imageName) existing.imageName = extraData.imageName;
                    if (extraData.folderPath) existing.folderPath = extraData.folderPath;
                }
                if (appHandle === 'video' && extraData.videoUrl) {
                    existing.videoUrl = extraData.videoUrl;
                }
                if (appHandle === 'pdfreader' && extraData.pdfUrl) {
                    existing.pdfUrl = extraData.pdfUrl;
                    existing.title = title || existing.title;
                }
                if ((appHandle === 'notepad' || appHandle === 'flstudio') && extraData.fileContent !== undefined) {
                    existing.fileContent = extraData.fileContent;
                    existing.filePath = extraData.filePath;
                    existing.fileRevision = (existing.fileRevision ?? 0) + 1;
                    existing.title = title || existing.title;
                }
                if (appHandle === 'settings' && extraData.currentTab) {
                    existing.currentTab = extraData.currentTab;
                }
                if (appHandle === 'edge' && extraData.initialUrl) {
                    existing.initialUrl = extraData.initialUrl;
                    existing.urlRevision = (existing.urlRevision ?? 0) + 1;
                }
                
                this.focusWindow(existing.id);
                if (existing.state === 'minimized') this.toggleMinimize(existing.id);

                if (appHandle === 'explorer' && extraData.initialPath) {
                    // Dispatch after focusing to ensure the listener identifies the right window
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('explorer-navigate', { detail: { selectName: extraData.selectName, path: extraData.initialPath } }));
                    }, 10);
                }
                return;
            }

            const id = Date.now();
            const manifest = window.portfolioConfig.apps[appHandle];

            const newWindow = {
                id,
                app: appHandle,
                title: title || manifest?.title || appHandle.charAt(0).toUpperCase() + appHandle.slice(1),
                ...OsWindowing.placeNewWindow(manifest?.size ?? { w: 800, h: 600 }, this.desktop, this.windows.length),
                z: this.nextWindowZ++,
                state: 'floating',
                loading: true,
                ...extraData
            };

            this.windows.push(newWindow);
            this.focusedWindowId = id;
            this.windowsOpened++;

            fetch(`${window.portfolioConfig.basePath}api/app.php?name=${appHandle}`)
                .then(res => {
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    return res.text();
                })
                .then(html => {
                    const win = this.windows.find(w => w.id === id);
                    if (win) {
                        win.content = html;
                        win.loading = false;
                    }
                })
                .catch(() => {
                    const win = this.windows.find(w => w.id === id);
                    if (win) {
                        win.content = APP_LOAD_ERROR;
                        win.loading = false;
                    }
                });
        },

        closeWindow(id) {
            const win = this.windows.find(w => w.id === id);
            if (win) {
                this.logEvent('System', 'Information', `Closing application: ${win.title}`);
                // Dispatch cleanup event for the specific app
                window.dispatchEvent(new CustomEvent('app-closed', { detail: { id: win.id, app: win.app } }));
                // Clear background preview if settings is closed
                if (win.app === 'settings') {
                    this.previewWallpaper = null;
                }
                OsWindowing.animateWindowOut(document.getElementById('win-' + id), 'close');
            }
            this.windows = this.windows.filter(w => w.id !== id);
            if (this.focusedWindowId === id) {
                this.focusedWindowId = OsWindowing.nextFocusedWindow(this.windows)?.id ?? null;
            }
            this.snapAssist = null;
            if (this.snapFlyout?.windowId === id) this.snapFlyout = null;
            // Focus went with the window, so it moves on, as v2's Desktop does.
            if (win) {
                setTimeout(() => {
                    if (document.activeElement === document.body || !document.activeElement) {
                        OsWindowing.focusAfterClose(this.focusedWindowId, win.app);
                    }
                });
            }
        },

        focusWindow(id) {
            const win = this.windows.find(w => w.id === id);
            // Already on top: nothing to change, so nothing needs to update.
            if (win && !(this.focusedWindowId === id && win.z === this.nextWindowZ - 1)) {
                win.z = this.nextWindowZ++;
                this.focusedWindowId = id;
            }
        },

        toggleMinimize(id) {
            const win = this.windows.find(w => w.id === id);
            if (!win) return;
            if (win.state === 'minimized') {
                Object.assign(win, OsWindowing.unminimizePatch(win, this.desktop));
                this.focusWindow(id);
                return;
            }
            OsWindowing.animateWindowOut(document.getElementById('win-' + id), 'minimise');
            Object.assign(win, OsWindowing.minimizePatch(win));
            if (this.focusedWindowId === id) {
                this.focusedWindowId = OsWindowing.nextFocusedWindow(this.windows)?.id ?? null;
            }
        },

        minimizeAll() {
            this.windows.forEach(win => {
                if (win.state !== 'minimized') Object.assign(win, OsWindowing.minimizePatch(win));
            });
            this.focusedWindowId = null;
        },

        toggleMaximize(id) {
            const win = this.windows.find(w => w.id === id);
            if (!win || win.state === 'minimized') return;
            Object.assign(win, win.state === 'maximized'
                ? OsWindowing.restorePatch(win, this.desktop)
                : OsWindowing.maximizePatch(win, this.desktop));
            this.snapFlyout = null;
            this.snapAssist = null;
        },

        moveWindow(id, x, y) {
            const win = this.windows.find(w => w.id === id);
            if (win) Object.assign(win, { x, y });
        },

        detachWindow(id, rect) {
            const win = this.windows.find(w => w.id === id);
            if (win) Object.assign(win, OsWindowing.detachPatch(rect));
        },

        applyWindowPatches(patches) {
            this.windows.forEach(win => {
                if (patches[win.id]) Object.assign(win, patches[win.id]);
            });
        },

        snapWindow(id, layout, zone) {
            const win = this.windows.find(w => w.id === id);
            if (!win) return;
            Object.assign(win, OsWindowing.snapPatch(win, layout, zone, this.desktop));
            this.focusWindow(id);
            this.snapFlyout = null;
            this.snapAssist = OsWindowing.planAssist(this.windows, layout, this.desktop);
        },

        fillSnapAssist(id) {
            const win = this.windows.find(w => w.id === id);
            if (!this.snapAssist || !win) return;
            const { layout, zone } = this.snapAssist;
            Object.assign(win, OsWindowing.snapPatch(win, layout, zone, this.desktop));
            this.focusWindow(id);
            this.snapAssist = OsWindowing.planAssist(this.windows, layout, this.desktop);
        },

        setDesktop(desktop, mode) {
            const changed = this.desktop.width !== desktop.width || this.desktop.height !== desktop.height;
            this.desktop = desktop;
            this.windowMode = mode;
            this.isMobile = mode === 'phone';
            this.isTablet = mode === 'tablet';
            this.isDesktop = mode === 'desktop';
            this.windowWidth = window.innerWidth;
            this.windowHeight = window.innerHeight;
            if (changed) {
                this.snapPreview = { rect: null, bar: null, target: null };
                this.snapFlyout = null;
                this.snapAssist = null;
            }
            this.windows.forEach(win => {
                const patch = OsWindowing.reflowPatch(win, desktop, mode);
                if (patch) Object.assign(win, patch);
            });
        },

        // Runs a window shortcut. Returns true when it did something.
        runShortcut(shortcut) {
            const win = this.windows.find(w => w.id === this.focusedWindowId);
            if (!win) return false;
            if (shortcut === 'close') {
                this.closeWindow(win.id);
                return true;
            }
            if (shortcut === 'layouts' || this.windowMode === 'phone') return false;

            const placement = OsWindowing.keyboardPlacement(win, shortcut, this.desktop, this.windowMode);
            if (!placement) return false;
            if (placement.type === 'snap') this.snapWindow(win.id, placement.layout, placement.zone);
            else if (placement.type === 'minimize') this.toggleMinimize(win.id);
            else if (placement.type === 'maximize') this.toggleMaximize(win.id);
            else Object.assign(win, OsWindowing.restorePatch(win, this.desktop));
            return true;
        },

        setWallpaper(url) {
            this.settings.wallpaper = url;
            this.previewWallpaper = null; // Clear preview on permanent save
            localStorage.setItem('settings.wallpaper', url);
        },

        setCookieConsent(val) {
            this.cookieConsent = val;
            store('cookie.consent', val);
            // Google Analytics loads on acceptance, and stops when consent is withdrawn.
            if (val) window.initGTM?.();
            else window.disableGTM?.();
            this.showCookieNotification = false;
        },

        writeFile(path, file) {
            this.changeFiles(fs => OsWindowing.writeTextFile(fs, path, file.name, file.content, file.icon));
            this.logEvent('FileSystem', 'Information', `File saved: ${path}\\${file.name}`);
            return true;
        }
    });
});
