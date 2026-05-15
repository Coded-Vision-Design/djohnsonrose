<!-- partials/start-menu.php -->
<div x-show="startMenuOpen" 
     x-cloak
     @click.away="startMenuOpen = false; startMenuView = 'pinned'"
     x-transition:enter="transition ease-out duration-200"
     x-transition:enter-start="opacity-0 translate-y-20"
     x-transition:enter-end="opacity-100 translate-y-0"
     class="absolute bottom-14 left-1/2 -translate-x-1/2 glass rounded-xl z-[10000] flex flex-col overflow-hidden win-shadow animate-start-menu"
     :class="!isDesktop ? 'start-menu-mobile' : 'w-[540px] h-[600px]'">
    
    <!-- Search Bar -->
    <div class="p-8 pb-4" :class="{ 'p-4 pb-2': !isDesktop }">
        <div class="relative group">
            <input type="text" 
                   x-model="searchQuery"
                   placeholder="Search for apps, settings, and documents" 
                   class="w-full bg-white dark:bg-black/20 border-b-2 border-win-blue px-10 py-2 rounded-md outline-none text-sm transition-all focus:bg-white dark:focus:bg-[#1c1c1c]"
                   @keydown.enter="if(searchResults.length > 0) { openItem(searchResults[0]); startMenuOpen = false; }">
            <svg class="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-win-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
    </div>

    <!-- Search Results -->
    <div x-show="searchQuery.length > 0" class="flex-grow overflow-y-auto px-8 custom-scrollbar">
        <h3 class="text-[11px] font-bold text-gray-500 uppercase mb-3 tracking-wider">Top Results</h3>
        <div class="space-y-1">
            <template x-for="item in searchResults" :key="item.name">
                <div @click="openItem(item, item.fullPath); searchQuery = ''; startMenuOpen = false" 
                     draggable="true"
                     @dragstart="$event.dataTransfer.setData('application/json', JSON.stringify({item: item, fromPath: item.fullPath}))"
                     class="flex items-center p-2 rounded hover:bg-win-blue hover:text-white cursor-pointer group transition-colors">
                    <div class="w-8 h-8 rounded bg-black/5 dark:bg-white/5 flex items-center justify-center mr-3 group-hover:bg-white/20">
                        <template x-if="item.icon && item.icon.includes('.')">
                            <img :src="item.icon" class="w-5 h-5 object-contain">
                        </template>
                        <template x-if="!item.icon || !item.icon.includes('.')">
                            <span class="text-lg" x-text="item.icon || '📄'"></span>
                        </template>
                    </div>
                    <div class="min-w-0 flex-grow text-black dark:text-white group-hover:text-white">
                        <div class="text-xs font-medium truncate" x-text="item.name"></div>
                        <div class="text-[10px] opacity-60 truncate" x-text="item.type || 'File'"></div>
                    </div>
                </div>
            </template>
        </div>
    </div>

    <!-- Pinned Apps View -->
    <div x-show="searchQuery.length === 0 && startMenuView === 'pinned'" class="flex-grow overflow-y-auto" :class="!isDesktop ? 'px-4' : 'px-8'">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-sm font-semibold dark:text-white">Pinned</h2>
            <button @click="startMenuView = 'allApps'" class="text-xs bg-white/20 dark:bg-white/5 px-2 py-1 rounded hover:bg-white/30 dark:hover:bg-white/10 dark:text-gray-300 transition-colors">All apps ></button>
        </div>
        
        <div class="grid gap-y-6 gap-x-4 grid-cols-4 sm:grid-cols-6">
            <!-- App Helper Macro would be nice, but we'll do them manually -->
            <template x-for="app in [
                { id: 'edge', name: 'Chrome', icon: window.portfolioConfig.imgPath + 'chrome.webp' },
                { id: 'vscode', name: 'VS Code', icon: window.portfolioConfig.imgPath + 'vscode.webp' },
                { id: 'word', name: 'Word', icon: window.portfolioConfig.imgPath + 'word.webp' },
                { id: 'excel', name: 'Excel', icon: window.portfolioConfig.imgPath + 'excel.webp' },
                { id: 'powerpoint', name: 'PowerPoint', icon: window.portfolioConfig.imgPath + 'powerpoint.webp' },
                { id: 'outlook', name: 'Outlook', icon: window.portfolioConfig.imgPath + 'outlook.webp' },
                { id: 'photoshop', name: 'Photoshop', icon: window.portfolioConfig.imgPath + 'photoshop.webp' },
                { id: 'flstudio', name: 'FL Studio 24', icon: window.portfolioConfig.imgPath + 'fl studio.webp' },
                { id: 'docker', name: 'Docker', icon: window.portfolioConfig.imgPath + 'docker.webp' },
                { id: 'explorer', name: 'Explorer', icon: window.portfolioConfig.imgPath + 'explorer.webp' },
                { id: 'notepad', name: 'Notepad++', icon: window.portfolioConfig.imgPath + 'notepad++.webp' },
            { id: 'putty', name: 'PuTTY', icon: window.portfolioConfig.imgPath + 'putty.webp' },
            { id: 'filezilla', name: 'FileZilla', icon: window.portfolioConfig.imgPath + 'filezilla.webp' },
            { id: 'terminal', name: 'Terminal', icon: window.portfolioConfig.imgPath + 'terminal.webp' },
            { id: 'database', name: 'SQL Server Management Studio', icon: window.portfolioConfig.imgPath + 'mssql.webp' },
            { id: 'settings', name: 'Settings', icon: window.portfolioConfig.imgPath + 'settings.webp' },
                { id: 'taskmanager', name: 'Task Manager', icon: window.portfolioConfig.imgPath + 'taskmanager.webp' },
                { id: 'eventviewer', name: 'Event Viewer', icon: window.portfolioConfig.imgPath + 'eventviewer.webp' }
            ].filter(a => !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase()))">
                <div @click="openApp(app.id)" 
                     :title="app.name"
                     class="flex flex-col items-center group cursor-pointer transition-all active:scale-95 w-full min-w-0">
                    <div class="w-10 h-10 rounded flex items-center justify-center text-2xl group-hover:scale-110 transition-transform bg-white/5 dark:bg-white/5 group-hover:bg-white/10 shrink-0 overflow-hidden" 
                         :class="app.id === 'terminal' ? 'bg-black dark:bg-black !text-white' : ''">
                        <template x-if="app.icon.includes('.')">
                            <img :src="app.icon" class="w-7 h-7 object-contain">
                        </template>
                        <template x-if="!app.icon.includes('.')">
                            <div class="w-full h-full flex items-center justify-center">
                                <template x-if="app.id === 'pdfreader'">
                                    <div class="w-5 h-7 bg-red-600 rounded-sm flex items-center justify-center text-[7px] font-bold text-white uppercase">PDF</div>
                                </template>
                                <template x-if="app.id !== 'pdfreader'">
                                    <span x-text="app.id === 'terminal' ? '⌨️' : app.icon"></span>
                                </template>
                            </div>
                        </template>
                    </div>
                    <span class="text-[11px] mt-2 dark:text-white text-center truncate w-full px-0.5" x-text="app.name"></span>
                </div>
            </template>
        </div>

        <!-- Search Results (Files) -->
        <div x-show="searchQuery.length > 0" class="mt-8 animate-window-open">
            <h2 class="text-sm font-semibold dark:text-white mb-4">Files</h2>
            <div class="grid grid-cols-1 gap-2">
                <template x-for="file in (function() {
                    const results = [];
                    const query = searchQuery.toLowerCase();
                    const fs = Alpine.store('os').fileSystem;
                    Object.keys(fs).forEach(path => {
                        fs[path].forEach(f => {
                            if (f.name.toLowerCase().includes(query)) {
                                results.push({ ...f, fullPath: path });
                            }
                        });
                    });
                    return results.slice(0, 5); // Limit to 5 results
                })()">
                    <div @click="file.name.endsWith('.pdf') ? openApp('pdfreader', file.name, {pdfUrl: file.pdfUrl || (window.portfolioConfig.basePath + 'data/cv.pdf')}) : (file.type === 'app' ? openApp(file.app, file.name) : (file.type === 'image' ? openApp('photos', file.name, {imageName: file.name}) : (file.type === 'video' ? openApp('video', file.name, {videoUrl: file.url}) : openApp('explorer'))))" 
                         draggable="true"
                         @dragstart="$event.dataTransfer.setData('application/json', JSON.stringify({item: file, fromPath: file.fullPath}))"
                         class="flex items-center p-2 rounded hover:bg-white/20 dark:hover:bg-white/10 cursor-pointer group transition-colors">
                        <div class="w-8 h-8 rounded bg-gray-100 dark:bg-white/5 flex items-center justify-center mr-3 text-lg group-hover:scale-110 transition-transform overflow-hidden shrink-0">
                            <template x-if="file.icon && file.icon.includes('.')">
                                <img :src="file.icon" class="w-6 h-6 object-contain">
                            </template>
                            <template x-if="!file.icon || !file.icon.includes('.')">
                                <span x-text="file.icon || '📁'"></span>
                            </template>
                        </div>
                        <div class="min-w-0">
                            <div class="text-[11px] font-medium dark:text-white truncate" x-text="file.name"></div>
                            <div class="text-[9px] text-gray-500 truncate" x-text="file.fullPath"></div>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <div class="mt-8">
            <h2 class="text-sm font-semibold dark:text-white mb-4">Recommended</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div @click="openApp('pdfreader', 'CV - DeVanté Johnson-Rose.pdf', { pdfUrl: window.portfolioConfig.basePath + 'data/cv.pdf' })" 
                     draggable="true"
                     @dragstart="$event.dataTransfer.setData('application/json', JSON.stringify({item: {name: 'CV - DeVanté Johnson-Rose.pdf', type: 'app', app: 'pdfreader'}, fromPath: 'C:\\Users\\DeVante\\Documents'}))"
                     class="flex items-center p-2 rounded hover:bg-white/20 dark:hover:bg-white/10 cursor-pointer">
                    <div class="w-8 h-8 rounded bg-white flex items-center justify-center mr-3 overflow-hidden">
                        <img :src="window.portfolioConfig.imgPath + 'pdf.webp'" class="w-6 h-6 object-contain">
                    </div>
                    <div>
                        <div class="text-[11px] font-medium dark:text-white">CV - DeVanté Johnson-Rose.pdf</div>
                        <div class="text-[10px] text-gray-500">2h ago</div>
                    </div>
                </div>
                <div @click="openApp('explorer', 'Projects', { initialPath: 'C:\\Users\\DeVante\\Projects' })" 
                     draggable="true"
                     @dragstart="$event.dataTransfer.setData('application/json', JSON.stringify({item: {name: 'Projects', type: 'folder'}, fromPath: 'C:\\Users\\DeVante\\Desktop'}))"
                     class="flex items-center p-2 rounded hover:bg-white/20 dark:hover:bg-white/10 cursor-pointer">
                    <div class="w-8 h-8 rounded bg-yellow-100 flex items-center justify-center mr-3 overflow-hidden">
                        <img :src="window.portfolioConfig.imgPath + 'win11/folder.webp'" class="w-6 h-6 object-contain">
                    </div>
                    <div>
                        <div class="text-[11px] font-medium dark:text-white">Projects</div>
                        <div class="text-[10px] text-gray-500">Yesterday</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- All Apps View -->
    <div x-show="searchQuery.length === 0 && startMenuView === 'allApps'" class="flex-grow overflow-y-auto px-8 custom-scrollbar h-full" x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0 translate-x-10" x-transition:enter-end="opacity-100 translate-x-0">
        <div class="flex items-center justify-between mb-4 sticky top-0 bg-white/10 backdrop-blur-md py-2 z-10">
            <h2 class="text-sm font-semibold dark:text-white">All apps</h2>
            <button @click="startMenuView = 'pinned'" class="text-xs bg-white/20 dark:bg-white/5 px-2 py-1 rounded hover:bg-white/30 dark:hover:bg-white/10 dark:text-gray-300 transition-colors">< Back</button>
        </div>
        
        <div class="space-y-6 pb-4">
            <template x-for="group in allApps" :key="group.letter">
                <div class="space-y-1">
                    <div class="text-xs font-bold text-win-blue ml-4 mb-2" x-text="group.letter"></div>
                    <div class="space-y-0.5">
                        <template x-for="app in group.apps" :key="app.id">
                            <div @click="openApp(app.id)" class="flex items-center p-2 rounded hover:bg-white/10 cursor-pointer group transition-colors">
                                <div class="w-8 h-8 rounded flex items-center justify-center mr-3 group-hover:scale-110 transition-transform overflow-hidden shrink-0">
                                    <template x-if="app.icon.includes('.')">
                                        <img :src="app.icon" class="w-6 h-6 object-contain">
                                    </template>
                                    <template x-if="!app.icon.includes('.')">
                                        <span x-text="app.icon" class="text-lg"></span>
                                    </template>
                                </div>
                                <span class="text-[11px] font-medium dark:text-white" x-text="app.name"></span>
                            </div>
                        </template>
                    </div>
                </div>
            </template>
        </div>
    </div>

    <!-- Bottom Profile Bar -->
    <div class="h-16 bg-black/5 dark:bg-black/20 flex items-center justify-between px-8 border-t border-white/10" :class="{ 'px-4': !isDesktop }">
        <div class="flex items-center space-x-3 group cursor-pointer p-1 rounded hover:bg-white/10">
            <img :src="user.avatar" class="w-8 h-8 rounded-full border border-white/20">
            <span class="text-xs font-medium dark:text-white" x-text="user.name"></span>
        </div>
        <button @click="logout()" class="p-2 rounded hover:bg-white/10 group" title="Sign out">
            <svg class="w-5 h-5 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
        </button>
    </div>
</div>
