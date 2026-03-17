<!-- partials/apps/notepad.php -->
<div class="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none" x-data="notepadApp()">
    <!-- Notepad Menu -->
    <div class="h-8 flex items-center px-2 space-x-1 text-[11px] border-b border-black/5 dark:border-white/5 shrink-0 relative">
        <div class="relative">
            <button @click="showFileMenu = !showFileMenu" 
                    class="hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1 rounded cursor-pointer transition-colors"
                    :class="{ 'bg-black/5 dark:bg-white/5': showFileMenu }">File</button>
            
            <!-- File Dropdown -->
            <div x-show="showFileMenu" 
                 @click.away="showFileMenu = false"
                 class="absolute top-full left-0 w-48 bg-white dark:bg-[#2b2b2b] border border-black/10 dark:border-white/10 shadow-xl py-1 z-50 rounded-sm">
                <button @click="content = ''; currentFile = null; showFileMenu = false" class="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white flex justify-between">
                    <span>New</span>
                    <span class="opacity-50 text-[9px]">Ctrl+N</span>
                </button>
                <button @click="openDialog('open')" class="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white flex justify-between">
                    <span>Open...</span>
                    <span class="opacity-50 text-[9px]">Ctrl+O</span>
                </button>
                <button @click="openDialog('save')" class="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white flex justify-between">
                    <span>Save As...</span>
                    <span class="opacity-50 text-[9px]">Ctrl+S</span>
                </button>
                <div class="my-1 border-t border-black/5 dark:border-white/5"></div>
                <button @click="$store.os.closeWindow($store.os.focusedWindowId)" class="w-full text-left px-4 py-1.5 hover:bg-win-blue hover:text-white">Exit</button>
            </div>
        </div>
        <span class="hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1 rounded cursor-default opacity-50">Edit</span>
        <span class="hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1 rounded cursor-default opacity-50">Format</span>
        <span class="hover:bg-black/5 dark:hover:bg-white/5 px-3 py-1 rounded cursor-default opacity-50">View</span>
    </div>

    <!-- File Dialog Modal -->
    <div x-show="showDialog" 
         class="absolute inset-0 z-[100] flex items-center justify-center p-8 bg-black/20 backdrop-blur-[2px]"
         x-transition:enter="transition ease-out duration-200"
         x-transition:enter-start="opacity-0 scale-95"
         x-transition:enter-end="opacity-100 scale-100">
        <div class="bg-white dark:bg-[#1c1c1c] border border-black/20 dark:border-white/10 shadow-2xl rounded-lg w-full max-w-2xl flex flex-col overflow-hidden win-shadow">
            <!-- Dialog Header -->
            <div class="h-9 flex items-center justify-between px-4 border-b border-black/5 dark:border-white/5 shrink-0 bg-black/5">
                <span class="text-xs font-semibold" x-text="showDialog === 'open' ? 'Open' : 'Save As'"></span>
                <button @click="showDialog = null" class="p-1 hover:bg-red-500 hover:text-white rounded transition-colors">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>

            <!-- Dialog Content -->
            <div class="flex-grow flex flex-col p-4 space-y-4">
                <!-- Path Navigation -->
                <div class="flex items-center space-x-2">
                    <button @click="navigateDialog('C:\\')" class="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded">🏠</button>
                    <div class="flex-grow bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 px-3 py-1 text-[11px] rounded flex items-center">
                        <span class="opacity-60" x-text="dialogPath"></span>
                    </div>
                </div>

                <!-- File List -->
                <div class="flex-grow border border-black/10 dark:border-white/10 bg-white dark:bg-black/20 rounded-md overflow-y-auto custom-scrollbar min-h-[200px]">
                    <div class="p-1">
                        <template x-for="file in dialogFiles" :key="file.name">
                            <div @click="handleDialogAction(file)" 
                                 @dblclick="file.type === 'file' ? confirmDialog() : null"
                                 class="flex items-center px-3 py-2 rounded cursor-pointer group transition-colors"
                                 :class="selectedDialogFile && selectedDialogFile.name === file.name ? 'bg-win-blue text-white' : 'hover:bg-win-blue hover:text-white'">
                                <div class="w-6 h-6 flex items-center justify-center mr-3 shrink-0">
                                    <template x-if="file.icon && file.icon.includes('.')">
                                        <img :src="file.icon" class="w-4 h-4 object-contain" :class="selectedDialogFile && selectedDialogFile.name === file.name ? 'brightness-0 invert' : ''">
                                    </template>
                                    <template x-if="!file.icon || !file.icon.includes('.')">
                                        <span x-text="file.type === 'folder' ? '📁' : '📄'" class="text-sm"></span>
                                    </template>
                                </div>
                                <span class="text-[11px] truncate flex-grow" x-text="file.name"></span>
                                <span x-show="file.type === 'folder'" class="text-[9px] opacity-40 group-hover:opacity-100 transition-opacity" :class="selectedDialogFile && selectedDialogFile.name === file.name ? 'opacity-100' : ''">Folder</span>
                            </div>
                        </template>
                    </div>
                </div>

                <!-- Footer inputs -->
                <div class="flex items-center space-x-4 shrink-0">
                    <div class="flex-grow space-y-2">
                        <div class="flex items-center space-x-2">
                            <span class="text-[10px] opacity-60 w-16">File name:</span>
                            <input type="text" x-model="fileNameInput" class="flex-grow bg-white dark:bg-black/40 border border-black/10 dark:border-white/10 px-3 py-1 text-[11px] rounded outline-none focus:border-win-blue">
                        </div>
                        <div class="flex items-center space-x-2">
                            <span class="text-[10px] opacity-60 w-16">Save as type:</span>
                            <select x-model="fileTypeFilter" class="flex-grow bg-white dark:bg-[#2b2b2b] border border-black/10 dark:border-white/10 px-2 py-1 text-[11px] rounded outline-none focus:border-win-blue">
                                <option value="txt">Text Documents (*.txt)</option>
                                <option value="all">All Files (*.*)</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex flex-col space-y-2 pt-2">
                        <button @click="confirmDialog()" 
                                :disabled="showDialog === 'open' && !selectedDialogFile"
                                class="px-8 py-1.5 bg-win-blue text-white text-xs rounded hover:brightness-110 transition-all shadow-md disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed">
                            <span x-text="showDialog === 'open' ? 'Open' : 'Save'"></span>
                        </button>
                        <button @click="showDialog = null" class="px-8 py-1.5 bg-black/5 dark:bg-white/10 text-xs rounded hover:bg-black/10 dark:hover:bg-white/20 transition-all border border-black/10 dark:border-white/10">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Text Area -->
    <div class="flex-grow p-4 relative overflow-auto">
        <template x-if="isEditing">
            <textarea x-model="content" 
                      @blur="isEditing = false"
                      class="w-full h-full bg-transparent outline-none resize-none font-mono text-sm leading-relaxed"
                      spellcheck="false"
                      x-init="$el.focus()"></textarea>
        </template>
        <template x-if="!isEditing">
            <div @click="isEditing = true"
                 class="w-full h-full font-mono text-sm leading-relaxed whitespace-pre-wrap break-all cursor-text min-h-[200px]"
                 x-html="linkify(content) || '<span class=\'opacity-20\'>Click to start typing...</span>'"></div>
        </template>
    </div>

    <!-- Status Bar -->
    <div class="h-6 bg-black/5 dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-end px-4 text-[10px] space-x-6 shrink-0 opacity-60">
        <span>Windows (CRLF)</span>
        <span>UTF-8</span>
    </div>
</div>
