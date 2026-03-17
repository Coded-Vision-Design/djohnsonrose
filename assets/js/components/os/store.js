// assets/js/components/os/store.js
document.addEventListener('alpine:init', () => {
    Alpine.store('os', {
        windows: [],
        focusedWindowId: null,
        contextMenu: { open: false, x: 0, y: 0, items: [] },
        nextWindowZ: 100,
        eventLogs: [],
        logEvent(source, level, description) {
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
                this.sendTelemetry(source + ': ' + level, { description });
            }
        },

        getDeviceInfo() {
            const ua = navigator.userAgent;
            let os = "Unknown OS";
            if (ua.indexOf("Win") !== -1) os = "Windows";
            if (ua.indexOf("Mac") !== -1) os = "MacOS";
            if (ua.indexOf("Linux") !== -1) os = "Linux";
            if (ua.indexOf("Android") !== -1) os = "Android";
            if (ua.indexOf("like Mac") !== -1) os = "iOS";

            return {
                os: os,
                browser: navigator.appName + " " + navigator.appVersion,
                resolution: window.screen.width + "x" + window.screen.height,
                deviceTime: new Date().toString(),
                userAgent: ua
            };
        },

        sendTelemetry(action, details = {}) {
            const data = {
                action: action,
                details: {
                    ...details,
                    sessionID: sessionStorage.getItem('os.sessionID') || 'guest'
                },
                deviceInfo: this.getDeviceInfo()
            };

            fetch(`${window.portfolioConfig.basePath}api/log.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(err => console.warn('Telemetry failed:', err));
        },
        isMobile: window.innerWidth < 640,
        isTablet: window.innerWidth >= 640 && window.innerWidth < 1024,
        isDesktop: window.innerWidth >= 1024,
        windowHeight: window.innerHeight,
        windowWidth: window.innerWidth,
        previewWallpaper: null,
        pinnedApps: ['edge', 'explorer', 'outlook', 'vscode', 'flstudio'],
        cookieConsent: localStorage.getItem('cookie.consent') === 'true',
        showCookieNotification: localStorage.getItem('auth.loggedIn') === 'true' && localStorage.getItem('cookie.consent') === null,
        errorDialog: { open: false, title: '', message: '', path: '' },
        showError(title, message, path = '') {
            this.errorDialog = { open: true, title, message, path };
        },
        news: [],
        desktopZoom: 1,
        settings: {
            theme: localStorage.getItem('settings.theme') || 'light',
            sound: localStorage.getItem('settings.sound') !== 'false',
            volume: parseInt(localStorage.getItem('settings.volume')) || 75,
            brightness: parseInt(localStorage.getItem('settings.brightness')) || 100,
            wallpaper: localStorage.getItem('settings.wallpaper') || 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1974&auto=format&fit=crop',
            email: window.portfolioConfig.email,
            wifi: localStorage.getItem('settings.wifi') !== 'false',
            bluetooth: localStorage.getItem('settings.bluetooth') !== 'false',
            airplane: localStorage.getItem('settings.airplane') === 'true',
            batterySaver: localStorage.getItem('settings.batterySaver') === 'true',
            nightLight: localStorage.getItem('settings.nightLight') === 'true',
            accessibility: localStorage.getItem('settings.accessibility') === 'true'
        },
        sounds: {
            startup: window.portfolioConfig.basePath + 'assets/sounds/Windows Logon.wav',
            click: window.portfolioConfig.basePath + 'assets/sounds/click.wav',
            error: window.portfolioConfig.basePath + 'assets/sounds/Windows Error.wav',
            minimize: window.portfolioConfig.basePath + 'assets/sounds/Windows Minimize.wav',
            open: window.portfolioConfig.basePath + 'assets/sounds/Windows Restore.wav',
            notify: window.portfolioConfig.basePath + 'assets/sounds/Windows Notify.wav',
            recycle: window.portfolioConfig.basePath + 'assets/sounds/Windows Recycle.wav',
            uac: window.portfolioConfig.basePath + 'assets/sounds/Windows User Account Control.wav'
        },
        // Injected from filesystem.js
        fileSystem: JSON.parse(localStorage.getItem('os.fileSystem')) || window.osFileSystem || {},

        saveFileSystem() {
            localStorage.setItem('os.fileSystem', JSON.stringify(this.fileSystem));
        },

        playSound(soundType) {
            if (!this.settings.sound || !this.sounds[soundType]) return;
            
            let soundPath = this.sounds[soundType];
            
            // If in dark mode, check if there's a subdued version in assets/sounds/dm/
            if (this.settings.theme === 'dark') {
                const fileName = soundPath.split('/').pop();
                // Only these three have official dark mode variants in the dm folder
                const dmVariants = ['Windows Background.wav', 'Windows Notify.wav', 'Windows User Account Control.wav'];
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
            this.logEvent('System', 'Information', `Starting application: ${title || appHandle}`);
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
                
                this.focusWindow(existing.id);
                if (existing.minimized) this.toggleMinimize(existing.id);

                if (appHandle === 'explorer' && extraData.initialPath) {
                    // Dispatch after focusing to ensure the listener identifies the right window
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('explorer-navigate', { detail: { path: extraData.initialPath } }));
                    }, 10);
                }
                return;
            }

            const id = Date.now();
            const isSmallScreen = window.innerWidth < 1024;
            
            let width = isSmallScreen ? window.innerWidth : 800;
            let height = isSmallScreen ? window.innerHeight - 48 : 600;
            
            if (width > window.innerWidth) width = window.innerWidth;
            if (height > window.innerHeight - 48) height = window.innerHeight - 48;

            let x = isSmallScreen ? 0 : (window.innerWidth - width) / 2 + (this.windows.length * 30);
            let y = isSmallScreen ? 0 : (window.innerHeight - 48 - height) / 2 + (this.windows.length * 30);

            const newWindow = {
                id,
                app: appHandle,
                title: title || appHandle.charAt(0).toUpperCase() + appHandle.slice(1),
                x,
                y,
                width,
                height,
                z: this.nextWindowZ++,
                minimized: false,
                maximized: isSmallScreen,
                loading: true,
                ...extraData
            };

            this.windows.push(newWindow);
            this.focusedWindowId = id;
            this.playSound('open');

            fetch(`${window.portfolioConfig.basePath}api/app.php?name=${appHandle}`)
                .then(res => res.text())
                .then(html => {
                    const win = this.windows.find(w => w.id === id);
                    if (win) {
                        win.content = html;
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
            }
            this.windows = this.windows.filter(w => w.id !== id);
            if (this.focusedWindowId === id) {
                const remaining = this.windows.filter(w => !w.minimized);
                if (remaining.length > 0) {
                    this.focusWindow(remaining[remaining.length - 1].id);
                } else {
                    this.focusedWindowId = null;
                }
            }
        },

        focusWindow(id) {
            const win = this.windows.find(w => w.id === id);
            if (win) {
                win.z = this.nextWindowZ++;
                this.focusedWindowId = id;
            }
        },

        toggleMinimize(id) {
            const win = this.windows.find(w => w.id === id);
            if (win) {
                win.minimized = !win.minimized;
                if (!win.minimized) {
                    this.focusWindow(id);
                } else {
                    this.playSound('minimize');
                }
            }
        },

        toggleMaximize(id) {
            const win = this.windows.find(w => w.id === id);
            if (win) {
                win.maximized = !win.maximized;
            }
        },

        setWallpaper(url) {
            this.settings.wallpaper = url;
            this.previewWallpaper = null; // Clear preview on permanent save
            localStorage.setItem('settings.wallpaper', url);
            this.playSound('click');
        },

        setCookieConsent(val) {
            this.cookieConsent = val;
            localStorage.setItem('cookie.consent', val);
            if (val) {
                // Initialize GTM if accepted
                if (window.initGTM) window.initGTM();
            }
            this.showCookieNotification = false;
        },

        writeFile(path, file) {
            if (!this.fileSystem[path]) {
                this.fileSystem[path] = [];
            }
            
            const existingIndex = this.fileSystem[path].findIndex(f => f.name === file.name);
            if (existingIndex > -1) {
                this.fileSystem[path][existingIndex] = { ...this.fileSystem[path][existingIndex], ...file };
            } else {
                this.fileSystem[path].push(file);
            }
            
            this.logEvent('FileSystem', 'Information', `File saved: ${path}\\${file.name}`);
            this.saveFileSystem();
            return true;
        }
    });
});
