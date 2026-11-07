<!DOCTYPE html>
<html lang="en-GB" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, interactive-widget=resizes-content">
    <title>DeVanté Johnson-Rose | Full Stack Developer & Systems Engineer · Portfolio OS</title>
    <meta name="description" content="DeVanté Johnson-Rose is a Senior Full Stack Developer and Systems Engineer in the UK building scalable web platforms, enterprise infrastructure, and developer tooling. Explore the interactive Windows-style portfolio.">
    <meta name="author" content="DeVanté Johnson-Rose">
    <meta name="keywords" content="DeVanté Johnson-Rose, full stack developer UK, systems engineer, PHP developer, React developer, portfolio, SCCM, JAMF, automation, devante.johnson-rose.co.uk">
    <meta name="robots" content="index, follow, max-image-preview:large">
    <meta name="theme-color" content="#0078d4">
    <link rel="canonical" href="https://devante.johnson-rose.co.uk/">

    <!-- Open Graph (Facebook, LinkedIn, etc.) -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="DeVanté Johnson-Rose · Portfolio OS">
    <meta property="og:title" content="DeVanté Johnson-Rose | Full Stack Developer & Systems Engineer">
    <meta property="og:description" content="Interactive Windows 11-styled portfolio. Open the apps, browse the projects, drop into the CV. Every desktop tile is a real, working surface.">
    <meta property="og:url" content="https://devante.johnson-rose.co.uk/">
    <meta property="og:image" content="https://devante.johnson-rose.co.uk/assets/img/share-card.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:alt" content="Portrait of DeVanté Johnson-Rose beside his name and devante.johnson-rose.co.uk">
    <meta property="og:locale" content="en_GB">

    <!-- Twitter / X card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="DeVanté Johnson-Rose | Portfolio OS">
    <meta name="twitter:description" content="Interactive Windows-style portfolio with working Paint, Terminal, Explorer, Outlook, FL Studio, and more.">
    <meta name="twitter:image" content="https://devante.johnson-rose.co.uk/assets/img/share-card.png">
    <meta name="twitter:image:alt" content="Portrait of DeVanté Johnson-Rose beside his name and devante.johnson-rose.co.uk">

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="<?php echo BASE_PATH; ?>favicon.ico">
    <link rel="shortcut icon" href="<?php echo BASE_PATH; ?>favicon.ico">
    <link rel="icon" type="image/webp" sizes="32x32" href="<?php echo IMG_PATH; ?>favicon.webp">
    <link rel="apple-touch-icon" sizes="180x180" href="<?php echo IMG_PATH; ?>favicon.webp">
    <link rel="manifest" href="<?php echo BASE_PATH; ?>manifest.json">
    <link rel="preload" as="image" href="<?php echo IMG_PATH; ?>startmenu.webp">
    <link rel="preload" as="image" href="<?php echo IMG_PATH; ?>settings.webp">
    <link rel="preload" as="image" href="<?php echo IMG_PATH; ?>wallpaper-bloom.webp">

    <!-- JSON-LD: Person + WebSite for rich Google results. The same in v2/index.html,
         and worksFor, alumniOf, knowsAbout and sameAs follow data/profile.json, which
         /cv reads (v2/src/data/profile.test.ts checks all three). -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "@id": "https://devante.johnson-rose.co.uk/#person",
          "name": "DeVanté Johnson-Rose",
          "url": "https://devante.johnson-rose.co.uk/",
          "image": "https://devante.johnson-rose.co.uk/assets/img/profile.webp",
          "jobTitle": "Senior Full Stack Developer & Systems Engineer",
          "email": "mailto:devante@johnson-rose.co.uk",
          "worksFor": [
            { "@type": "Organization", "name": "Killik & Co" },
            { "@type": "Organization", "name": "Coded Vision Design" }
          ],
          "alumniOf": { "@type": "CollegeOrUniversity", "name": "University of East Anglia" },
          "knowsAbout": [
            "Applications support", "Full-stack development", "PHP", "Laravel", "JavaScript",
            "TypeScript", "React", "Next.js", "Node.js", "MySQL", "MS SQL Server", "PowerShell",
            "Automation", "SCCM", "JAMF", "Active Directory", "Docker", "AI integration"
          ],
          "sameAs": [
            "https://github.com/CodedVisionDesign"
          ]
        },
        {
          "@type": "WebSite",
          "@id": "https://devante.johnson-rose.co.uk/#website",
          "url": "https://devante.johnson-rose.co.uk/",
          "name": "DeVanté Johnson-Rose · Portfolio OS",
          "description": "Interactive Windows-style portfolio of DeVanté Johnson-Rose.",
          "publisher": { "@id": "https://devante.johnson-rose.co.uk/#person" }
        }
      ]
    }
    </script>
    <?php
    // Every shared module's plain address points at its current version, so a
    // module that imports another (terminal.js imports file-ops.js) gets the
    // same copy as the page below, never a second, stale one from the cache.
    $sharedModules = [];
    foreach (glob(__DIR__ . '/../assets/js/windowing/*.js') ?: [] as $moduleFile) {
        $moduleUrl = BASE_PATH . 'assets/js/windowing/' . basename($moduleFile);
        $sharedModules[$moduleUrl] = $moduleUrl . '?v=' . filemtime($moduleFile);
    }
    ?>
    <script type="importmap" nonce="<?php echo $cspNonce; ?>"><?php echo json_encode(['imports' => $sharedModules], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP); ?></script>
    <!-- Window manager core, shared with v2. Runs before Alpine, as both are deferred. -->
    <script type="module" nonce="<?php echo $cspNonce; ?>">
        import * as windowing from '<?php echo BASE_PATH; ?>assets/js/windowing/windowing.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/windowing.js') ?: time(); ?>';
        import * as shellCore from '<?php echo BASE_PATH; ?>assets/js/windowing/shell-core.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/shell-core.js'); ?>';
        import * as fileOps from '<?php echo BASE_PATH; ?>assets/js/windowing/file-ops.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/file-ops.js'); ?>';
        import * as textOps from '<?php echo BASE_PATH; ?>assets/js/windowing/text-ops.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/text-ops.js'); ?>';
        import * as flStudio from '<?php echo BASE_PATH; ?>assets/js/windowing/fl-studio.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/fl-studio.js'); ?>';
        import * as officeApps from '<?php echo BASE_PATH; ?>assets/js/windowing/office.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/office.js'); ?>';
        import * as drawing from '<?php echo BASE_PATH; ?>assets/js/windowing/drawing.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/drawing.js'); ?>';
        import * as shellUi from '<?php echo BASE_PATH; ?>assets/js/windowing/shell-ui.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/shell-ui.js'); ?>';
        import * as calculator from '<?php echo BASE_PATH; ?>assets/js/windowing/calculator.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/calculator.js'); ?>';
        import * as terminal from '<?php echo BASE_PATH; ?>assets/js/windowing/terminal.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/terminal.js'); ?>';
        import * as browser from '<?php echo BASE_PATH; ?>assets/js/windowing/browser.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/browser.js'); ?>';
        import * as media from '<?php echo BASE_PATH; ?>assets/js/windowing/media.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/media.js'); ?>';
        import * as sql from '<?php echo BASE_PATH; ?>assets/js/windowing/sql.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/sql.js'); ?>';
        import * as devtools from '<?php echo BASE_PATH; ?>assets/js/windowing/devtools.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/devtools.js'); ?>';
        import * as references from '<?php echo BASE_PATH; ?>assets/js/windowing/references.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/references.js'); ?>';
        import * as weather from '<?php echo BASE_PATH; ?>assets/js/windowing/weather.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/weather.js'); ?>';
        import * as calendar from '<?php echo BASE_PATH; ?>assets/js/windowing/calendar.js?v=<?php echo @filemtime(__DIR__ . '/../assets/js/windowing/calendar.js'); ?>';
        window.OsWindowing = { ...windowing, ...shellCore, ...fileOps, ...textOps, ...shellUi, ...calculator, ...terminal, ...browser, ...media, ...sql, ...devtools, ...references, ...weather, ...calendar };
        window.FlStudio = flStudio;
        window.OfficeApps = officeApps;
        window.Drawing = drawing;
    </script>
    <!-- Alpine.js -->
    <script defer src="<?php echo BASE_PATH; ?>assets/js/alpine/alpine-3.17.5.min.js"></script>
    
    <!-- Google Tag Manager (Conditional) -->
    <script nonce="<?php echo $cspNonce; ?>">
        window.initGTM = function() {
            window['ga-disable-G-64PRMY8EKD'] = false;
            if (window.gtmInitialized) return;
            window.gtmInitialized = true;

            var script = document.createElement('script');
            script.async = true;
            script.src = "https://www.googletagmanager.com/gtag/js?id=G-64PRMY8EKD";
            document.head.appendChild(script);

            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-64PRMY8EKD');
            console.log('GTM Initialized');
        };

        // Consent withdrawn: Google's own switch stops Analytics sending, and its
        // script and cookies go.
        window.disableGTM = function() {
            window['ga-disable-G-64PRMY8EKD'] = true;
            document.querySelectorAll('script[src*="googletagmanager.com"]').forEach(function(script) { script.remove(); });
            document.cookie.split(';').forEach(function(cookie) {
                var name = cookie.split('=')[0].trim();
                if (name.indexOf('_ga') !== 0) return;
                document.cookie = name + '=; Max-Age=0; path=/';
                document.cookie = name + '=; Max-Age=0; path=/; domain=.' + location.hostname.replace(/^www\./, '');
            });
        };

        // Auto-init if consent already given. Storage can be blocked, which throws.
        try {
            if (localStorage.getItem('cookie.consent') === 'true') window.initGTM();
        } catch (e) {}
    </script>

    <!-- Custom CSS -->
    <?php
    // Cache-bust on file mtime so a fresh CSS bundle invalidates the
    // browser + Hostinger CDN cache immediately (default Cache-Control on
    // /assets is max-age=604800, and without this the URL never changes and
    // the old bundle keeps serving for a week after each deploy).
    $cssPath = __DIR__ . '/../assets/css/app.css';
    $cssVer  = @filemtime($cssPath) ?: time();
    ?>
    <link rel="stylesheet" href="<?php echo BASE_PATH; ?>assets/css/app.css?v=<?php echo $cssVer; ?>">
    <?php $appManifest = load_app_manifest(); // Shared with v2. See data/apps.json. ?>
    <script nonce="<?php echo $cspNonce; ?>">
        window.portfolioConfig = {
            apps: <?php echo js_value((object)array_column($appManifest['apps'], null, 'id')); ?>,
            pinned: <?php echo js_value($appManifest['pinned']); ?>,
            startPinned: <?php echo js_value($appManifest['startPinned']); ?>,
            fileSystem: <?php echo js_value((object)load_shared_data('filesystem')); ?>,
            menus: <?php echo js_value((object)load_shared_data('menus')); ?>,
            email: <?php echo js_value($config['email']); ?>,
            appToOpen: <?php echo js_value($appToOpen ?? ''); ?>,
            basePath: <?php echo js_value(BASE_PATH); ?>,
            imgPath: <?php echo js_value(IMG_PATH); ?>
        };
    </script>
    <style type="text/css">
    .wallpaper-bg {
        background: linear-gradient(135deg, #004a80 0%, #0078d4 100%);
        background-image: var(--wallpaper);
        /* The default wallpaper's average colour, shown until it loads or if it fails. */
        background-color: #381759;
        background-size: cover;
        background-position: center;
    }
    </style>
</head>
<body class="h-full w-full overflow-hidden transition-[filter] duration-300" 
      x-data="os" 
      :class="{ 'dark': settings.theme === 'dark' }"
      :style="`--wallpaper: ${OsWindowing.cssUrl(Alpine.store('os').previewWallpaper || settings.wallpaper)}; filter: ${OsWindowing.displayFilter(settings)};`"
      @keydown.window="handleGlobalKeys($event)"
      @keyup.window="handleGlobalKeyUp($event)">

    <a href="#main-content" class="os-skip-link">Skip to main content</a>

    <!-- The same notice as v2/index.html. Styled inline, as no stylesheet is certain to load. -->
    <noscript>
        <div data-noscript style="position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:24px;background:#381759;color:#fff;font:16px/1.5 'Segoe UI',Selawik,system-ui,sans-serif;text-align:center">
            <p style="max-width:32rem;margin:0">This desktop needs JavaScript. <a href="<?php echo BASE_PATH; ?>cv" style="color:#fff;text-decoration:underline">Read the CV</a> instead, which works without it.</p>
        </div>
    </noscript>

    <div id="os-root" class="h-full w-full relative overflow-hidden flex flex-col wallpaper-bg">
        <!-- Boot Screen, the same in v2 (BootScreen.tsx) -->
        <div x-show="isBooting"
             x-cloak
             data-boot-screen
             role="status"
             aria-label="Starting up"
             class="fixed inset-0 z-20000 bg-black text-white flex flex-col items-center justify-center transition-opacity duration-1000"
             x-transition:leave="opacity-0">
            <!-- Windows 11 Style Logo -->
            <div class="mb-24 scale-150">
                <img src="<?php echo IMG_PATH; ?>startmenu.webp" alt="" class="w-16 h-16">
            </div>
            
            <!-- Realistic Windows 11 Dots Loader -->
            <div class="win-loader">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        </div>

        <!-- Login Animation Screen -->
        <div x-show="loggingIn" 
             x-cloak
             role="status"
             aria-label="Signing in"
             class="fixed inset-0 z-15000 flex flex-col items-center justify-center text-white transition-opacity duration-500 wallpaper-bg"
             x-transition:enter="opacity-0"
             x-transition:enter-end="opacity-100"
             x-transition:leave="opacity-100"
             x-transition:leave-end="opacity-0">

            <div class="flex flex-col items-center space-y-8">
                <!-- User Avatar -->
                <div class="w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl scale-110">
                    <img :src="user.avatar" :alt="user.name" class="w-full h-full object-cover">
                </div>
                
                <div class="flex flex-col items-center space-y-4">
                    <h1 class="text-4xl font-light text-white drop-shadow-lg">Welcome</h1>
                    
                    <!-- Realistic Windows 11 Dots Loader -->
                    <div class="win-loader scale-75 mt-4">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Global Context Menu -->
        <div x-show="contextMenu.open"
             x-cloak
             :data-context-menu="contextMenu.variant || 'modern'"
             @click.away="contextMenu.open = false"
             @keydown.escape.window="contextMenu.open = false"
             :class="contextMenu.variant === 'classic' ? 'bg-[#f0f0f0] dark:bg-[#2b2b2b] border border-[#a0a0a0] dark:border-black shadow-[2px_2px_4px_rgba(0,0,0,0.3)] py-1 min-w-[240px]' : 'bg-white/90 dark:bg-[#1c1c1c]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl py-1 min-w-[260px] context-menu'"
             class="fixed z-15000 animate-in fade-in zoom-in duration-75"
             :style="`left: ${contextMenu.x}px; top: ${contextMenu.y}px;`"
             @contextmenu.prevent
             x-data="{ hoverItem: null, hoverTimer: null }">
            
            <!-- Horizontal Action Bar (Win11 File Style) -->
            <template x-if="contextMenu.actions && contextMenu.actions.length > 0">
                <div class="context-menu-action-bar">
                    <template x-for="(action, idx) in contextMenu.actions" :key="idx">
                        <div @click="if(!action.disabled) { contextMenu.open = false; action.action() }"
                             class="context-menu-action-btn group"
                             :class="{ 'disabled': action.disabled }"
                             :data-menu-action="action.label"
                             :title="action.label">
                            <span class="context-menu-icon pointer-events-none"><img :src="action.icon" alt="" class="w-4 h-4"></span>
                        </div>
                    </template>
                </div>
            </template>

            <template x-for="(item, index) in (contextMenu.items || [])" :key="item.label ? item.label + index : 'sep' + index">
                <div>
                    <template x-if="item.separator">
                        <div class="context-menu-separator" data-menu-separator></div>
                    </template>
                    <template x-if="!item.separator">
                        <div @click="if(!item.disabled) { contextMenu.open = false; item.action() }"
                             :data-menu-item="item.label"
                             @mouseenter="clearTimeout(hoverTimer); hoverTimer = setTimeout(() => hoverItem = index, 60)"
                             @mouseleave="clearTimeout(hoverTimer); hoverItem = null"
                             :class="{ 'active': hoverItem === index, 'disabled': item.disabled }"
                             class="context-menu-item flex items-center justify-between px-3 py-1.5 cursor-default group transition-colors">
                            <div class="flex items-center">
                                <span class="w-4 h-4 mr-3 flex items-center justify-center text-sm context-menu-icon"><img :src="item.icon" alt="" class="w-4 h-4"></span>
                                <span class="context-menu-label" x-text="item.label"></span>
                            </div>
                            <span x-show="item.shortcut" data-menu-shortcut class="text-xs opacity-60 ml-4 font-mono" x-text="item.shortcut"></span>
                        </div>
                    </template>
                </div>
            </template>
        </div>


        <!-- Main Content Area -->
        <main id="main-content" tabindex="-1" class="grow relative h-full w-full outline-hidden" @contextmenu="onDesktopContextMenu($event)">
            <!-- Windows Error Dialog (Modal) -->
            <div x-show="$store.os.errorDialog.open" 
                 x-cloak
                 class="fixed inset-0 z-30000 flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                <div @click.away="$store.os.errorDialog.open = false"
                     x-transition:enter="transition ease-out duration-200"
                     x-transition:enter-start="opacity-0 scale-95"
                     x-transition:enter-end="opacity-100 scale-100"
                     class="w-[400px] bg-white dark:bg-[#1c1c1c] rounded-xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden flex flex-col">
                    <!-- Titlebar -->
                    <div class="h-10 flex items-center justify-between px-4 select-none">
                        <span class="text-xs font-medium opacity-80" x-text="$store.os.errorDialog.title"></span>
                        <button @click="$store.os.errorDialog.open = false" class="hover:bg-red-600 hover:text-white transition-colors p-2 rounded-xs group">
                            <svg class="w-3 h-3 opacity-70 group-hover:opacity-100" viewBox="0 0 10 10"><path d="M10,1.4L8.6,0L5,3.6L1.4,0L0,1.4L3.6,5L0,8.6L1.4,10L5,6.4l3.6,3.6l1.4-1.4L6.4,5L10,1.4z" fill="currentColor"/></svg>
                        </button>
                    </div>
                    <!-- Content -->
                    <div class="p-6 flex items-start space-x-4">
                        <div class="w-10 h-10 shrink-0 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-full">
                            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                        </div>
                        <div class="flex flex-col space-y-1">
                            <p class="text-sm font-semibold text-black dark:text-white" x-text="$store.os.errorDialog.message"></p>
                            <p class="text-xs opacity-60 font-mono break-all" x-text="$store.os.errorDialog.path"></p>
                        </div>
                    </div>
                    <!-- Footer -->
                    <div class="p-4 bg-gray-50 dark:bg-black/20 flex justify-end">
                        <button @click="$store.os.errorDialog.open = false" 
                                class="bg-win-blue text-white px-8 py-1.5 rounded-sm text-xs font-medium hover:bg-blue-600 shadow-xs transition-colors">
                            OK
                        </button>
                    </div>
                </div>
            </div>

            <!-- Login Screen -->
            <div x-show="!loggedIn && !isBooting && !loggingIn" x-cloak class="h-full w-full absolute inset-0 z-1000">
                <?php include __DIR__ . '/login.php'; ?>
            </div>
            
            <!-- Desktop Environment -->
            <div x-show="loggedIn && !isBooting && !loggingIn" x-cloak class="h-full w-full absolute inset-0 z-1">
                <?php include __DIR__ . '/desktop.php'; ?>
                <?php include __DIR__ . '/file-dialogs.php'; ?>
            </div>
        </main>

        <!-- Windows 11 Cookie Notification, the same in v2 (CookieBanner.tsx). On a
             phone it is a slim bar that windows keep clear of (windowing.css). -->
        <div x-show="$store.os.showCookieNotification && loggedIn && !isBooting && !loggingIn"
             x-cloak
             x-init="reserveConsentSpace($el)"
             x-transition:enter="transition ease-out duration-300"
             x-transition:enter-start="opacity-0 translate-y-10"
             x-transition:enter-end="opacity-100 translate-y-0"
             x-transition:leave="transition ease-in duration-200"
             x-transition:leave-start="opacity-100 scale-100"
             x-transition:leave-end="opacity-0 scale-90"
             role="dialog"
             aria-label="Cookie consent"
             data-cookie-banner
             class="os-consent glass dark:bg-[#1c1c1c]/90 border border-white/20 dark:border-white/10 shadow-2xl overflow-hidden text-black dark:text-white">
            <div class="os-consent-body p-4 flex flex-col gap-3">
                <div class="os-consent-title font-semibold text-sm">Cookies &amp; telemetry</div>
                <p class="text-xs leading-relaxed">
                    If you accept, the site records which apps you open and a shortened IP address, and may load Google Analytics. Records are kept for 90 days.
                    Decline and none of this happens. You can change your mind at any time in Settings.
                    <a href="<?php echo BASE_PATH; ?>privacy" target="_blank" rel="noopener" class="underline text-win-blue dark:text-[#60cdff]">Privacy notice</a>
                </p>
                <div class="os-consent-actions flex items-center justify-end gap-2">
                    <button type="button" @click="$store.os.setCookieConsent(false)"
                            class="px-4 rounded-sm text-xs hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                        Decline
                    </button>
                    <button type="button" @click="$store.os.setCookieConsent(true)"
                            class="px-4 rounded-sm bg-win-blue text-white text-xs font-medium hover:opacity-90 transition-opacity">
                        Accept
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Alpine.js Components -->
    <?php 
    $components = [
        'os/filesystem',
        'os/store',
        'os/shell',
        'os/calendar',
        'paint',
        'photoshop',
        'calculator',
        'terminal',
        'explorer',
        'photos',
        'edge',
        'apps/office',
        'apps/dev',
        'apps/media',
        'apps/system',
        'apps/tools',
        'apps/admin',
        'flstudio'
    ];
    // Versioned by file time like the stylesheet, so browsers keep each script
    // until it changes instead of fetching all of them on every visit.
    foreach ($components as $component) {
        $version = @filemtime(__DIR__ . '/../assets/js/components/' . $component . '.js');
        echo '<script src="' . BASE_PATH . 'assets/js/components/' . $component . '.js?v=' . $version . '"></script>' . "\n    ";
    }
    ?>
</body>
</html>
