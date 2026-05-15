<!DOCTYPE html>
<html lang="en" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
    <meta property="og:description" content="Interactive Windows 11-styled portfolio. Open the apps, browse the projects, drop into the CV — every desktop tile is a real, working surface.">
    <meta property="og:url" content="https://devante.johnson-rose.co.uk/">
    <meta property="og:image" content="https://devante.johnson-rose.co.uk/assets/img/favicon.png">
    <meta property="og:locale" content="en_GB">

    <!-- Twitter / X card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="DeVanté Johnson-Rose | Portfolio OS">
    <meta name="twitter:description" content="Interactive Windows-style portfolio with working Paint, Terminal, Explorer, Outlook, FL Studio, and more.">
    <meta name="twitter:image" content="https://devante.johnson-rose.co.uk/assets/img/favicon.png">

    <!-- Favicon -->
    <link rel="icon" type="image/x-icon" href="<?php echo BASE_PATH; ?>favicon.ico">
    <link rel="shortcut icon" href="<?php echo BASE_PATH; ?>favicon.ico">
    <link rel="icon" type="image/png" sizes="32x32" href="<?php echo IMG_PATH; ?>favicon.png">
    <link rel="apple-touch-icon" sizes="180x180" href="<?php echo IMG_PATH; ?>favicon.png">
    <link rel="manifest" href="<?php echo BASE_PATH; ?>manifest.json">
    <link rel="preload" as="image" href="<?php echo IMG_PATH; ?>startmenu.webp">
    <link rel="preload" as="image" href="<?php echo IMG_PATH; ?>settings.webp">

    <!-- JSON-LD: Person + WebSite for rich Google results -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Person",
          "@id": "https://devante.johnson-rose.co.uk/#person",
          "name": "DeVanté Johnson-Rose",
          "url": "https://devante.johnson-rose.co.uk/",
          "image": "https://devante.johnson-rose.co.uk/assets/img/profile.png",
          "jobTitle": "Senior Full Stack Developer & Systems Engineer",
          "email": "mailto:devante@johnson-rose.co.uk",
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
    <!-- HTMX -->
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <!-- Alpine.js -->
    <script defer src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js"></script>
    
    <!-- Google Tag Manager (Conditional) -->
    <script>
        window.initGTM = function() {
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
        
        // Auto-init if consent already given
        if (localStorage.getItem('cookie.consent') === 'true') {
            window.initGTM();
        }
    </script>

    <!-- Custom CSS -->
    <link rel="stylesheet" href="<?php echo BASE_PATH; ?>assets/css/app.css">
    <script>
        window.portfolioConfig = {
            email: '<?php echo $config["email"]; ?>',
            appToOpen: '<?php echo $appToOpen ?? ""; ?>',
            basePath: '<?php echo BASE_PATH; ?>',
            imgPath: '<?php echo IMG_PATH; ?>'
        };
    </script>
    <style type="text/css">
    .wallpaper-bg {
        background: linear-gradient(135deg, #004a80 0%, #0078d4 100%);
        background-image: var(--wallpaper);
        background-size: cover;
        background-position: center;
    }
    </style>
</head>
<body class="h-full w-full overflow-hidden transition-[filter] duration-300" 
      x-data="os" 
      :class="{ 'dark': settings.theme === 'dark' }"
      :style="`--wallpaper: url(${Alpine.store('os').previewWallpaper || settings.wallpaper}); filter: brightness(${settings.brightness}%) ${settings.nightLight ? 'sepia(40%) saturate(120%)' : ''} ${settings.accessibility ? 'contrast(120%) brightness(110%)' : ''};`"
      @keydown.window="handleGlobalKeys($event)">

    <div id="os-root" class="h-full w-full relative overflow-hidden flex flex-col wallpaper-bg">
        <!-- Boot Screen -->
        <div x-show="isBooting" 
             x-cloak
             class="fixed inset-0 z-[20000] bg-black flex flex-col items-center justify-center transition-opacity duration-1000"
             x-transition:leave="opacity-0">
            <!-- Windows 11 Style Logo -->
            <div class="mb-24 scale-150">
                <img src="<?php echo IMG_PATH; ?>startmenu.webp" class="w-16 h-16">
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
             class="fixed inset-0 z-[15000] flex flex-col items-center justify-center transition-opacity duration-500 wallpaper-bg"
             x-transition:enter="opacity-0"
             x-transition:enter-end="opacity-100"
             x-transition:leave="opacity-100"
             x-transition:leave-end="opacity-0">
            
            <div class="flex flex-col items-center space-y-8">
                <!-- User Avatar -->
                <div class="w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl scale-110">
                    <img :src="user.avatar" alt="User" class="w-full h-full object-cover">
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
             @click.away="contextMenu.open = false"
             @keydown.escape.window="contextMenu.open = false"
             :class="contextMenu.variant === 'classic' ? 'bg-[#f0f0f0] dark:bg-[#2b2b2b] border border-[#a0a0a0] dark:border-black shadow-[2px_2px_4px_rgba(0,0,0,0.3)] py-1 min-w-[240px]' : 'bg-white/90 dark:bg-[#1c1c1c]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl py-1 min-w-[260px] context-menu'"
             class="fixed z-[15000] animate-in fade-in zoom-in duration-75"
             :style="`left: ${contextMenu.x}px; top: ${contextMenu.y}px;`"
             @contextmenu.prevent
             x-data="{ hoverItem: null, hoverTimer: null }">
            
            <!-- Horizontal Action Bar (Win11 File Style) -->
            <template x-if="contextMenu.actions && contextMenu.actions.length > 0">
                <div class="context-menu-action-bar">
                    <template x-for="(action, idx) in contextMenu.actions" :key="idx">
                        <div @click="if(!action.disabled) { action.action(); contextMenu.open = false }"
                             class="context-menu-action-btn group"
                             :class="{ 'disabled': action.disabled }"
                             :title="action.label">
                            <span class="context-menu-icon pointer-events-none" x-html="action.icon"></span>
                        </div>
                    </template>
                </div>
            </template>

            <template x-for="(item, index) in (contextMenu.items || [])" :key="item.label ? item.label + index : 'sep' + index">
                <div>
                    <template x-if="item.separator">
                        <div class="context-menu-separator"></div>
                    </template>
                    <template x-if="!item.separator">
                        <div @click="if(!item.disabled) { item.action(); contextMenu.open = false }"
                             @mouseenter="clearTimeout(hoverTimer); hoverTimer = setTimeout(() => hoverItem = index, 60)"
                             @mouseleave="clearTimeout(hoverTimer); hoverItem = null"
                             :class="{ 'active': hoverItem === index, 'disabled': item.disabled }"
                             class="context-menu-item flex items-center justify-between px-3 py-1.5 cursor-default group transition-colors">
                            <div class="flex items-center">
                                <span class="w-4 h-4 mr-3 flex items-center justify-center text-sm context-menu-icon" x-html="item.icon"></span>
                                <span class="context-menu-label" x-text="item.label"></span>
                            </div>
                            <span x-show="item.shortcut" class="text-[10px] opacity-50 ml-4 font-mono" x-text="item.shortcut"></span>
                        </div>
                    </template>
                </div>
            </template>
            <!-- Show more options — only on the Win11 modern menu, hides
                 itself once the classic menu has taken over. The menu builders
                 (showDesktopContextMenu/showFileContextMenu) explicitly add a
                 "Show more options" item that maps to the classic builder
                 (showClassicDesktopContextMenu et al.), so this footer is
                 redundant for those entry points; it stays here as a fallback
                 for any context menu without its own entry. -->
            <template x-if="contextMenu.variant !== 'classic' && !(contextMenu.items || []).some(i => i.label === 'Show more options')">
                <div>
                    <div class="context-menu-separator"></div>
                    <div @click="showClassicDesktopContextMenu({ clientX: contextMenu.x, clientY: contextMenu.y })"
                         @mouseenter="clearTimeout(hoverTimer); hoverTimer = setTimeout(() => hoverItem = 'more', 60)"
                         @mouseleave="clearTimeout(hoverTimer); hoverItem = null"
                         :class="{ 'active': hoverItem === 'more' }"
                         class="context-menu-item flex items-center justify-between px-3 py-1.5 cursor-default transition-colors">
                        <div class="flex items-center">
                            <span class="w-4 h-4 mr-3 flex items-center justify-center context-menu-icon">⤓</span>
                            <span class="context-menu-label">Show more options</span>
                        </div>
                        <span class="text-[10px] opacity-50 ml-4 font-mono">Shift+F10</span>
                    </div>
                </div>
            </template>
        </div>

        <!-- Snap Preview Overlay -->
        <div x-show="snapPreview.show" 
             x-cloak
             class="fixed z-[10000] bg-win-blue/20 border-2 border-win-blue/50 backdrop-blur-sm pointer-events-none transition-all duration-200"
             :style="`left: ${snapPreview.x}px; top: ${snapPreview.y}px; width: ${snapPreview.w}px; height: ${snapPreview.h}px; opacity: ${snapPreview.opacity};`"
             x-transition:enter="ease-out duration-200"
             x-transition:enter-start="opacity-0 scale-95"
             x-transition:enter-end="opacity-100 scale-100">
        </div>

        <!-- Main Content Area -->
        <main id="main-content" class="flex-grow relative h-full w-full" @contextmenu.prevent="showDesktopContextMenu($event)">
            <!-- Windows Error Dialog (Modal) -->
            <div x-show="$store.os.errorDialog.open" 
                 x-cloak
                 class="fixed inset-0 z-[30000] flex items-center justify-center bg-black/20 backdrop-blur-[2px]">
                <div @click.away="$store.os.errorDialog.open = false"
                     x-transition:enter="transition ease-out duration-200"
                     x-transition:enter-start="opacity-0 scale-95"
                     x-transition:enter-end="opacity-100 scale-100"
                     class="w-[400px] bg-white dark:bg-[#1c1c1c] rounded-xl shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden flex flex-col">
                    <!-- Titlebar -->
                    <div class="h-10 flex items-center justify-between px-4 select-none">
                        <span class="text-xs font-medium opacity-80" x-text="$store.os.errorDialog.title"></span>
                        <button @click="$store.os.errorDialog.open = false" class="hover:bg-red-600 hover:text-white transition-colors p-2 rounded-sm group">
                            <svg class="w-3 h-3 opacity-70 group-hover:opacity-100" viewBox="0 0 10 10"><path d="M10,1.4L8.6,0L5,3.6L1.4,0L0,1.4L3.6,5L0,8.6L1.4,10L5,6.4l3.6,3.6l1.4-1.4L6.4,5L10,1.4z" fill="currentColor"/></svg>
                        </button>
                    </div>
                    <!-- Content -->
                    <div class="p-6 flex items-start space-x-4">
                        <div class="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-red-100 dark:bg-red-900/30 rounded-full">
                            <svg class="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                            </svg>
                        </div>
                        <div class="flex flex-col space-y-1">
                            <p class="text-sm font-semibold text-black dark:text-white" x-text="$store.os.errorDialog.message"></p>
                            <p class="text-[11px] opacity-60 font-mono break-all" x-text="$store.os.errorDialog.path"></p>
                        </div>
                    </div>
                    <!-- Footer -->
                    <div class="p-4 bg-gray-50 dark:bg-black/20 flex justify-end">
                        <button @click="$store.os.errorDialog.open = false" 
                                class="bg-win-blue text-white px-8 py-1.5 rounded text-xs font-medium hover:bg-blue-600 shadow-sm transition-colors">
                            OK
                        </button>
                    </div>
                </div>
            </div>

            <!-- Login Screen -->
            <div x-show="!loggedIn && !isBooting && !loggingIn" x-cloak class="h-full w-full absolute inset-0 z-[1000]">
                <?php include __DIR__ . '/login.php'; ?>
            </div>
            
            <!-- Desktop Environment -->
            <div x-show="loggedIn && !isBooting && !loggingIn" x-cloak class="h-full w-full absolute inset-0 z-[1]">
                <?php include __DIR__ . '/desktop.php'; ?>
            </div>
        </main>

        <!-- Windows 11 Cookie Notification -->
        <div x-show="$store.os.showCookieNotification && !isBooting && !loggingIn" 
             x-cloak
             x-transition:enter="transition ease-out duration-300"
             x-transition:enter-start="opacity-0 translate-y-10"
             x-transition:enter-end="opacity-100 translate-y-0"
             x-transition:leave="transition ease-in duration-200"
             x-transition:leave-start="opacity-100 scale-100"
             x-transition:leave-end="opacity-0 scale-90"
             role="dialog"
             aria-label="Cookie consent"
             class="fixed bottom-16 left-4 right-4 md:left-auto md:right-4 z-[20000] md:w-[360px] glass dark:bg-[#1c1c1c]/90 border border-white/20 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden">
            <div class="p-4 flex flex-col space-y-3">
                <div class="font-semibold text-sm">Cookies &amp; telemetry</div>
                <p class="text-[11px] leading-relaxed opacity-80">
                    This portfolio uses a tiny telemetry call to <code class="opacity-90">/api/log.php</code> so I can see which apps visitors actually open. No personal data, no third-party scripts. Decline and the call won't fire &mdash; you can change your mind any time in Settings.
                </p>
                <div class="flex items-center justify-end space-x-2">
                    <button @click="$store.os.setCookieConsent(false)"
                            class="px-3 py-1 rounded text-[11px] hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                        Decline
                    </button>
                    <button @click="$store.os.setCookieConsent(true)"
                            class="px-4 py-1 rounded bg-win-blue text-white text-[11px] font-medium hover:opacity-90 transition-opacity">
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
        'paint',
        'calculator',
        'terminal',
        'explorer',
        'photos',
        'edge',
        'apps/database-sql',
        'apps/office',
        'apps/dev',
        'apps/media',
        'apps/system',
        'apps/tools',
        'apps/admin',
        'flstudio'
    ];
    foreach ($components as $component) {
        echo '<script src="' . BASE_PATH . 'assets/js/components/' . $component . '.js?v=' . time() . '"></script>' . "\n    ";
    }
    ?>
    <script>
        document.body.addEventListener('htmx:afterSwap', function(evt) {
            // Re-initialize any needed scripts after HTMX swaps
        });
    </script>
</body>
</html>
