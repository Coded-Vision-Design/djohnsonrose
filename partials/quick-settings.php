<!-- partials/quick-settings.php -->
<div x-show="quickSettingsOpen" 
     @click.away="quickSettingsOpen = false"
     x-transition:enter="transition ease-out duration-200"
     x-transition:enter-start="opacity-0 translate-y-20 scale-95"
     x-transition:enter-end="opacity-100 translate-y-0 scale-100"
     class="fixed bottom-14 right-2 w-[360px] glass rounded-xl z-[10000] flex flex-col overflow-hidden shadow-2xl p-4 space-y-6 animate-in fade-in slide-in-from-bottom-4"
     :class="{ 'w-[calc(100vw-1rem)]': !isDesktop }">
    
    <!-- Quick Toggles -->
    <div class="grid grid-cols-3 gap-x-2 gap-y-4 px-1">
        <template x-for="toggle in [
            { id: 'wifi', label: 'Wi-Fi', activeLabel: 'Connected', icon: 'wifi.webp', noHighlight: true },
            { id: 'bluetooth', label: 'Bluetooth', activeLabel: 'Connected', icon: 'bluetooth.webp', activeIcon: 'bluetooth.webp', noHighlight: true },
            { id: 'airplane', label: 'Flight mode', activeLabel: 'On', icon: 'win11/airplane.svg' },
            { id: 'batterySaver', label: 'Energy saver', activeLabel: 'On', icon: 'win11/power.svg' },
            { id: 'nightLight', label: 'Night light', activeLabel: 'On', icon: 'win11/nightlight.svg' },
            { id: 'accessibility', label: 'Accessibility', activeLabel: 'On', icon: 'win11/accessibility.svg' }
        ]">
            <div class="quick-settings-btn">
                <button @click="toggleQuickSetting(toggle.id)"
                        class="quick-settings-toggle"
                        :class="[settings[toggle.id] && !toggle.noHighlight ? 'active' : '', toggle.noHighlight ? 'no-highlight' : '']">
                    <img :src="window.portfolioConfig.imgPath + (settings[toggle.id] && toggle.activeIcon ? toggle.activeIcon : toggle.icon)" 
                         class="w-5 h-5 dark:invert"
                         :class="settings[toggle.id] && !toggle.noHighlight ? 'brightness-0 invert' : 'opacity-80'">
                </button>
                <span class="text-[11px] text-center dark:text-white mt-1 opacity-90 truncate w-full px-1" 
                      x-text="settings[toggle.id] ? (toggle.activeLabel || toggle.label) : toggle.label"></span>
            </div>
        </template>
    </div>

    <!-- Sliders -->
    <div class="space-y-6 px-1">
        <!-- Brightness -->
        <div class="flex flex-col space-y-2">
            <div class="flex items-center space-x-2">
                <img :src="window.portfolioConfig.imgPath + 'win11/brightness.svg'" class="w-4 h-4 opacity-70 dark:invert">
                <span class="text-[10px] opacity-60 dark:text-white uppercase font-bold tracking-wider">Brightness</span>
            </div>
            <input type="range" 
                   x-model="settings.brightness"
                   min="30" max="100"
                   class="win-slider w-full"
                   :style="`--range-progress: ${(settings.brightness - 30) / (100 - 30) * 100}%`"
                   @input="$store.os.settings.brightness = $event.target.value">
        </div>
        <!-- Volume -->
        <div class="flex flex-col space-y-2">
            <div class="flex items-center space-x-2">
                <?php $className = "w-4 h-4 opacity-70"; include __DIR__ . '/volume-icon.php'; ?>
                <span class="text-[10px] opacity-60 dark:text-white uppercase font-bold tracking-wider">Volume</span>
            </div>
            <input type="range" 
                   x-model="settings.volume"
                   min="0" max="100"
                   class="win-slider w-full"
                   :style="`--range-progress: ${settings.volume}%`"
                   @input="$store.os.settings.volume = $event.target.value; if($event.target.value > 0) playSound('click')">
        </div>
    </div>

    <!-- Bottom Info -->
    <div class="pt-4 border-t border-black/5 dark:border-white/10 flex items-center justify-between px-1">
        <div class="flex items-center space-x-2 text-[11px] dark:text-white font-medium">
            <img :src="batteryIcon" class="w-4 h-4 opacity-70 dark:invert">
            <span class="opacity-80" x-text="`${settings.batteryLevel}% ${settings.batterySaver ? '(Saver On)' : ''}`"></span>
        </div>
        <div class="flex items-center space-x-1">
            <button @click="openApp('settings', 'Settings', { currentTab: 'personalisation' }); quickSettingsOpen = false" 
                    class="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Personalise">
                <img :src="window.portfolioConfig.imgPath + 'win11/edit.svg'" class="w-4 h-4 opacity-70 dark:invert">
            </button>
            <button @click="openApp('settings'); quickSettingsOpen = false" 
                    class="p-2 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="All settings">
                <img :src="window.portfolioConfig.imgPath + 'win11/settings.svg'" class="w-4 h-4 opacity-70 dark:invert">
            </button>
        </div>
    </div>
</div>
