<!-- partials/apps/explorer.php -->
<div class="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none" x-data="explorerApp()">
    <!-- Explorer Toolbar -->
    <div class="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-2 space-x-4 bg-white dark:bg-[#2b2b2b]">
        <div class="flex items-center space-x-1 pr-2 border-r border-gray-200 dark:border-gray-700">
            <button @click="goBack()" :disabled="historyStep <= 0" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>
            <button @click="goForward()" :disabled="historyStep >= history.length - 1" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>
            <button class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg></button>
        </div>
        
        <div class="flex-grow flex items-center bg-gray-100 dark:bg-black/20 rounded-md px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 shadow-inner overflow-hidden relative cursor-text min-h-[32px]"
             @click="if(!addressBarActive) { addressBarActive = true; $nextTick(() => $refs.pathInput.focus()); }">
            
            <!-- Breadcrumbs View -->
            <div x-show="!addressBarActive" class="flex items-center space-x-1 truncate w-full h-full">
                <img :src="window.portfolioConfig.imgPath + 'explorer.webp'" class="w-4 h-4 object-contain mr-1 hidden sm:inline opacity-80">
                <span class="mx-1 opacity-40 hidden sm:inline">></span>
                <template x-for="(part, index) in currentPath.split('\\').filter(p => p !== '')">
                    <div class="flex items-center">
                        <span @click.stop="navigate(currentPath.split('\\').slice(0, index + 1).join('\\') + (index === 0 ? '\\' : ''))"
                              class="hover:underline cursor-pointer truncate max-w-[60px] sm:max-w-[200px]" x-text="part"></span>
                        <span class="mx-1 opacity-40" x-show="index < currentPath.split('\\').filter(p => p !== '').length - 1">></span>
                    </div>
                </template>
            </div>

            <!-- Editable Path View -->
            <div x-show="addressBarActive" class="w-full h-full flex items-center">
                <input type="text" 
                       x-ref="pathInput"
                       x-model="manualPath" 
                       @keydown.enter="submitPath()"
                       @click.away="addressBarActive = false; manualPath = currentPath"
                       @keydown.escape="addressBarActive = false; manualPath = currentPath"
                       class="bg-transparent border-none outline-none w-full text-xs font-mono">
            </div>
        </div>

        <div class="w-32 sm:w-64 bg-gray-100 dark:bg-black/20 rounded-md px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 flex items-center focus-within:bg-white dark:focus-within:bg-black/40 transition-all relative">
            <svg class="w-3.5 h-3.5 text-gray-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" x-model="searchQuery" placeholder="Search" class="bg-transparent border-none outline-none w-full truncate pr-6">
            <button x-show="searchQuery.length > 0" @click="searchQuery = ''" class="absolute right-2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex flex-grow overflow-hidden bg-white dark:bg-[#1c1c1c]">
        <!-- Sidebar -->
        <div class="w-52 border-r border-gray-200 dark:border-gray-800 p-2 space-y-0.5 text-xs shrink-0 overflow-y-auto hidden lg:block">
            <template x-for="item in sidebarWithIcons">
                <div>
                    <template x-if="item.type === 'header'">
                        <div class="px-3 py-2 font-bold opacity-50 uppercase tracking-tighter text-[10px]" x-text="item.label"></div>
                    </template>
                    <template x-if="item.type !== 'header'">
                        <button @click="navigate(item.path)" 
                                @dragover.prevent="if(item.id === 'recycle') { $event.dataTransfer.dropEffect = 'move'; $el.classList.add('bg-blue-100', 'dark:bg-blue-900/40'); }"
                                @dragleave="if(item.id === 'recycle') { $el.classList.remove('bg-blue-100', 'dark:bg-blue-900/40'); }"
                                @drop.prevent="if(item.id === 'recycle') { 
                                    $el.classList.remove('bg-blue-100', 'dark:bg-blue-900/40');
                                    const data = JSON.parse($event.dataTransfer.getData('application/json'));
                                    if (data && data.item) {
                                        Alpine.store('os').deleteItem(data.item, data.fromPath);
                                    }
                                }"
                                :class="{
                                    'bg-blue-100/50 dark:bg-blue-900/20 text-win-blue font-semibold': currentPath === item.path,
                                    'pl-8': item.indent,
                                    'px-3': !item.indent
                                }"
                                class="w-full text-left py-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center group transition-colors">
                            <span class="mr-3 text-base group-hover:scale-110 transition-transform flex items-center justify-center w-5 h-5 shrink-0">
                                <template x-if="item.icon.includes('.')">
                                    <img :src="item.icon" class="w-full h-full object-contain">
                                </template>
                                <template x-if="!item.icon.includes('.')">
                                    <span x-text="item.icon"></span>
                                </template>
                            </span>
                            <span x-text="item.label"></span>
                        </button>
                    </template>
                </div>
            </template>
        </div>

        <!-- File Pane -->
        <div class="flex-grow p-4 overflow-y-auto bg-white dark:bg-[#1c1c1c]">
            <!-- Mobile Navigation Pills -->
            <div class="mb-6 flex overflow-x-auto pb-2 space-x-2 scrollbar-none lg:hidden">
                <template x-for="item in sidebarWithIcons.filter(i => i.type !== 'header')">
                    <button @click="navigate(item.path)" 
                            :class="{'bg-win-blue text-white shadow-md': currentPath === item.path, 'bg-gray-100 dark:bg-white/5': currentPath !== item.path}"
                            class="px-4 py-1.5 rounded-full text-[10px] whitespace-nowrap transition-all border border-transparent flex items-center space-x-2">
                        <template x-if="item.icon.includes('.')">
                            <img :src="item.icon" class="w-3 h-3 object-contain">
                        </template>
                        <span x-text="item.label"></span>
                    </button>
                </template>
            </div>

            <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(100px,1fr))]">
                <template x-for="file in currentFiles" :key="file.name">
                    <div @dblclick="openItem(file)" 
                         @click="selected = file.name"
                         @touchstart="handleTouchStart($event, (pos) => showFileContextMenu(pos, file, currentPath))"
                         @touchend="handleTouchEnd($event)"
                         draggable="true"
                         @dragstart="$event.dataTransfer.setData('application/json', JSON.stringify({item: file, fromPath: currentPath}))"
                         :title="file.name"
                         :class="{'bg-blue-100/50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 shadow-sm': selected === file.name}"
                         class="flex flex-col items-center p-2 rounded border border-transparent hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer group transition-all w-[100px]">
                        
                        <!-- Thumbnail or Icon -->
                        <div class="w-12 h-12 mb-2 flex items-center justify-center relative overflow-hidden rounded shadow-sm group-hover:scale-105 transition-transform shrink-0">
                            <template x-if="file.type === 'image'">
                                <img :src="file.url" class="w-full h-full object-cover" loading="lazy">
                            </template>
                            <template x-if="file.type !== 'image'">
                                <div class="w-full h-full flex items-center justify-center"
                                     :title="file.techStack ? 'Tech Stack: ' + file.techStack : file.name">
                                    <template x-if="file.icon && file.icon.includes('.')">
                                        <img :src="file.icon" class="w-10 h-10 object-contain">
                                    </template>
                                    <template x-if="!file.icon || !file.icon.includes('.')">
                                        <div class="text-4xl drop-shadow-sm" x-text="file.icon || '📁'"></div>
                                    </template>
                                    <!-- Status Overlay -->
                                    <template x-if="file.status">
                                        <div class="absolute bottom-0 right-0 bg-white/80 dark:bg-black/80 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-sm border border-black/5 dark:border-white/10" x-text="file.status"></div>
                                    </template>
                                </div>
                            </template>
                        </div>

                        <div class="text-[11px] text-center w-full px-0.5 font-medium leading-tight line-clamp-2 overflow-hidden break-words text-wrap" x-text="file.name"></div>
                        
                        <!-- File Path (Only for Search Results) -->
                        <template x-if="searchQuery.length > 0">
                            <div class="text-[9px] text-gray-400 truncate w-full px-0.5 mt-0.5" x-text="file.path"></div>
                        </template>
                        
                        <!-- Restore Button (Only for Recycle Bin) -->
                        <template x-if="currentPath === 'C:\\Recycle Bin' || searchQuery.length > 0 && file.path === 'C:\\Recycle Bin'">
                            <button @click.stop="restoreItem(file)" 
                                    class="mt-2 px-2 py-0.5 bg-win-blue text-white text-[9px] rounded hover:bg-blue-600 transition-colors">
                                Restore
                            </button>
                        </template>
                    </div>
                </template>
            </div>

            <!-- Empty State -->
            <template x-if="currentFiles.length === 0">
                <div class="h-full flex flex-col items-center justify-center opacity-30">
                    <img :src="window.portfolioConfig.imgPath + 'explorer.webp'" class="w-20 h-20 object-contain mb-4 filter grayscale opacity-50">
                    <div class="text-sm font-medium">This folder is empty.</div>
                </div>
            </template>
        </div>
    </div>

    <!-- Status Bar -->
    <div class="h-6 border-t border-gray-200 dark:border-gray-800 bg-[#f3f3f3] dark:bg-[#2b2b2b] flex items-center px-4 justify-between text-[10px] opacity-60">
        <div x-text="currentFiles.length + ' items'"></div>
        <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-1">
                <span>📁</span>
                <span>1 item selected</span>
            </div>
        </div>
    </div>
</div>
