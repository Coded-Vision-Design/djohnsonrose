<!-- partials/taskbar.php -->
<div class="os-taskbar w-full taskbar-glass flex items-center justify-between px-2 z-9999 border-t border-white/20"
     :class="{ 'taskbar-mobile': !isDesktop }"
     @touchstart="handleTouchStart($event, (pos) => showTaskbarContextMenu(pos))"
     @touchmove="handleTouchMove($event)"
     @touchend="handleTouchEnd($event)"
     @contextmenu.prevent.stop="showTaskbarContextMenu($event)">
    <!-- Widgets Area (Left) -->
    <div class="flex items-center w-48 overflow-hidden" x-show="isDesktop" @contextmenu.prevent.stop="showTaskbarContextMenu($event)">
        <button type="button" @click="toggleWidgets()" data-widgets-toggle title="Widgets" class="px-2 py-1.5 rounded-sm hover:bg-white/10 cursor-pointer flex items-center space-x-2 transition-colors group">
            <span class="text-xl filter drop-shadow-xs group-hover:scale-110 transition-transform" x-text="weather.icon" aria-hidden="true"></span>
            <div class="flex flex-col leading-tight text-left">
                <span class="text-xs text-black dark:text-white font-semibold" x-text="weather.temp + '°C'"></span>
                <span class="text-xs text-black dark:text-white opacity-70 truncate" x-text="weather.condition"></span>
            </div>
        </button>
    </div>

    <!-- Pinned/Running Apps (Center) -->
    <div class="os-taskbar-apps flex items-center space-x-1">
        <!-- Start Button -->
        <button type="button" x-cloak @click="startMenuOpen = !startMenuOpen; if (startMenuOpen) { quickSettingsOpen = false; widgetsOpen = false }"
                data-start-button
                title="Start"
                class="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-white/10 transition-colors group"
                :class="{ 'bg-white/10': startMenuOpen }">
            <img src="<?php echo IMG_PATH; ?>startmenu.webp" alt="Start" class="w-6 h-6 transform transition-transform group-active:scale-90">
        </button>

        <!-- Search Button (Hide on small screens, integrated in Start) -->
        <button type="button" x-show="isDesktop" @click="startMenuOpen = true; $nextTick(() => document.querySelector('[data-start-menu] input[type=text]').focus())" title="Search" class="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-white/10 transition-colors">
            <svg class="w-5 h-5 text-win-blue" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </button>

        <!-- Task View (phones use the Open apps button below). See partials/task-view.php. -->
        <button type="button" x-show="!isMobile" @click="$store.os.taskSwitcherOpen = !$store.os.taskSwitcherOpen"
                data-task-view-toggle aria-label="Task view" aria-haspopup="dialog"
                :aria-expanded="$store.os.taskSwitcherOpen ? 'true' : 'false'"
                :aria-keyshortcuts="OsWindowing.TASK_VIEW_KEYS"
                :title="`Task view (${OsWindowing.TASK_VIEW_KEYS})`"
                class="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-white/10 transition-colors"
                :class="{ 'bg-white/10': $store.os.taskSwitcherOpen }">
            <svg class="w-5 h-5 text-gray-500 dark:text-gray-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>
        </button>

        <!-- Task switcher (phones) -->
        <button type="button" class="os-task-button w-10 h-10 items-center justify-center rounded-sm hover:bg-white/10 relative text-black dark:text-white"
                @click="$store.os.taskSwitcherOpen = !$store.os.taskSwitcherOpen"
                data-task-view-toggle aria-haspopup="dialog"
                :aria-expanded="$store.os.taskSwitcherOpen ? 'true' : 'false'"
                :aria-label="`Open apps: ${windows.length}`"
                title="Open apps">
            <svg class="w-5 h-5 fill-current opacity-80" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h11v13H4V7zm2 2v9h7V9H6zm11-5H7v2h10v11h2V4h-2z"/></svg>
            <span class="absolute top-0.5 right-0.5 text-xs leading-none font-semibold" x-text="windows.length || ''"></span>
        </button>

        <div class="w-px h-6 bg-white/10 mx-1 shrink-0"></div>

        <!-- Pinned and Running Apps -->
        <template x-for="appId in [...new Set([...$store.os.pinnedApps, ...windows.map(w => w.app)])]" :key="appId">
            <button @click="taskbarClick(appId)" 
                    @contextmenu.prevent.stop="showAppContextMenu($event, appId)"
                    @touchstart.stop="handleTouchStart($event, (pos) => showAppContextMenu(pos, appId))"
                    @touchmove="handleTouchMove($event)"
                    @touchend="handleTouchEnd($event)"
                    :data-taskbar-app="appId"
                    :title="appTitle(appId)"
                    class="w-10 h-10 flex items-center justify-center rounded-sm hover:bg-white/10 transition-all relative group"
                    :class="{ 'bg-white/10 shadow-inner': windows.some(w => w.app === appId && focusedWindowId === w.id) }">
                
                <div class="w-7 h-7 rounded-sm flex items-center justify-center overflow-hidden transition-transform group-hover:scale-110">
                    <img :src="appIcon(appId)" alt="" class="w-full h-full object-contain">
                </div>

                <!-- Active Indicator -->
                <template x-if="windows.some(w => w.app === appId)">
                    <div x-cloak class="absolute bottom-1 left-1/2 -translate-x-1/2 app-indicator" 
                         :class="{ 
                            'app-indicator-active glow': windows.some(w => w.app === appId && focusedWindowId === w.id), 
                            'app-indicator-inactive': windows.some(w => w.app === appId && !windows.some(w => w.app === appId && focusedWindowId === w.id) && !windows.every(w => w.app === appId && w.state === 'minimized')),
                            'app-indicator-minimized': windows.every(w => w.app === appId && w.state === 'minimized')
                         }"></div>
                </template>
            </button>
        </template>
    </div>

    <!-- System Tray (Right) -->
    <div class="os-taskbar-tray flex flex-row items-center space-x-1 px-2 text-black dark:text-white" 
         x-data="{ hiddenIconsOpen: false }"
         @contextmenu.prevent.stop="showTaskbarContextMenu($event)">
        
        <!-- Hidden Icons Popup -->
        <div x-show="hiddenIconsOpen" 
             x-cloak
             @click.away="hiddenIconsOpen = false"
             x-transition:enter="transition ease-out duration-200"
             x-transition:enter-start="opacity-0 translate-y-10 scale-95"
             x-transition:enter-end="opacity-100 translate-y-0 scale-100"
             class="absolute bottom-14 right-32 bg-white/90 dark:bg-[#1c1c1c]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl p-2 flex flex-row items-center flex-nowrap space-x-1 min-w-max z-10001">
            
            <!-- Dynamic Tray Icons -->
            <template x-if="windows.some(w => w.app === 'outlook')">
                <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-sm cursor-pointer transition-colors flex items-center justify-center" @click="openApp('outlook'); hiddenIconsOpen = false" title="Outlook">
                    <img alt="" :src="window.portfolioConfig.imgPath + 'outlook.webp'" class="w-5 h-5">
                </div>
            </template>
            <template x-if="windows.some(w => w.app === 'pdfreader')">
                <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-sm cursor-pointer transition-colors flex items-center justify-center" @click="openApp('pdfreader'); hiddenIconsOpen = false" title="PDF Reader">
                    <img alt="" :src="window.portfolioConfig.imgPath + 'pdf.webp'" class="w-5 h-5">
                </div>
            </template>
            <template x-if="windows.some(w => w.app === 'vscode')">
                <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-sm cursor-pointer transition-colors flex items-center justify-center" @click="openApp('vscode'); hiddenIconsOpen = false" title="Visual Studio Code">
                    <img alt="" :src="window.portfolioConfig.imgPath + 'vscode.webp'" class="w-5 h-5">
                </div>
            </template>
            <template x-if="settings.bluetooth">
                <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-sm cursor-pointer transition-colors flex items-center justify-center" title="Bluetooth Devices">
                    <img alt="" :src="window.portfolioConfig.imgPath + 'bluetooth.webp'" class="w-5 h-5 dark:invert opacity-80">
                </div>
            </template>
            
            <!-- Constant Tray Icons -->
            <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-sm cursor-pointer transition-colors flex items-center justify-center" title="Windows Security">
                <img alt="" :src="window.portfolioConfig.imgPath + 'win11/view.webp'" class="w-5 h-5 dark:invert opacity-70">
            </div>
            <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-sm cursor-pointer transition-colors flex items-center justify-center" @click="openApp('settings'); hiddenIconsOpen = false" title="Settings">
                <img alt="" :src="window.portfolioConfig.imgPath + 'settings.webp'" class="w-5 h-5 opacity-70">
            </div>
        </div>

        <!-- Hidden Icons Chevron -->
        <button type="button" @click="hiddenIconsOpen = !hiddenIconsOpen"
                data-tray-item="chevron"
                title="Show hidden icons"
                class="os-tray-optional p-1 rounded-sm hover:bg-white/10 transition-colors"
                :class="{ 'bg-white/10': hiddenIconsOpen }">
            <img alt="" src="<?php echo IMG_PATH; ?>win11/chevron_up.svg" 
                 class="w-3.5 h-3.5 opacity-70 dark:invert transition-transform duration-200"
                 :class="{ 'rotate-180': hiddenIconsOpen }">
        </button>

        <!-- Mic Icon -->
        <div class="p-1" x-show="isDesktop" data-tray-item="mic" title="Microphone">
            <img alt="" src="<?php echo IMG_PATH; ?>win11/mic.svg" class="w-4 h-4 opacity-80 dark:invert">
        </div>

        <!-- System Status Group (Opens Quick Settings) -->
        <button type="button" @click="quickSettingsOpen = !quickSettingsOpen; if (quickSettingsOpen) { startMenuOpen = false; widgetsOpen = false }"
                data-tray-item="status"
                title="Network, sound, battery"
                class="tray-group hover:bg-white/10 flex flex-row items-center space-x-2"
                :class="{ 'bg-white/20': quickSettingsOpen }">
            
            <!-- Wi-Fi -->
            <img alt="" :src="window.portfolioConfig.imgPath + 'wifi.webp'" 
                 class="w-4 h-4 dark:invert transition-opacity" 
                 :class="!settings.wifi ? 'grayscale opacity-30' : 'opacity-80'">

            <!-- Volume -->
            <?php $className = "w-4 h-4 transition-opacity"; include __DIR__ . '/volume-icon.php'; ?>

            <!-- Battery -->
            <div data-tray-battery class="flex flex-row items-center relative" :title="`${settings.batteryLevel}% ${settings.isCharging ? '(Charging)' : ''}`">
                <img alt="" :src="batteryIcon" class="w-5 h-5 dark:invert transition-opacity" :class="settings.batterySaver ? 'opacity-60' : 'opacity-80'">
                <template x-if="settings.batterySaver && !settings.isCharging">
                    <div class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white dark:border-win-dark shadow-xs bg-yellow-500"></div>
                </template>
            </div>
        </button>

        <!-- Switch to React v2. A fixed width, as in v2, so the label never moves the centred icons. -->
        <a href="/v2/"
           data-tray-item="build"
           title="Switch to the React (v2) build"
           class="hidden md:flex items-center justify-center w-24 whitespace-nowrap overflow-hidden px-2 py-1 mr-1 rounded-sm text-xs font-medium border border-win-blue/30 bg-win-blue/10 text-win-blue hover:bg-win-blue hover:text-white transition-colors">
            ⚛ React v2
        </a>

        <!-- Clock/Date -->
        <button type="button" data-tray-item="clock" title="Date and time" class="px-2 py-1 rounded-sm hover:bg-white/10 text-xs text-right leading-tight transition-colors" @click="startMenuOpen = false; quickSettingsOpen = false; widgetsOpen = false">
            <div x-text="clock.time"></div>
            <div x-show="isDesktop" x-text="clock.date" class="text-xs opacity-80"></div>
        </button>

        <!-- Desktop Peek -->
        <button type="button" x-show="isDesktop" aria-label="Show desktop" class="w-[2px] hover:bg-white/20 h-8 ml-1 cursor-pointer transition-colors" @click="$store.os.minimizeAll()"></button>
    </div>
</div>
