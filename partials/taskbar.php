<!-- partials/taskbar.php -->
<div class="h-12 w-full taskbar-glass flex items-center justify-between px-2 z-[9999] border-t border-white/20"
     :class="{ 'taskbar-mobile': !isDesktop }"
     @contextmenu.prevent="showTaskbarContextMenu($event)">
    <!-- Widgets Area (Left) -->
    <div class="flex items-center w-48 overflow-hidden" x-show="isDesktop" @contextmenu.prevent="showTaskbarContextMenu($event)">
        <div @click="toggleWidgets()" class="px-2 py-1.5 rounded hover:bg-white/10 cursor-pointer flex items-center space-x-2 transition-colors group">
            <span class="text-xl filter drop-shadow-sm group-hover:scale-110 transition-transform" x-text="weather.icon"></span>
            <div class="flex flex-col leading-tight">
                <span class="text-[11px] text-black dark:text-white font-semibold" x-text="weather.temp + '°C'"></span>
                <span class="text-[9px] text-black dark:text-white opacity-60 truncate" x-text="weather.condition"></span>
            </div>
        </div>
    </div>

    <!-- Pinned/Running Apps (Center) -->
    <div class="flex items-center space-x-1" :class="{ 'taskbar-center-mobile': !isDesktop }">
        <!-- Start Button -->
        <button x-cloak @click="startMenuOpen = !startMenuOpen; playSound('click')" 
                class="w-10 h-10 flex items-center justify-center rounded hover:bg-white/10 transition-colors group"
                :class="{ 'bg-white/10': startMenuOpen }">
            <img src="<?php echo IMG_PATH; ?>startmenu.webp" class="w-6 h-6 transform transition-transform group-active:scale-90">
        </button>

        <!-- Search Button (Hide on small screens, integrated in Start) -->
        <button x-show="isDesktop" @click="startMenuOpen = true; $nextTick(() => document.querySelector('input[x-model=\'searchQuery\']').focus())" class="w-10 h-10 flex items-center justify-center rounded hover:bg-white/10 transition-colors">
            <svg class="w-5 h-5 text-win-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </button>

        <!-- Desktop/Task View (Hide on mobile) -->
        <button x-show="!isMobile" @click="openApp('taskmanager')" class="w-10 h-10 flex items-center justify-center rounded hover:bg-white/10 transition-colors">
            <svg class="w-5 h-5 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z"/></svg>
        </button>

        <div class="w-px h-6 bg-white/10 mx-1"></div>

        <!-- Pinned and Running Apps -->
        <template x-for="appId in [...new Set([...$store.os.pinnedApps, ...windows.map(w => w.app)])]" :key="appId">
            <button @click="openApp(appId)" 
                    @contextmenu.prevent.stop="showAppContextMenu($event, appId)"
                    class="w-10 h-10 flex items-center justify-center rounded hover:bg-white/10 transition-all relative group"
                    :class="{ 'bg-white/10 shadow-inner': windows.some(w => w.app === appId && focusedWindowId === w.id) }">
                
                <div class="w-7 h-7 rounded flex items-center justify-center bg-white/10 text-[10px] font-bold text-gray-700 dark:text-white overflow-hidden transition-transform group-hover:scale-110">
                    <template x-if="appId === 'vscode'">
                        <img :src="window.portfolioConfig.imgPath + 'vscode.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'edge'">
                        <img :src="window.portfolioConfig.imgPath + 'chrome.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'terminal'">
                        <img :src="window.portfolioConfig.imgPath + 'terminal.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'explorer'">
                        <img :src="window.portfolioConfig.imgPath + 'explorer.webp'" class="w-full h-full object-contain p-0.5">
                    </template>
                    <template x-if="appId === 'pdfreader'">
                        <img :src="window.portfolioConfig.imgPath + 'pdf.webp'" class="w-full h-full object-contain p-0.5">
                    </template>
                    <template x-if="appId === 'word'">
                        <img :src="window.portfolioConfig.imgPath + 'word.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'excel'">
                        <img :src="window.portfolioConfig.imgPath + 'excel.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'powerpoint'">
                        <img :src="window.portfolioConfig.imgPath + 'powerpoint.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'notepad' || appId === 'notepad++'">
                        <img :src="window.portfolioConfig.imgPath + 'notepad++.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'settings'">
                        <img :src="window.portfolioConfig.imgPath + 'settings.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'taskmanager'">
                        <img :src="window.portfolioConfig.imgPath + 'taskmanager.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'outlook'">
                        <img :src="window.portfolioConfig.imgPath + 'outlook.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'eventviewer'">
                        <img :src="window.portfolioConfig.imgPath + 'eventviewer.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'photoshop'">
                        <img :src="window.portfolioConfig.imgPath + 'photoshop.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'putty'">
                        <img :src="window.portfolioConfig.imgPath + 'putty.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'filezilla'">
                        <img :src="window.portfolioConfig.imgPath + 'filezilla.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'calculator'">
                        <img :src="window.portfolioConfig.imgPath + 'calculator.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'database'">
                        <img :src="window.portfolioConfig.imgPath + 'mssql.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'flstudio'">
                        <img :src="window.portfolioConfig.imgPath + 'fl studio.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="appId === 'docker'">
                        <img :src="window.portfolioConfig.imgPath + 'docker.webp'" class="w-full h-full object-contain">
                    </template>
                    <template x-if="!['vscode', 'edge', 'terminal', 'explorer', 'pdfreader', 'word', 'excel', 'powerpoint', 'notepad', 'notepad++', 'settings', 'taskmanager', 'outlook', 'eventviewer', 'photoshop', 'filezilla', 'calculator', 'putty', 'database', 'flstudio', 'docker'].includes(appId)">
                        <span x-text="appId.substring(0,2).toUpperCase()"></span>
                    </template>
                </div>

                <!-- Active Indicator -->
                <template x-if="windows.some(w => w.app === appId)">
                    <div x-cloak class="absolute bottom-1 left-1/2 -translate-x-1/2 app-indicator" 
                         :class="{ 
                            'app-indicator-active glow': windows.some(w => w.app === appId && focusedWindowId === w.id), 
                            'app-indicator-inactive': windows.some(w => w.app === appId && !windows.some(w => w.app === appId && focusedWindowId === w.id) && !windows.every(w => w.app === appId && w.minimized)),
                            'app-indicator-minimized': windows.every(w => w.app === appId && w.minimized)
                         }"></div>
                </template>
            </button>
        </template>
    </div>

    <!-- System Tray (Right) -->
    <div class="flex flex-row items-center space-x-1 px-2 text-black dark:text-white" 
         x-data="{ hiddenIconsOpen: false }"
         @contextmenu.prevent="showTaskbarContextMenu($event)">
        
        <!-- Hidden Icons Popup -->
        <div x-show="hiddenIconsOpen" 
             x-cloak
             @click.away="hiddenIconsOpen = false"
             x-transition:enter="transition ease-out duration-200"
             x-transition:enter-start="opacity-0 translate-y-10 scale-95"
             x-transition:enter-end="opacity-100 translate-y-0 scale-100"
             class="absolute bottom-14 right-32 bg-white/90 dark:bg-[#1c1c1c]/95 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-xl shadow-2xl p-2 flex flex-row items-center flex-nowrap space-x-1 min-w-max z-[10001]">
            
            <!-- Dynamic Tray Icons -->
            <template x-if="windows.some(w => w.app === 'outlook')">
                <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer transition-colors flex items-center justify-center" @click="openApp('outlook'); hiddenIconsOpen = false" title="Outlook">
                    <img :src="window.portfolioConfig.imgPath + 'outlook.webp'" class="w-5 h-5">
                </div>
            </template>
            <template x-if="windows.some(w => w.app === 'pdfreader')">
                <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer transition-colors flex items-center justify-center" @click="openApp('pdfreader'); hiddenIconsOpen = false" title="PDF Reader">
                    <img :src="window.portfolioConfig.imgPath + 'pdf.webp'" class="w-5 h-5">
                </div>
            </template>
            <template x-if="windows.some(w => w.app === 'vscode')">
                <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer transition-colors flex items-center justify-center" @click="openApp('vscode'); hiddenIconsOpen = false" title="Visual Studio Code">
                    <img :src="window.portfolioConfig.imgPath + 'vscode.webp'" class="w-5 h-5">
                </div>
            </template>
            <template x-if="settings.bluetooth">
                <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer transition-colors flex items-center justify-center" title="Bluetooth Devices">
                    <img :src="window.portfolioConfig.imgPath + 'bluetooth.webp'" class="w-5 h-5 dark:invert opacity-80">
                </div>
            </template>
            
            <!-- Constant Tray Icons -->
            <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer transition-colors flex items-center justify-center" title="Windows Security">
                <img :src="window.portfolioConfig.imgPath + 'win11/view.png'" class="w-5 h-5 dark:invert opacity-70">
            </div>
            <div class="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded cursor-pointer transition-colors flex items-center justify-center" @click="openApp('settings'); hiddenIconsOpen = false" title="Settings">
                <img :src="window.portfolioConfig.imgPath + 'settings.webp'" class="w-5 h-5 opacity-70">
            </div>
        </div>

        <!-- Hidden Icons Chevron -->
        <button @click="hiddenIconsOpen = !hiddenIconsOpen" 
                class="p-1 rounded hover:bg-white/10 transition-colors"
                :class="{ 'bg-white/10': hiddenIconsOpen }">
            <img src="<?php echo IMG_PATH; ?>win11/chevron_up.svg" 
                 class="w-3.5 h-3.5 opacity-70 dark:invert transition-transform duration-200"
                 :class="{ 'rotate-180': hiddenIconsOpen }">
        </button>

        <!-- Mic Icon -->
        <div class="p-1" x-show="isDesktop">
            <img src="<?php echo IMG_PATH; ?>win11/mic.svg" class="w-4 h-4 opacity-80 dark:invert">
        </div>

        <!-- System Status Group (Opens Quick Settings) -->
        <button @click="quickSettingsOpen = !quickSettingsOpen; playSound('click')" 
                class="tray-group hover:bg-white/10 flex flex-row items-center space-x-2"
                :class="{ 'bg-white/20': quickSettingsOpen }">
            
            <!-- Wi-Fi -->
            <img :src="window.portfolioConfig.imgPath + 'wifi.webp'" 
                 class="w-4 h-4 dark:invert transition-opacity" 
                 :class="!settings.wifi ? 'grayscale opacity-30' : 'opacity-80'">

            <!-- Volume -->
            <?php $className = "w-4 h-4 transition-opacity"; include __DIR__ . '/volume-icon.php'; ?>

            <!-- Battery -->
            <div class="flex flex-row items-center relative" :title="`${settings.batteryLevel}% ${settings.isCharging ? '(Charging)' : ''}`">
                <img :src="batteryIcon" class="w-5 h-5 dark:invert transition-opacity" :class="settings.batterySaver ? 'opacity-60' : 'opacity-80'">
                <template x-if="settings.batterySaver && !settings.isCharging">
                    <div class="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full border border-white dark:border-win-dark shadow-sm bg-yellow-500"></div>
                </template>
            </div>
        </button>

        <!-- Switch to React v2 -->
        <a href="/v2/"
           title="Switch to the React (v2) build"
           class="hidden md:flex items-center px-2 py-1 mr-1 rounded text-[10px] font-medium border border-win-blue/30 bg-win-blue/10 text-win-blue hover:bg-win-blue hover:text-white transition-colors">
            ⚛ React v2
        </a>

        <!-- Clock/Date -->
        <button class="px-2 py-1 rounded hover:bg-white/10 text-xs text-right leading-tight transition-colors" @click="startMenuOpen = false; quickSettingsOpen = false">
            <div x-text="clock.time"></div>
            <div x-show="isDesktop" x-text="clock.date" class="text-[10px] opacity-70"></div>
        </button>
        
        <!-- Desktop Peek -->
        <div x-show="isDesktop" class="w-[2px] hover:bg-white/20 h-8 ml-1 cursor-pointer transition-colors" @click="windows.forEach(w => w.minimized = true)"></div>
    </div>
</div>
