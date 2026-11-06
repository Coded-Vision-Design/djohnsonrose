<!-- partials/apps/explorer.php -->
<div class="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none" x-data="explorerApp()">
    <!-- Explorer Toolbar -->
    <div class="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-2 space-x-3 bg-white dark:bg-[#2b2b2b] shrink-0">
        <div class="flex items-center space-x-1 pr-2 border-r border-gray-200 dark:border-gray-700">
            <button type="button" @click="goBack()" :disabled="historyStep <= 0" aria-label="Back" title="Back (Backspace)" class="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg></button>
            <button type="button" @click="goForward()" :disabled="historyStep >= history.length - 1" aria-label="Forward" title="Forward" class="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg></button>
            <button type="button" @click="goUp()" aria-label="Up" title="Up" class="p-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg></button>
        </div>

        <div class="grow flex items-center bg-gray-100 dark:bg-black/20 rounded-md px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 shadow-inner overflow-hidden relative cursor-text min-h-[32px]"
             @click="if(!addressBarActive) { addressBarActive = true; $nextTick(() => $refs.pathInput.focus()); }">

            <!-- Breadcrumbs View -->
            <div x-show="!addressBarActive" class="flex items-center space-x-1 truncate w-full h-full">
                <img :src="window.portfolioConfig.imgPath + 'explorer.webp'" alt="" class="w-4 h-4 object-contain mr-1 hidden sm:inline opacity-80">
                <span class="mx-1 opacity-40 hidden sm:inline">></span>
                <template x-for="(part, index) in currentPath.split('\\').filter(p => p !== '')" :key="index">
                    <div class="flex items-center">
                        <button type="button" @click.stop="navigate(currentPath.split('\\').filter(p => p !== '').slice(0, index + 1).join('\\') + (index === 0 ? '\\' : ''))"
                                class="hover:underline cursor-pointer truncate max-w-[60px] sm:max-w-[200px]" x-text="part"></button>
                        <span class="mx-1 opacity-40" x-show="index < currentPath.split('\\').filter(p => p !== '').length - 1">></span>
                    </div>
                </template>
            </div>

            <!-- Editable Path View -->
            <input type="text"
                   x-show="addressBarActive"
                   x-ref="pathInput"
                   x-model="manualPath"
                   aria-label="Address"
                   @keydown.enter="submitPath()"
                   @click.away="addressBarActive = false; manualPath = currentPath"
                   @keydown.escape="addressBarActive = false; manualPath = currentPath"
                   class="bg-transparent border-none outline-hidden w-full text-xs font-mono">
        </div>

        <div class="w-32 sm:w-56 bg-gray-100 dark:bg-black/20 rounded-md px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 flex items-center relative">
            <svg class="w-3.5 h-3.5 text-gray-400 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            <input type="text" x-model="searchQuery" placeholder="Search" aria-label="Search" class="bg-transparent border-none outline-hidden w-full truncate pr-6">
            <button type="button" x-show="searchQuery.length > 0" @click="searchQuery = ''" aria-label="Clear search" class="absolute right-2 p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full">
                <svg class="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>

        <!-- View toggle -->
        <div class="hidden md:flex items-center space-x-0.5 border-l border-gray-200 dark:border-gray-700 pl-3">
            <button type="button" @click="viewMode = 'grid'" :aria-pressed="viewMode === 'grid'" title="Grid view" class="p-1.5 rounded-sm" :class="viewMode === 'grid' ? 'bg-blue-100 dark:bg-blue-900/40 text-win-blue' : 'hover:bg-gray-100 dark:hover:bg-white/5'">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z"></path></svg>
            </button>
            <button type="button" @click="viewMode = 'details'" :aria-pressed="viewMode === 'details'" title="Details view" class="p-1.5 rounded-sm" :class="viewMode === 'details' ? 'bg-blue-100 dark:bg-blue-900/40 text-win-blue' : 'hover:bg-gray-100 dark:hover:bg-white/5'">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h2v2H3V5zm4 0h14v2H7V5zM3 11h2v2H3v-2zm4 0h14v2H7v-2zM3 17h2v2H3v-2zm4 0h14v2H7v-2z"></path></svg>
            </button>
            <button type="button" @click="detailsOpen = !detailsOpen" :aria-pressed="detailsOpen" title="Details pane" class="p-1.5 rounded-sm ml-1" :class="detailsOpen ? 'bg-blue-100 dark:bg-blue-900/40 text-win-blue' : 'hover:bg-gray-100 dark:hover:bg-white/5'">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </button>
        </div>

        <!-- Empty Recycle Bin -->
        <template x-if="isRecycle">
            <button type="button" @click="emptyBin()" :disabled="currentFiles.length === 0" title="Empty Recycle Bin" class="px-3 py-1.5 rounded-sm text-xs font-medium bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed">🗑 Empty</button>
        </template>
    </div>

    <!-- Main Content Area -->
    <div class="flex grow overflow-hidden bg-white dark:bg-[#1c1c1c]">
        <!-- Sidebar -->
        <div class="w-52 border-r border-gray-200 dark:border-gray-800 p-2 space-y-0.5 text-xs shrink-0 overflow-y-auto hidden lg:block">
            <template x-for="(item, index) in sidebarItems" :key="item.id ?? 'header-' + index">
                <div>
                    <template x-if="item.type === 'header'">
                        <div class="px-3 py-2 font-bold opacity-50 uppercase tracking-tighter text-[10px]" x-text="item.label"></div>
                    </template>
                    <template x-if="item.type !== 'header'">
                        <button type="button"
                                :data-sidebar-item="item.label"
                                @click="openSidebarItem(item)"
                                @dragover.prevent="if(item.id === 'recycle') { $event.dataTransfer.dropEffect = 'move'; $el.classList.add('bg-blue-100', 'dark:bg-blue-900/40'); }"
                                @dragleave="if(item.id === 'recycle') { $el.classList.remove('bg-blue-100', 'dark:bg-blue-900/40'); }"
                                @drop.prevent="if(item.id === 'recycle') {
                                    $el.classList.remove('bg-blue-100', 'dark:bg-blue-900/40');
                                    const data = JSON.parse($event.dataTransfer.getData('application/json'));
                                    if (data && data.item) deleteItem(data.item, data.fromPath);
                                }"
                                :class="{
                                    'bg-blue-100/50 dark:bg-blue-900/20 text-win-blue font-semibold': !item.favourite && currentPath === item.path,
                                    'pl-8': item.indent,
                                    'px-3': !item.indent
                                }"
                                class="w-full text-left py-1.5 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5 flex items-center group transition-colors">
                            <span class="mr-3 text-base group-hover:scale-110 transition-transform flex items-center justify-center w-5 h-5 shrink-0">
                                <template x-if="(item.icon || '').includes('.')">
                                    <img :src="item.icon" alt="" class="w-full h-full object-contain">
                                </template>
                                <template x-if="!(item.icon || '').includes('.')">
                                    <span x-text="item.icon || '📁'"></span>
                                </template>
                            </span>
                            <span class="truncate" x-text="item.label"></span>
                        </button>
                    </template>
                </div>
            </template>
        </div>

        <!-- File Pane -->
        <div class="grow overflow-y-auto bg-white dark:bg-[#1c1c1c]"
             data-explorer-pane
             @touchstart="handleTouchStart($event, (pos) => showExplorerPaneMenu(pos))"
             @touchmove="handleTouchMove($event)"
             @touchend="handleTouchEnd($event)"
             @contextmenu.stop="if (!$event.target.closest('[data-explorer-file], input')) { $event.preventDefault(); showExplorerPaneMenu($event); }"
             @click="if ($event.target === $event.currentTarget) selected = null">
            <!-- Mobile Navigation Pills -->
            <div class="m-4 mb-2 flex overflow-x-auto pb-2 space-x-2 lg:hidden">
                <template x-for="item in sidebarItems.filter(i => i.type !== 'header')" :key="item.id">
                    <button type="button" @click="openSidebarItem(item)"
                            :class="currentPath === item.path ? 'bg-win-blue text-white shadow-md' : 'bg-gray-100 dark:bg-white/5'"
                            class="px-4 py-1.5 rounded-full text-[10px] whitespace-nowrap transition-all border border-transparent flex items-center space-x-2">
                        <template x-if="(item.icon || '').includes('.')">
                            <img :src="item.icon" alt="" class="w-3 h-3 object-contain">
                        </template>
                        <span x-text="item.label"></span>
                    </button>
                </template>
            </div>

            <!-- Empty State -->
            <template x-if="currentFiles.length === 0">
                <div class="h-full flex flex-col items-center justify-center opacity-30 p-8">
                    <img :src="window.portfolioConfig.imgPath + 'explorer.webp'" alt="" class="w-20 h-20 object-contain mb-4 grayscale opacity-50">
                    <div class="text-sm font-medium" x-text="isRecycle ? 'Recycle bin is empty.' : 'This folder is empty.'"></div>
                </div>
            </template>

            <!-- Grid View -->
            <template x-if="currentFiles.length > 0 && viewMode === 'grid'">
                <div class="grid gap-4 grid-cols-[repeat(auto-fill,minmax(100px,1fr))] p-4">
                    <template x-for="file in currentFiles" :key="(file.location || '') + file.name">
                        <div @dblclick="openItem(file)"
                             :data-explorer-file="file.name"
                             @contextmenu.prevent.stop="showExplorerItemMenu($event, file)"
                             @click="selected = file.name"
                             @touchstart.stop="handleTouchStart($event, (pos) => showExplorerItemMenu(pos, file))"
                             @touchmove="handleTouchMove($event)"
                             @touchend="handleTouchEnd($event)"
                             :draggable="renamingName !== file.name"
                             @dragstart="$event.dataTransfer.setData('application/json', JSON.stringify({item: file, fromPath: pathOf(file)}))"
                             :title="file.techStack ? 'Tech Stack: ' + file.techStack : file.name"
                             :class="{
                                'bg-blue-100/50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 shadow-xs': selected === file.name,
                                'file-cut': cutName === file.name
                             }"
                             class="flex flex-col items-center p-2 rounded-sm border border-transparent hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 cursor-pointer group transition-all w-[100px]">
                            <div class="w-12 h-12 mb-2 flex items-center justify-center relative overflow-hidden rounded-sm shadow-xs group-hover:scale-105 transition-transform shrink-0">
                                <template x-if="file.type === 'image'">
                                    <img :src="file.url" alt="" class="w-full h-full object-cover" loading="lazy">
                                </template>
                                <template x-if="file.type !== 'image' && (file.icon || '').includes('.')">
                                    <img :src="file.icon" alt="" class="w-10 h-10 object-contain">
                                </template>
                                <template x-if="file.type !== 'image' && !(file.icon || '').includes('.')">
                                    <div class="text-4xl drop-shadow-xs" x-text="file.icon || '📁'"></div>
                                </template>
                                <template x-if="file.status">
                                    <div class="absolute bottom-0 right-0 bg-white/80 dark:bg-black/80 rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-xs border border-black/5 dark:border-white/10" x-text="file.status"></div>
                                </template>
                            </div>
                            <template x-if="renamingName === file.name">
                                <input type="text" aria-label="New name" data-rename-input x-data="renameInput(file.name)" x-model="value" @keydown.stop="onKey($event)" @blur="commit()" @click.stop @mousedown.stop @dblclick.stop
                                       class="text-[11px] text-center w-full px-1 font-medium leading-tight bg-white dark:bg-[#1c1c1c] border border-win-blue rounded-sm outline-hidden">
                            </template>
                            <template x-if="renamingName !== file.name">
                                <div class="text-[11px] text-center w-full px-0.5 font-medium leading-tight overflow-hidden" x-text="file.name"></div>
                            </template>
                            <template x-if="file.location">
                                <div class="text-[9px] text-gray-400 truncate w-full px-0.5 mt-0.5" x-text="file.location"></div>
                            </template>
                            <template x-if="isRecycle && renamingName !== file.name">
                                <button type="button" @click.stop="restoreItem(file)" :title="`Restore ${file.name}`" class="mt-2 px-3 py-1 bg-win-blue text-white text-[10px] font-semibold rounded-sm shadow-sm hover:bg-blue-600 transition-colors">↺ Restore</button>
                            </template>
                        </div>
                    </template>
                </div>
            </template>

            <!-- Details View -->
            <template x-if="currentFiles.length > 0 && viewMode === 'details'">
                <table class="w-full text-[12px] border-collapse">
                    <thead class="bg-gray-100 dark:bg-[#252526] sticky top-0 z-10 text-left">
                        <tr>
                            <th @click="toggleSort('name')" class="py-1.5 text-[11px] font-medium opacity-60 hover:opacity-100 cursor-pointer border-b border-gray-200 dark:border-gray-800 pl-4 w-[50%]" x-text="'Name' + (sortKey === 'name' ? sortArrow : '')"></th>
                            <th @click="toggleSort('date')" class="py-1.5 text-[11px] font-medium opacity-60 hover:opacity-100 cursor-pointer border-b border-gray-200 dark:border-gray-800" x-text="'Date modified' + (sortKey === 'date' ? sortArrow : '')"></th>
                            <th @click="toggleSort('type')" class="py-1.5 text-[11px] font-medium opacity-60 hover:opacity-100 cursor-pointer border-b border-gray-200 dark:border-gray-800" x-text="'Type' + (sortKey === 'type' ? sortArrow : '')"></th>
                            <th @click="toggleSort('size')" class="py-1.5 text-[11px] font-medium opacity-60 hover:opacity-100 cursor-pointer border-b border-gray-200 dark:border-gray-800 text-right pr-4" x-text="'Size' + (sortKey === 'size' ? sortArrow : '')"></th>
                        </tr>
                    </thead>
                    <tbody>
                        <template x-for="file in currentFiles" :key="(file.location || '') + file.name">
                            <tr @click="selected = file.name"
                                @dblclick="openItem(file)"
                                :data-explorer-file="file.name"
                                @contextmenu.prevent.stop="showExplorerItemMenu($event, file)"
                                @touchstart.stop="handleTouchStart($event, (pos) => showExplorerItemMenu(pos, file))"
                                @touchmove="handleTouchMove($event)"
                                @touchend="handleTouchEnd($event)"
                                :class="{
                                    'bg-blue-100/50 dark:bg-blue-900/30': selected === file.name,
                                    'file-cut': cutName === file.name
                                }"
                                class="cursor-pointer hover:bg-blue-50/50 dark:hover:bg-blue-900/10">
                                <td class="pl-4 py-1.5 flex items-center space-x-2">
                                    <span class="w-5 h-5 flex items-center justify-center shrink-0">
                                        <template x-if="file.type === 'image'">
                                            <img :src="file.url" alt="" class="w-5 h-5 object-cover rounded-sm">
                                        </template>
                                        <template x-if="file.type !== 'image' && (file.icon || '').includes('.')">
                                            <img :src="file.icon" alt="" class="w-5 h-5 object-contain">
                                        </template>
                                        <template x-if="file.type !== 'image' && !(file.icon || '').includes('.')">
                                            <span class="text-sm" x-text="file.icon || '📁'"></span>
                                        </template>
                                    </span>
                                    <template x-if="renamingName === file.name">
                                        <input type="text" aria-label="New name" data-rename-input x-data="renameInput(file.name)" x-model="value" @keydown.stop="onKey($event)" @blur="commit()" @click.stop @mousedown.stop @dblclick.stop
                                               class="text-[12px] px-1 bg-white dark:bg-[#1c1c1c] border border-win-blue rounded-sm outline-hidden w-full">
                                    </template>
                                    <template x-if="renamingName !== file.name">
                                        <span class="truncate" x-text="file.name"></span>
                                    </template>
                                    <template x-if="isRecycle && renamingName !== file.name">
                                        <span class="ml-2 text-[10px] opacity-60">(deleted)</span>
                                    </template>
                                </td>
                                <td class="py-1.5 opacity-70" x-text="OsWindowing.formatDate(OsWindowing.entryDate(file))"></td>
                                <td class="py-1.5 opacity-70" x-text="OsWindowing.entryType(file)"></td>
                                <td class="py-1.5 opacity-70 text-right pr-4" x-text="OsWindowing.formatSize(OsWindowing.entrySize(file))"></td>
                            </tr>
                        </template>
                    </tbody>
                </table>
            </template>
        </div>

        <!-- Details Pane -->
        <template x-if="detailsOpen">
            <aside class="w-72 border-l border-gray-200 dark:border-gray-800 bg-[#fafafa] dark:bg-[#252526] shrink-0 flex-col hidden xl:flex" data-details-pane>
                <div class="h-9 px-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
                    <span class="text-[11px] font-semibold opacity-70 uppercase tracking-wider">Details</span>
                    <button type="button" @click="detailsOpen = false" class="opacity-50 hover:opacity-100 text-sm" aria-label="Close details">×</button>
                </div>
                <template x-if="!selectedFile">
                    <div class="grow flex items-center justify-center text-xs opacity-50 px-4 text-center">Select a file to see its properties.</div>
                </template>
                <template x-if="selectedFile">
                    <div class="grow overflow-y-auto p-4 space-y-4">
                        <div class="flex flex-col items-center">
                            <div class="w-20 h-20 flex items-center justify-center rounded-sm shadow-xs">
                                <template x-if="selectedFile.type === 'image'">
                                    <img :src="selectedFile.url" alt="" class="w-full h-full object-cover rounded-sm">
                                </template>
                                <template x-if="selectedFile.type !== 'image' && (selectedFile.icon || '').includes('.')">
                                    <img :src="selectedFile.icon" alt="" class="w-16 h-16 object-contain">
                                </template>
                                <template x-if="selectedFile.type !== 'image' && !(selectedFile.icon || '').includes('.')">
                                    <div class="text-5xl" x-text="selectedFile.icon || '📁'"></div>
                                </template>
                            </div>
                            <div class="mt-3 text-center font-semibold text-sm break-all" x-text="selectedFile.name"></div>
                        </div>
                        <dl class="text-[11px] space-y-1">
                            <template x-for="[label, value] in selectedRows" :key="label">
                                <div class="grid grid-cols-[5rem_1fr] gap-2">
                                    <dt class="opacity-50" x-text="label"></dt>
                                    <dd class="wrap-break-word" x-text="value"></dd>
                                </div>
                            </template>
                        </dl>
                    </div>
                </template>
            </aside>
        </template>
    </div>

    <!-- Status Bar -->
    <div class="h-6 border-t border-gray-200 dark:border-gray-800 bg-win-bg dark:bg-[#2b2b2b] flex items-center px-4 justify-between text-[10px] opacity-60 shrink-0">
        <div x-text="currentFiles.length + ' items'"></div>
        <div class="flex items-center space-x-4">
            <div class="hidden md:flex items-center space-x-3 opacity-80">
                <span x-text="`Sort: ${sortKey} ${sortDir === 'asc' ? '↑' : '↓'}`"></span>
            </div>
            <template x-if="selectedFile">
                <div class="flex items-center space-x-1">
                    <span>📁</span>
                    <span x-text="`1 item selected · ${OsWindowing.formatSize(OsWindowing.entrySize(selectedFile))}`"></span>
                </div>
            </template>
        </div>
    </div>
</div>
