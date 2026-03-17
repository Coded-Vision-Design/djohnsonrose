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
            <span class="text-white text-[10px] sm:text-[11px] drop-shadow-lg w-full px-1 line-clamp-2 leading-tight overflow-hidden break-words text-wrap">DeVanté's PC</span>
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
                    'bg-white/20 scale-110 shadow-lg !border-win-blue/50': icon.name === 'Recycle Bin' && hoveredOverRecycleBin
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
                <span class="text-white text-[10px] sm:text-[11px] drop-shadow-lg w-full px-1 line-clamp-2 leading-tight overflow-hidden break-words text-wrap" x-text="icon.name"></span>
            </div>
        </template>
    </div>

    <!-- Windows Layer -->
    <div id="windows-layer" class="flex-grow relative overflow-hidden pointer-events-none">
        <template x-for="win in windows" :key="win.id">
            <div :id="'win-' + win.id"
                 class="absolute flex flex-col pointer-events-auto rounded-lg win-shadow glass animate-window-open"
                 :class="{ 
                    'window-active': focusedWindowId === win.id,
                    'hidden': win.minimized,
                    'inset-0 !w-full !h-full !translate-x-0 !translate-y-0 !rounded-none': win.maximized,
                    'overflow-hidden': win.maximized
                 }"
                 :style="win.maximized ? `z-index: ${win.z}` : `left: ${win.x}px; top: ${win.y}px; width: ${win.width}px; height: ${win.height}px; z-index: ${win.z};`"
                 @mousedown="focusWindow(win.id)">
                
                <!-- Window Titlebar -->
                <div :class="[win.app === 'edge' ? 'h-[44px] py-[6px]' : 'h-9', win.maximized ? '' : 'rounded-t-lg']"
                     class="flex items-center justify-between px-3 select-none bg-white/10 dark:bg-black/10 cursor-default overflow-hidden"
                     @mousedown.self="startDrag(win.id, $event)"
                     @dblclick="toggleMaximize(win.id)">
                    <div class="flex items-center space-x-2 pointer-events-none">
                        <template x-if="win.app !== 'edge'">
                            <span class="text-sm font-medium dark:text-white" x-text="win.title"></span>
                        </template>
                    </div>
                    <div class="flex items-center h-full gap-[2px]">
                        <button @click="toggleMinimize(win.id)" class="w-[46px] h-[32px] flex items-center justify-center transition-colors">
                            <svg class="w-2.5 h-2.5 dark:fill-white opacity-70" viewBox="0 0 10 1"><rect width="10" height="1"/></svg>
                        </button>
                        <button @click="toggleMaximize(win.id)" class="w-[46px] h-[32px] flex items-center justify-center transition-colors">
                            <template x-if="!win.maximized">
                                <svg class="w-2.5 h-2.5 dark:fill-white opacity-70" viewBox="0 0 10 10"><path d="M0,0v10h10V0H0z M9,9H1V1h8V9z"/></svg>
                            </template>
                            <template x-if="win.maximized">
                                <img :src="window.portfolioConfig.imgPath + 'win11/minimize-max.webp'" class="w-3 h-3 dark:invert opacity-70">
                            </template>
                        </button>
                        <button @click="closeWindow(win.id)" class="w-[46px] h-[32px] flex items-center justify-center hover:bg-[#c42b1c] hover:text-white transition-colors group">
                            <svg class="w-2.5 h-2.5 opacity-70 group-hover:opacity-100" viewBox="0 0 10 10"><path d="M10,1.4L8.6,0L5,3.6L1.4,0L0,1.4L3.6,5L0,8.6L1.4,10L5,6.4l3.6,3.6l1.4-1.4L6.4,5L10,1.4z" fill="currentColor"/></svg>
                        </button>
                    </div>
                </div>

                <!-- Window Content -->
                <div class="flex-grow overflow-auto relative bg-white dark:bg-[#1c1c1c]"
                     :class="win.maximized ? '' : 'rounded-b-lg'">
                    <div x-show="win.loading" class="absolute inset-0 flex items-center justify-center">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-win-blue"></div>
                    </div>
                    <div x-html="win.content" class="h-full"></div>
                </div>

                <!-- Resize Handles (Invisible hit-test borders for Windows-level realism) -->
                <div x-show="!win.maximized" class="absolute inset-[-4px] pointer-events-none z-50">
                    <!-- Sides -->
                    <div class="absolute top-2 bottom-2 left-0 w-2 cursor-ew-resize pointer-events-auto" @mousedown.stop="startResize(win.id, 'w', $event)"></div>
                    <div class="absolute top-2 bottom-2 right-0 w-2 cursor-ew-resize pointer-events-auto" @mousedown.stop="startResize(win.id, 'e', $event)"></div>
                    <div class="absolute top-0 left-2 right-2 h-2 cursor-ns-resize pointer-events-auto" @mousedown.stop="startResize(win.id, 'n', $event)"></div>
                    <div class="absolute bottom-0 left-2 right-2 h-2 cursor-ns-resize pointer-events-auto" @mousedown.stop="startResize(win.id, 's', $event)"></div>
                    
                    <!-- Corners -->
                    <div class="absolute top-0 left-0 w-3 h-3 cursor-nwse-resize pointer-events-auto" @mousedown.stop="startResize(win.id, 'nw', $event)"></div>
                    <div class="absolute top-0 right-0 w-3 h-3 cursor-nesw-resize pointer-events-auto" @mousedown.stop="startResize(win.id, 'ne', $event)"></div>
                    <div class="absolute bottom-0 left-0 w-3 h-3 cursor-nesw-resize pointer-events-auto" @mousedown.stop="startResize(win.id, 'sw', $event)"></div>
                    <div class="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize pointer-events-auto" @mousedown.stop="startResize(win.id, 'se', $event)"></div>
                </div>
            </div>
        </template>
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
