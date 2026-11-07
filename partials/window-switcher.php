<!-- partials/window-switcher.php: the Alt+Q switcher, the same as v2's
     WindowSwitcher.tsx. Hold Alt and press Q (or Tab, when the browser passes it
     on) to step through the windows, most recently used first; letting go of Alt
     switches. Logic in assets/js/components/os/switching.js, styles in windowing.css. -->
<div class="os-switching" x-data="windowSwitcher"
     @keydown.window="onKeyDown($event)"
     @keyup.window="onKeyUp($event)"
     @blur.window="cancelSwitch()">
    <template x-if="switching && switchCards.length > 0">
        <div class="os-switcher">
            <div class="os-switcher-panel" role="group" aria-label="Switch windows">
                <template x-for="(win, index) in switchCards" :key="win.id">
                    <button type="button" class="os-switcher-card" :aria-current="index === shownIndex ? 'true' : 'false'" @click="switchTo(win.id)">
                        <span class="os-switch-label"><img :src="appIcon(win.app)" alt=""><span x-text="win.title"></span></span>
                        <span class="os-switch-thumb"><img :src="appIcon(win.app)" alt=""></span>
                    </button>
                </template>
            </div>
        </div>
    </template>
    <p class="os-switcher-status" role="status" x-text="selectedTitle"></p>
</div>
