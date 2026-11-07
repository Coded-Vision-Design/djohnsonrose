<!-- partials/start-menu.php -->
<div x-show="startMenuOpen"
     x-cloak
     data-start-menu
     role="dialog"
     aria-label="Start"
     @click.away="startMenuOpen = false; startMenuView = 'pinned'"
     x-transition:enter="transition ease-out duration-200"
     x-transition:enter-start="opacity-0 translate-y-20"
     x-transition:enter-end="opacity-100 translate-y-0"
     class="absolute bottom-14 left-1/2 -translate-x-1/2 glass rounded-xl z-10000 flex flex-col overflow-hidden win-shadow animate-start-menu"
     :class="!isDesktop ? 'start-menu-mobile' : 'w-[540px] h-[600px]'">

    <!-- Search Bar -->
    <div class="p-8 pb-4" :class="{ 'p-4 pb-2': !isDesktop }">
        <div class="relative group">
            <input type="text"
                   x-model="searchQuery"
                   aria-label="Search"
                   placeholder="Search for apps, settings, and documents"
                   class="w-full bg-white dark:bg-black/20 border-b-2 border-win-blue px-10 py-2 rounded-md outline-hidden text-sm transition-all focus:bg-white dark:focus:bg-[#1c1c1c]"
                   @keydown.enter="if(searchResults.length > 0) { openFile(searchResults[0], searchResults[0].fullPath); searchQuery = ''; startMenuOpen = false; }">
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-win-blue" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
    </div>

    <!-- Search Results -->
    <div x-show="searchQuery.length > 0" class="grow overflow-y-auto px-8 custom-scrollbar">
        <h3 class="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">Top Results</h3>
        <div class="space-y-1">
            <div x-show="searchResults.length === 0" class="text-xs opacity-60 py-4">No matches.</div>
            <template x-for="item in searchResults" :key="item.fullPath + item.name">
                <button type="button"
                     @click="openFile(item, item.fullPath); searchQuery = ''; startMenuOpen = false"
                     :data-search-result="item.name"
                     :data-search-app="item.type === 'app' ? item.app : null"
                     draggable="true"
                     @dragstart="$event.dataTransfer.setData('application/json', JSON.stringify({item: item, fromPath: item.fullPath}))"
                     class="w-full text-left flex items-center p-2 rounded-sm hover:bg-win-blue hover:text-white cursor-pointer group transition-colors">
                    <div class="w-8 h-8 rounded-sm bg-black/5 dark:bg-white/5 flex items-center justify-center mr-3 group-hover:bg-white/20 shrink-0">
                        <template x-if="item.icon && item.icon.includes('.')">
                            <img alt="" :src="item.icon" class="w-5 h-5 object-contain">
                        </template>
                        <template x-if="!item.icon || !item.icon.includes('.')">
                            <span class="text-lg" x-text="item.icon || '📄'"></span>
                        </template>
                    </div>
                    <div class="min-w-0 grow text-black dark:text-white group-hover:text-white">
                        <div class="text-xs font-medium truncate" x-text="item.name"></div>
                        <div class="text-xs opacity-70 truncate capitalize" x-text="item.type || 'File'"></div>
                    </div>
                </button>
            </template>
        </div>
    </div>

    <!-- Pinned Apps View -->
    <div x-show="searchQuery.length === 0 && startMenuView === 'pinned'" class="grow overflow-y-auto" :class="!isDesktop ? 'px-4' : 'px-8'">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold dark:text-white">Pinned</h2>
            <button type="button" @click="startMenuView = 'allApps'" class="text-xs bg-white/20 dark:bg-white/5 px-2 py-1 rounded-sm hover:bg-white/30 dark:hover:bg-white/10 dark:text-gray-300 transition-colors">All apps &gt;</button>
        </div>

        <div class="grid gap-y-6 gap-x-4 grid-cols-4 sm:grid-cols-6">
            <template x-for="app in startPinnedApps" :key="app.id">
                <button type="button"
                     @click="openApp(app.id)"
                     :data-pinned-app="app.id"
                     :title="app.name"
                     class="flex flex-col items-center group cursor-pointer transition-all active:scale-95 w-full min-w-0">
                    <div class="w-10 h-10 rounded-sm flex items-center justify-center text-2xl group-hover:scale-110 transition-transform bg-white/5 dark:bg-white/5 group-hover:bg-white/10 shrink-0 overflow-hidden">
                        <img :src="app.icon" alt="" class="w-7 h-7 object-contain">
                    </div>
                    <span class="text-xs mt-2 dark:text-white text-center truncate w-full px-0.5" x-text="app.name"></span>
                </button>
            </template>
            <template x-for="pin in startPinnedFiles" :key="pin.full">
                <button type="button"
                     @click="openFile(pin.entry, pin.path); startMenuOpen = false"
                     @contextmenu.prevent.stop="showFileContextMenu($event, pin.entry, pin.path)"
                     :data-pinned-file="pin.full"
                     :title="pin.entry.name"
                     class="flex flex-col items-center group cursor-pointer transition-all active:scale-95 w-full min-w-0">
                    <div class="w-10 h-10 rounded-sm flex items-center justify-center text-2xl group-hover:scale-110 transition-transform bg-white/5 dark:bg-white/5 group-hover:bg-white/10 shrink-0 overflow-hidden">
                        <template x-if="(pin.entry.icon || '').includes('.')">
                            <img :src="pin.entry.icon" alt="" class="w-7 h-7 object-contain">
                        </template>
                        <template x-if="!(pin.entry.icon || '').includes('.')">
                            <span x-text="pin.entry.icon || '📄'"></span>
                        </template>
                    </div>
                    <span class="text-xs mt-2 dark:text-white text-center truncate w-full px-0.5" x-text="pin.entry.name"></span>
                </button>
            </template>
        </div>

        <!-- Recommended: what the visitor opened, and when. See recentKey in shell-ui.js. -->
        <div class="mt-8">
            <h2 class="text-sm font-semibold dark:text-white mb-4">Recommended</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button type="button"
                     data-recommended="cv"
                     @click="openApp('pdfreader', 'CV - DeVanté Johnson-Rose.pdf', { pdfUrl: window.portfolioConfig.basePath + 'data/cv.pdf' })"
                     draggable="true"
                     @dragstart="$event.dataTransfer.setData('application/json', JSON.stringify({item: {name: 'CV - DeVanté Johnson-Rose.pdf', type: 'app', app: 'pdfreader'}, fromPath: 'C:\\Users\\DeVante\\Documents'}))"
                     class="w-full text-left flex items-center p-2 rounded-sm hover:bg-white/20 dark:hover:bg-white/10 cursor-pointer">
                    <div class="w-8 h-8 rounded-sm bg-white flex items-center justify-center mr-3 overflow-hidden shrink-0">
                        <img alt="" :src="window.portfolioConfig.imgPath + 'pdf.webp'" class="w-6 h-6 object-contain">
                    </div>
                    <div class="min-w-0">
                        <div class="text-xs font-medium dark:text-white truncate">CV - DeVanté Johnson-Rose.pdf</div>
                        <div class="text-xs text-gray-600 dark:text-gray-400" x-text="recentLabel('cv')"></div>
                    </div>
                </button>
                <button type="button"
                     data-recommended="projects"
                     @click="openApp('explorer', 'Projects', { initialPath: 'C:\\Users\\DeVante\\Projects' })"
                     draggable="true"
                     @dragstart="$event.dataTransfer.setData('application/json', JSON.stringify({item: {name: 'Projects', type: 'folder'}, fromPath: 'C:\\Users\\DeVante\\Desktop'}))"
                     class="w-full text-left flex items-center p-2 rounded-sm hover:bg-white/20 dark:hover:bg-white/10 cursor-pointer">
                    <div class="w-8 h-8 rounded-sm bg-yellow-100 flex items-center justify-center mr-3 overflow-hidden shrink-0">
                        <img alt="" :src="window.portfolioConfig.imgPath + 'win11/folder.webp'" class="w-6 h-6 object-contain">
                    </div>
                    <div class="min-w-0">
                        <div class="text-xs font-medium dark:text-white truncate">Projects</div>
                        <div class="text-xs text-gray-600 dark:text-gray-400" x-text="recentLabel('projects')"></div>
                    </div>
                </button>
                <!-- Replays the guided tour (tour.js), as Windows lists Get Started here. -->
                <button type="button"
                     data-recommended="tour"
                     @click="startMenuOpen = false; $store.tour.begin()"
                     class="w-full text-left flex items-center p-2 rounded-sm hover:bg-white/20 dark:hover:bg-white/10 cursor-pointer">
                    <div class="w-8 h-8 rounded-sm bg-white flex items-center justify-center mr-3 overflow-hidden shrink-0">
                        <img alt="" :src="window.portfolioConfig.imgPath + 'startmenu.webp'" class="w-6 h-6 object-contain">
                    </div>
                    <div class="min-w-0">
                        <div class="text-xs font-medium dark:text-white truncate">Take the tour</div>
                        <div class="text-xs text-gray-600 dark:text-gray-400">About 60 seconds</div>
                    </div>
                </button>
            </div>
        </div>
    </div>

    <!-- All Apps View -->
    <div x-show="searchQuery.length === 0 && startMenuView === 'allApps'" class="grow overflow-y-auto px-8 custom-scrollbar h-full" x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0 translate-x-10" x-transition:enter-end="opacity-100 translate-x-0">
        <div class="flex items-center justify-between mb-4 sticky top-0 bg-white/10 backdrop-blur-md py-2 z-10">
            <h2 class="text-sm font-semibold dark:text-white">All apps</h2>
            <button type="button" @click="startMenuView = 'pinned'" class="text-xs bg-white/20 dark:bg-white/5 px-2 py-1 rounded-sm hover:bg-white/30 dark:hover:bg-white/10 dark:text-gray-300 transition-colors">&lt; Back</button>
        </div>

        <div class="space-y-6 pb-4">
            <template x-for="group in allApps" :key="group.letter">
                <div class="space-y-1">
                    <div class="text-xs font-bold text-win-blue ml-4 mb-2" x-text="group.letter"></div>
                    <div class="space-y-0.5">
                        <template x-for="app in group.apps" :key="app.id">
                            <button type="button" @click="openApp(app.id)" :data-all-app="app.id" class="w-full text-left flex items-center p-2 rounded-sm hover:bg-white/10 cursor-pointer group transition-colors">
                                <div class="w-8 h-8 rounded-sm flex items-center justify-center mr-3 group-hover:scale-110 transition-transform overflow-hidden shrink-0">
                                    <img :src="app.icon" alt="" class="w-6 h-6 object-contain">
                                </div>
                                <span class="text-xs font-medium dark:text-white" x-text="app.name"></span>
                            </button>
                        </template>
                    </div>
                </div>
            </template>
        </div>
    </div>

    <!-- Bottom Profile Bar -->
    <div class="h-16 bg-black/5 dark:bg-black/20 flex items-center justify-between px-8 border-t border-white/10" :class="{ 'px-4': !isDesktop }">
        <div class="flex items-center space-x-3 group cursor-pointer p-1 rounded-sm hover:bg-white/10">
            <img alt="" :src="user.avatar" class="w-8 h-8 rounded-full border border-white/20">
            <span class="text-xs font-medium dark:text-white" x-text="user.name"></span>
        </div>
        <button type="button" @click="logout()" class="p-2 rounded-sm hover:bg-white/10 group" title="Sign out" aria-label="Sign out">
            <svg class="w-5 h-5 dark:text-white" aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
    </div>
</div>
