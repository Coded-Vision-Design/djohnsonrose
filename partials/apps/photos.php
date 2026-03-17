<!-- partials/apps/photos.php -->
    <div class="h-full flex flex-col bg-[#f3f3f3] dark:bg-[#1c1c1c] text-black dark:text-white select-none" 
         x-data="photosApp()"
         @keydown.left.window="if($store.os.focusedWindowId === $store.os.windows.find(w => w.app === 'photos')?.id) prev()"
         @keydown.right.window="if($store.os.focusedWindowId === $store.os.windows.find(w => w.app === 'photos')?.id) next()">
    <!-- Photos Toolbar -->
    <div class="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 justify-between bg-white dark:bg-[#2b2b2b]">
        <div class="flex items-center space-x-4">
            <span class="text-sm font-semibold truncate max-w-[200px]" x-text="currentImage?.name || 'Photos'"></span>
        </div>
        <div class="flex items-center space-x-2">
            <button @click="zoomOut()" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"></path></svg>
            </button>
            <span class="text-xs" x-text="Math.round(zoom * 100) + '%'"></span>
            <button @click="zoomIn()" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
            </button>
            <div class="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2"></div>
            <button @click="rotate()" class="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            </button>
        </div>
    </div>

    <!-- Image Viewer -->
    <div class="flex-grow relative overflow-hidden bg-[#eeeeee] dark:bg-[#0a0a0a] flex items-center justify-center p-8">
        <template x-if="currentImage">
            <div class="relative group h-full w-full flex items-center justify-center">
                <button @click.stop="prev()" 
                        x-show="allImages.length > 1"
                        class="absolute left-4 z-20 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all transform hover:scale-110 active:scale-95 lg:opacity-0 lg:group-hover:opacity-100 opacity-100">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                
                <!-- Clickable Side Zones for easier navigation -->
                <div class="absolute left-0 top-0 w-1/6 h-full z-10 cursor-pointer" @click.stop="prev()" x-show="allImages.length > 1"></div>
                <div class="absolute right-0 top-0 w-1/6 h-full z-10 cursor-pointer" @click.stop="next()" x-show="allImages.length > 1"></div>

                <img :src="currentImage.url" 
                     class="max-w-full max-h-full object-contain transition-transform duration-200 shadow-2xl z-0"
                     :style="`transform: scale(${zoom}) rotate(${rotation}deg)`"
                     @click="zoom = zoom === 1 ? 2 : 1">

                <button @click.stop="next()" 
                        x-show="allImages.length > 1"
                        class="absolute right-4 z-20 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white transition-all transform hover:scale-110 active:scale-95 lg:opacity-0 lg:group-hover:opacity-100 opacity-100">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>
        </template>
    </div>

    <!-- Filmstrip -->
    <div class="h-20 bg-white dark:bg-[#2b2b2b] border-t border-gray-200 dark:border-gray-800 flex items-center px-4 space-x-2 overflow-x-auto scrollbar-none">
        <template x-for="(img, index) in allImages" :key="img.name">
            <div @click="setIndex(index)" 
                 :class="currentIndex === index ? 'border-win-blue bg-blue-50 dark:bg-blue-900/20' : 'border-transparent hover:bg-gray-100 dark:hover:bg-white/5'"
                 class="h-16 w-16 shrink-0 rounded border-2 p-0.5 cursor-pointer transition-all">
                <img :src="img.url" class="w-full h-full object-cover rounded-sm">
            </div>
        </template>
    </div>
</div>
