<!-- partials/snap-ui.php: everything drawn over the windows while arranging them.
     Geometry comes from assets/js/windowing/windowing.js, styles from windowing.css. -->

<!-- Snap preview, while dragging or hovering a layout -->
<template x-if="snapPreviewRect">
    <div class="os-snap-preview" data-snap-preview
         :style="rectStyle(snapPreviewRect)"></div>
</template>

<!-- Snap bar, which drops from the top centre while dragging -->
<template x-if="$store.os.snapPreview.bar">
    <div class="os-snap-bar" data-snap-bar
         :style="rectStyle($store.os.snapPreview.bar)">
        <template x-for="z in barZones()" :key="z.key">
            <div class="os-snap-zone" :data-active="z.active ? '' : null" :style="rectStyle(z)"></div>
        </template>
    </div>
</template>

<!-- Snap Layouts flyout, from the maximise button -->
<template x-if="$store.os.snapFlyout">
    <div class="os-snap-flyout" data-snap-flyout role="group" aria-label="Snap layouts"
         :style="rectStyle($store.os.snapFlyout.model)"
         @pointerenter="holdSnapFlyout()"
         @pointerleave="if (!$store.os.snapFlyout.fromKeyboard) leaveSnapFlyout()"
         x-init="$nextTick(() => { if ($store.os.snapFlyout?.fromKeyboard) $el.querySelector('button')?.focus() })">
        <template x-for="tile in $store.os.snapFlyout.model.tiles" :key="tile.layout">
            <div class="os-snap-tile" :data-layout="tile.layout" :style="rectStyle(tile)">
                <template x-for="z in tile.zones" :key="z.zone">
                    <button type="button" class="os-snap-zone" :data-zone="z.zone"
                            :aria-label="`${tile.label}: ${z.label}`"
                            :style="rectStyle(z)"
                            @pointerenter="previewZone(tile.layout, z.zone)"
                            @pointerleave="flyoutPreview = null"
                            @focus="previewZone(tile.layout, z.zone)"
                            @blur="flyoutPreview = null"
                            @click="flyoutPreview = null; $store.os.snapWindow($store.os.snapFlyout.windowId, tile.layout, z.zone)"></button>
                </template>
            </div>
        </template>
    </div>
</template>

<!-- Snap Assist, offering other windows for the empty space -->
<template x-if="$store.os.snapAssist">
    <div class="os-snap-assist" data-snap-assist :style="rectStyle($store.os.snapAssist.rect)">
        <h2>Choose a window for this space</h2>
        <div class="os-snap-assist-list">
            <template x-for="win in assistWindows()" :key="win.id">
                <button type="button" class="os-snap-assist-item" @click="$store.os.fillSnapAssist(win.id)">
                    <img :src="appIcon(win.app)" alt="">
                    <span x-text="win.title"></span>
                </button>
            </template>
        </div>
    </div>
</template>

<!-- Task switcher, for phones -->
<template x-if="$store.os.taskSwitcherOpen">
    <div class="os-task-switcher" role="dialog" aria-label="Open apps">
        <div class="os-task-switcher-head">
            <h2>Open apps</h2>
            <button type="button" class="os-task-clear" @click="$store.os.taskSwitcherOpen = false">Done</button>
        </div>
        <template x-if="windows.length === 0">
            <p class="os-task-empty">No apps are open.</p>
        </template>
        <div class="os-task-switcher-list">
            <template x-for="win in recentWindows()" :key="win.id">
                <div class="os-task-row">
                    <button type="button" class="os-task-card" @click="openApp(win.app)">
                        <img :src="appIcon(win.app)" alt="">
                        <span x-text="win.title"></span>
                    </button>
                    <button type="button" class="os-task-close" :aria-label="`Close ${win.title}`"
                            @click="closeWindow(win.id)">✕</button>
                </div>
            </template>
        </div>
    </div>
</template>
