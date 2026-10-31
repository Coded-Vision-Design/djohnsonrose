<!-- partials/desktop.php -->
<div class="h-full w-full relative flex flex-col overflow-hidden wallpaper-bg touch-none" 
     x-show="loggedIn"
     x-cloak
     x-transition:enter="transition ease-out duration-500"
     x-transition:enter-start="opacity-0 scale-105"
     x-transition:enter-end="opacity-100 scale-100"
     @touchstart="handleTouchStart($event)"
     @touchmove="handleTouchMove($event)"
     @touchend="handleTouchEnd($event)"
     @contextmenu.prevent="contextMenu.open = true; contextMenu.x = $event.clientX; contextMenu.y = $event.clientY"
     @click="contextMenu.open = false">
    
    <!-- Desktop Icons Layer -->
    <div class="absolute inset-0 p-4 pointer-events-none transition-transform duration-75 origin-center"
         :style="`transform: scale(${$store.os.desktopZoom});`"
         id="desktop-icons-container">
        
        <!-- PC Icon (Always present) -->
        <div @mousedown="startIconDrag({name: 'DeVanté\'s PC'}, $event)"
             @touchstart.stop="handleTouchStart($event, (pos) => showFileContextMenu(pos, {name: 'DeVanté\'s PC', type: 'folder'}, 'C:\\'))"
             @touchmove="handleTouchMove($event)"
             @touchend="handleTouchEnd($event)"
             @click="if(!dragMoved && !touchData.isLongPress) openApp('explorer', 'This PC', { initialPath: 'C:\\' })"
             @dblclick="if(!dragMoved) openApp('explorer', 'This PC', { initialPath: 'C:\\' })" 
             class="desktop-icon-container absolute pointer-events-auto flex flex-col items-center justify-start hover:bg-white/10 rounded-md cursor-pointer group p-2 text-center w-[110px] transition-all duration-75"
             :style="`left: ${desktopIconPositions['DeVanté\'s PC']?.x || 16}px; top: ${desktopIconPositions['DeVanté\'s PC']?.y || 16}px;`"
             @contextmenu.prevent.stop="showFileContextMenu($event, {name: 'DeVanté\'s PC', type: 'folder'}, 'C:\\')">
            <div class="mb-1 drop-shadow-md w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                <img src="<?php echo IMG_PATH; ?>thispc.webp" class="w-full h-full object-contain group-hover:scale-110 transition-transform">
            </div>
            <span class="text-white text-[10px] sm:text-[11px] drop-shadow-lg w-full px-1 line-clamp-2 leading-tight overflow-hidden wrap-break-word text-wrap">DeVanté's PC</span>
        </div>

        <!-- Dynamic Desktop Icons -->
        <template x-for="(icon, index) in desktopIcons" :key="icon.name">
            <div @mousedown="startIconDrag(icon, $event)"
                 @touchstart.stop="handleTouchStart($event, (pos) => showFileContextMenu(pos, icon, 'C:\\Users\\DeVante\\Desktop'))"
                 @touchmove="handleTouchMove($event)"
                 @touchend="handleTouchEnd($event)"
                 @click="if(!dragMoved && !touchData.isLongPress) openItem(icon, 'C:\\Users\\DeVante\\Desktop')" 
                 @dblclick="if(!dragMoved) openItem(icon, 'C:\\Users\\DeVante\\Desktop')"
                 @contextmenu.prevent.stop="showFileContextMenu($event, icon, 'C:\\Users\\DeVante\\Desktop')"
                 @dragover.prevent.stop="$event.target.closest('.recycle-bin-icon') ? $event.dataTransfer.dropEffect = 'move' : ''"
                 :title="icon.name"
                 class="desktop-icon-container absolute pointer-events-auto flex flex-col items-center justify-start hover:bg-white/10 rounded-md cursor-pointer group p-2 text-center w-[110px] min-w-0 transition-all duration-75"
                 :class="{
                    'recycle-bin-icon': icon.name === 'Recycle Bin',
                    'bg-white/20 scale-110 shadow-lg border-win-blue/50!': icon.name === 'Recycle Bin' && hoveredOverRecycleBin
                 }"
                 :style="`left: ${icon.defaultX}px; top: ${icon.defaultY}px;`"
                 @mouseup="draggedIcon && icon.name === 'Recycle Bin' && draggedIcon.name !== 'Recycle Bin' ? deleteItem(draggedIcon, 'C:\\Users\\DeVante\\Desktop') : ''"
                 @dragover.prevent="if(icon.name === 'Recycle Bin') { hoveredOverRecycleBin = true; $event.dataTransfer.dropEffect = 'move'; }"
                 @dragleave="if(icon.name === 'Recycle Bin') { hoveredOverRecycleBin = false; }"
                 @drop.prevent="if(icon.name === 'Recycle Bin') { 
                    hoveredOverRecycleBin = false;
                    const data = JSON.parse($event.dataTransfer.getData('application/json'));
                    if (data && data.item) {
                        deleteItem(data.item, data.fromPath);
                    }
                 }">
                <div class="mb-1 drop-shadow-md w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                    <template x-if="icon.icon.includes('.')">
                        <img :src="icon.icon" class="w-full h-full object-contain group-hover:scale-110 transition-transform">
                    </template>
                    <template x-if="!icon.icon.includes('.')">
                        <div class="w-full h-full flex items-center justify-center">
                            <div class="text-4xl sm:text-5xl group-hover:scale-110 transition-transform" x-text="icon.icon"></div>
                        </div>
                    </template>
                </div>
                <span class="text-white text-[10px] sm:text-[11px] drop-shadow-lg w-full px-1 line-clamp-2 leading-tight overflow-hidden wrap-break-word text-wrap" x-text="icon.name"></span>
            </div>
        </template>
    </div>

    <!-- Windows Layer -->
    <div id="windows-layer" class="os-windows-layer grow relative">
        <template x-for="win in windows" :key="win.id">
            <div :id="'win-' + win.id"
                 tabindex="-1"
                 role="dialog"
                 :aria-label="win.title"
                 :data-state="win.state"
                 class="os-window rounded-lg win-shadow glass animate-window-open"
                 :class="{ 'window-active': focusedWindowId === win.id }"
                 :style="{ left: win.x + 'px', top: win.y + 'px', width: win.width + 'px', height: win.height + 'px', zIndex: win.z }"
                 x-init="$nextTick(() => { if (!$el.contains(document.activeElement)) $el.focus({ preventScroll: true }) })"
                 @pointerdown.capture="focusWindow(win.id)">

                <!-- Window Titlebar -->
                <div class="os-titlebar flex items-center justify-between px-3 select-none bg-white/10 dark:bg-black/10 cursor-default overflow-hidden"
                     :class="win.app === 'edge' ? 'h-[44px] py-[6px]' : 'h-9'"
                     @pointerdown.self="startDrag(win.id, $event)"
                     @dblclick.self="titleBarToggle(win.id)">
                    <button type="button" aria-label="Back" @click="toggleMinimize(win.id)"
                            class="os-win-btn os-win-back items-center justify-center shrink-0 dark:text-white">
                        <svg class="w-4 h-4 fill-current" viewBox="0 0 16 16" aria-hidden="true"><path d="M10.7 2.3 5 8l5.7 5.7 1-1L7 8l4.7-4.7z"/></svg>
                    </button>
                    <div class="flex items-center space-x-2 pointer-events-none min-w-0 grow">
                        <template x-if="win.app !== 'edge'">
                            <span class="os-window-title text-sm font-medium dark:text-white truncate" x-text="win.title"></span>
                        </template>
                    </div>
                    <div class="flex items-center h-full gap-[2px] shrink-0">
                        <button type="button" aria-label="Minimise" title="Minimise" @click="toggleMinimize(win.id)"
                                class="os-win-btn os-win-min w-[46px] h-[32px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <svg class="w-2.5 h-2.5 fill-black dark:fill-white opacity-70" viewBox="0 0 10 1" aria-hidden="true"><rect width="10" height="1"/></svg>
                        </button>
                        <button type="button"
                                :aria-label="win.state === 'maximized' ? 'Restore' : 'Maximise'"
                                :title="win.state === 'maximized' ? 'Restore' : 'Maximise'"
                                @click="titleBarToggle(win.id)"
                                @pointerenter="hoverMaximize(win.id, $event)"
                                @pointerleave="leaveSnapFlyout()"
                                class="os-win-btn os-win-max w-[46px] h-[32px] flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                            <template x-if="win.state !== 'maximized'">
                                <svg class="w-2.5 h-2.5 fill-black dark:fill-white opacity-70" viewBox="0 0 10 10" aria-hidden="true"><path d="M0,0v10h10V0H0z M9,9H1V1h8V9z"/></svg>
                            </template>
                            <template x-if="win.state === 'maximized'">
                                <svg class="w-2.5 h-2.5 fill-black dark:fill-white opacity-70" viewBox="0 0 10 10" aria-hidden="true"><path d="M2,0v2H0v8h8V8h2V0H2z M7,9H1V3h6V9z M9,7H8V2H3V1h6V7z"/></svg>
                            </template>
                        </button>
                        <button type="button" aria-label="Close" title="Close" @click="closeWindow(win.id)"
                                class="os-win-btn w-[46px] h-[32px] flex items-center justify-center hover:bg-[#c42b1c] hover:text-white text-black dark:text-white transition-colors group">
                            <svg class="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 fill-current" viewBox="0 0 10 10" aria-hidden="true"><path d="M10,1.4L8.6,0L5,3.6L1.4,0L0,1.4L3.6,5L0,8.6L1.4,10L5,6.4l3.6,3.6l1.4-1.4L6.4,5L10,1.4z"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Window Content -->
                <div class="os-window-content bg-white dark:bg-[#1c1c1c]">
                    <div x-show="win.loading" class="absolute inset-0 flex items-center justify-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-win-blue"></div>
                    </div>
                    <!-- Not x-html: it initialises apps inside its reactive effect, so any value an
                         app reads in init() would rebuild the whole app whenever that value changed. -->
                    <div class="h-full" x-init="$watch('win.content', html => { $el.innerHTML = html })"></div>
                </div>

                <template x-for="dir in resizeDirs(win)" :key="dir">
                    <div class="os-resize" :data-dir="dir" @pointerdown.stop="startResize(win.id, dir, $event)"></div>
                </template>
            </div>
        </template>

        <?php include __DIR__ . '/snap-ui.php'; ?>
    </div>

    <!-- Start Menu Overlay -->
    <?php include __DIR__ . '/start-menu.php'; ?>

    <!-- Quick Settings Overlay -->
    <?php include __DIR__ . '/quick-settings.php'; ?>

    <!-- Widgets Panel -->
    <?php include __DIR__ . '/widgets.php'; ?>

    <!-- Taskbar -->
    <?php include __DIR__ . '/taskbar.php'; ?>
</div>
