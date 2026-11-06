<!-- partials/apps/notepad.php -->
<div class="relative h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none" x-data="notepadApp()"
     @keydown.window="handleKey($event)">
    <!-- Notepad Menu -->
    <div class="h-8 flex items-center px-2 space-x-1 text-[11px] border-b border-black/5 dark:border-white/5 shrink-0 relative">
        <div class="relative">
            <button @click="showFileMenu = !showFileMenu; openMenuId = null" 
                    class="hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1 rounded-sm cursor-pointer transition-colors"
                    :class="{ 'bg-black/5 dark:bg-white/5': showFileMenu }">File</button>
            
            <!-- File Dropdown -->
            <div x-show="showFileMenu" 
                 @click.away="showFileMenu = false"
                 class="absolute top-full left-0 w-48 bg-white dark:bg-[#2b2b2b] border border-black/10 dark:border-white/10 shadow-xl py-1 z-50 rounded-xs">
                <button @click="content = ''; currentFile = null; undoStack = []; selection = { start: 0, end: 0 }; showFileMenu = false" class="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white flex justify-between">
                    <span>New</span>
                </button>
                <button @click="openDialog('open')" class="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white flex justify-between">
                    <span>Open...</span>
                    <span class="opacity-50 text-[9px]">Ctrl+O</span>
                </button>
                <button @click="save()" class="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white flex justify-between">
                    <span>Save</span>
                    <span class="opacity-50 text-[9px]">Ctrl+S</span>
                </button>
                <button @click="openDialog('save')" class="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white flex justify-between">
                    <span>Save As...</span>
                </button>
                <div class="my-1 border-t border-black/5 dark:border-white/5"></div>
                <button @click="$store.os.closeWindow($store.os.focusedWindowId)" class="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white">Exit</button>
            </div>
        </div>
        <template x-for="menu in menus" :key="menu.id">
            <div class="relative">
                <button type="button"
                        :data-notepad-menu="menu.label"
                        @mousedown.prevent
                        @click="openMenuId = openMenuId === menu.id ? null : menu.id; showFileMenu = false"
                        class="hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1 rounded-sm cursor-pointer transition-colors"
                        :class="{ 'bg-black/5 dark:bg-white/5': openMenuId === menu.id }"
                        x-text="menu.label"></button>
                <div x-show="openMenuId === menu.id"
                     @click.away="if (openMenuId === menu.id) openMenuId = null"
                     class="absolute top-full left-0 w-56 bg-white dark:bg-[#2b2b2b] border border-black/10 dark:border-white/10 shadow-xl py-1 z-50 rounded-xs">
                    <template x-for="(item, index) in menu.items" :key="index">
                        <div>
                            <template x-if="item.separator">
                                <div class="my-1 border-t border-black/5 dark:border-white/5"></div>
                            </template>
                            <template x-if="!item.separator">
                                <button type="button"
                                        :data-notepad-item="item.label"
                                        @mousedown.prevent
                                        @click="run(item.id)"
                                        :disabled="isDisabled(item)"
                                        class="w-full text-left px-3 py-1.5 hover:bg-win-blue hover:text-white disabled:opacity-40 disabled:pointer-events-none flex justify-between">
                                    <span class="flex">
                                        <span class="w-4 shrink-0" x-text="item.option && options[item.option] ? '✓' : ''"></span>
                                        <span x-text="item.label"></span>
                                    </span>
                                    <span class="opacity-50 text-[9px]" x-text="item.shortcut"></span>
                                </button>
                            </template>
                        </div>
                    </template>
                </div>
            </div>
        </template>
    </div>

    <!-- Find and Replace -->
    <div x-show="findMode" data-notepad-find class="flex flex-wrap items-center gap-2 px-2 py-1.5 border-b border-black/5 dark:border-white/5 text-[11px] shrink-0">
        <input type="text" aria-label="Find" placeholder="Find" data-find-input x-model="findQuery" @input="selection = { start: 0, end: 0 }"
               @keydown.enter.prevent="findAgain()" @keydown.escape="closeFind()"
               class="w-36 bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 px-2 py-1 rounded-sm outline-hidden">
        <template x-if="findMode === 'replace'">
            <input type="text" aria-label="Replace with" placeholder="Replace with" x-model="replaceQuery"
                   @keydown.enter.prevent="replaceOne()" @keydown.escape="closeFind()"
                   class="w-36 bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 px-2 py-1 rounded-sm outline-hidden">
        </template>
        <button type="button" @click="findAgain()" class="px-2 py-1 rounded-sm bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">Find Next</button>
        <template x-if="findMode === 'replace'">
            <div class="flex gap-2">
                <button type="button" @click="replaceOne()" class="px-2 py-1 rounded-sm bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">Replace</button>
                <button type="button" @click="replaceEverything()" class="px-2 py-1 rounded-sm bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20">Replace All</button>
            </div>
        </template>
        <label class="flex items-center gap-1"><input type="checkbox" x-model="matchCase"> Match case</label>
        <span role="status" class="opacity-70" x-text="findMessage"></span>
        <button type="button" @click="closeFind()" aria-label="Close find" class="ml-auto px-2 py-1 rounded-sm hover:bg-black/5 dark:hover:bg-white/10">×</button>
    </div>

    <!-- File Dialog Modal -->
    <div x-show="showDialog" 
         class="absolute inset-0 z-100 flex items-center justify-center p-8 bg-black/20 backdrop-blur-[2px]"
         x-transition:enter="transition ease-out duration-200"
         x-transition:enter-start="opacity-0 scale-95"
         x-transition:enter-end="opacity-100 scale-100">
        <div class="bg-white dark:bg-[#1c1c1c] border border-black/20 dark:border-white/10 shadow-2xl rounded-lg w-full max-w-2xl flex flex-col overflow-hidden win-shadow">
            <!-- Dialog Header -->
            <div class="h-9 flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5 shrink-0 bg-black/5">
                <span class="text-xs font-semibold" x-text="showDialog === 'open' ? 'Open' : 'Save As'"></span>
                <button @click="showDialog = null" class="p-1 hover:bg-red-500 hover:text-white rounded-sm transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <!-- Dialog Content -->
            <div class="grow flex flex-col p-4 space-y-4">
                <!-- Path Navigation -->
                <div class="flex items-center space-x-2">
                    <button @click="navigateDialog('C:\\')" class="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-sm">🏠</button>
                    <div class="grow bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-1 text-[11px] rounded-sm flex items-center">
                        <span class="opacity-60" x-text="dialogPath"></span>
                    </div>
                </div>

                <!-- File List -->
                <div class="grow border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 rounded-md overflow-y-auto custom-scrollbar min-h-[200px]">
                    <div class="p-1">
                        <template x-for="file in dialogFiles" :key="file.name">
                            <div @click="handleDialogAction(file)" 
                                 :data-dialog-file="file.name"
                                 @dblclick="file.type === 'file' ? confirmDialog() : null"
                                 class="flex items-center px-3 py-2 rounded-sm cursor-pointer group transition-colors"
                                 :class="selectedDialogFile && selectedDialogFile.name === file.name ? 'bg-win-blue text-white' : 'hover:bg-win-blue hover:text-white'">
                                <div class="w-6 h-6 flex items-center justify-center mr-3 shrink-0">
                                    <template x-if="file.icon && file.icon.includes('.')">
                                        <img :src="file.icon" class="w-4 h-4 object-contain" :class="selectedDialogFile && selectedDialogFile.name === file.name ? 'brightness-0 invert' : ''">
                                    </template>
                                    <template x-if="!file.icon || !file.icon.includes('.')">
                                        <span x-text="file.type === 'folder' ? '📁' : '📄'" class="text-sm"></span>
                                    </template>
                                </div>
                                <span class="text-[11px] truncate grow" x-text="file.name"></span>
                                <span x-show="file.type === 'folder'" class="text-[9px] opacity-40 group-hover:opacity-100 transition-opacity" :class="selectedDialogFile && selectedDialogFile.name === file.name ? 'opacity-100' : ''">Folder</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Footer inputs -->
                <div class="flex items-center space-x-4 shrink-0">
                    <div class="grow space-y-2">
                        <div class="flex items-center space-x-2">
                            <span class="text-[10px] opacity-60 w-16">File name:</span>
                            <input type="text" x-model="fileNameInput" aria-label="File name:" class="grow bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 px-3 py-1 text-[11px] rounded-sm outline-hidden focus:border-win-blue">
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-[10px] opacity-60 w-16">Save as type:</span>
                            <select x-model="fileTypeFilter" aria-label="Save as type:" class="grow bg-white dark:bg-[#2b2b2b] border border-black/10 dark:border-white/10 px-2 py-1 text-[11px] rounded-sm outline-hidden focus:border-win-blue">
                                <option value="txt">Text Documents (*.txt)</option>
                                <option value="all">All Files (*.*)</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex flex-col space-y-2 pt-2">
                        <button @click="confirmDialog()" 
                                data-dialog-confirm
                                :disabled="showDialog === 'open' && !selectedDialogFile"
                                class="px-8 py-1.5 bg-win-blue text-white text-xs rounded-sm hover:brightness-110 transition-all shadow-md disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed">
                            <span x-text="showDialog === 'open' ? 'Open' : 'Save'"></span>
                        </button>
                        <button @click="showDialog = null" class="px-8 py-1.5 bg-black/5 dark:bg-white/10 text-xs rounded-sm hover:bg-black/10 dark:hover:bg-white/20 transition-all border border-black/10 dark:border-white/10">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Text Area -->
    <div class="grow p-4 relative overflow-auto">
        <template x-if="isEditing">
            <textarea :value="content"
                      x-init="placeCaret()"
                      data-notepad-text
                      aria-label="Text"
                      @input="onInput($event)"
                      @select="trackSelection()"
                      @keyup="trackSelection()"
                      @click="trackSelection()"
                      @blur="trackSelection(); isEditing = false"
                      :wrap="options.wordWrap ? 'soft' : 'off'"
                      :class="options.monospace ? 'font-mono' : 'font-sans'"
                      :style="textStyle"
                      class="w-full h-full bg-transparent outline-hidden resize-none leading-relaxed"
                      spellcheck="false"></textarea>
        </template>
        <template x-if="!isEditing">
            <div @click="if (!$event.target.closest('a')) startEditing()"
                 data-notepad-view
                 :class="textClass"
                 :style="textStyle"
                 class="w-full h-full leading-relaxed cursor-text min-h-[200px]"><template x-if="!content"><span class="opacity-20">Click to start typing...</span></template><template x-for="(part, index) in parts" :key="index"><span :data-notepad-mark="part.marked ? '' : null" :class="{ 'bg-yellow-300 text-black': part.marked }"><template x-if="part.link"><a :href="part.link" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline" x-text="part.text"></a></template><template x-if="!part.link"><span x-text="part.text"></span></template></span></template></div>
        </template>
    </div>

    <!-- Status Bar -->
    <div x-show="options.statusBar" data-notepad-status class="h-6 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-end px-4 text-[10px] space-x-6 shrink-0 opacity-60">
        <span x-text="`Ln ${caret.line}, Col ${caret.column}`"></span>
        <span x-text="`${options.zoom}%`"></span>
        <span>Windows (CRLF)</span>
        <span>UTF-8</span>
    </div>
</div>
