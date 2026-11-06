<!-- partials/apps/filezilla.php. The listings come from data/devtools.json, as in v2. -->
<div class="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden" data-filezilla
     x-data="filezillaApp(<?php echo htmlspecialchars(js_value(load_shared_data('devtools')['filezilla'] ?? []), ENT_QUOTES, 'UTF-8'); ?>)">
    <!-- FileZilla Toolbar -->
    <div class="min-h-10 bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 flex items-center px-2 py-1 gap-2 shrink-0 overflow-x-auto scrollbar-none">
        <div class="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-700 pr-2 shrink-0">
            <button type="button" aria-label="Site Manager" title="Site Manager" class="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5"><img src="<?php echo IMG_PATH; ?>win11/folder_open.webp" alt="" class="w-4 h-4"></button>
            <button type="button" aria-label="Settings" title="Settings" class="p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-white/5"><img src="<?php echo IMG_PATH; ?>win11/settings.webp" alt="" class="w-4 h-4"></button>
        </div>
        <label class="flex flex-col shrink-0">
            <span class="text-[9px] opacity-60">Host:</span>
            <input type="text" x-model="host" class="bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[10px] rounded-sm outline-hidden w-32">
        </label>
        <label class="flex flex-col shrink-0">
            <span class="text-[9px] opacity-60">Username:</span>
            <input type="text" x-model="user" class="bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[10px] rounded-sm outline-hidden w-24">
        </label>
        <label class="flex flex-col shrink-0">
            <span class="text-[9px] opacity-60">Password:</span>
            <input type="password" x-model="pass" autocomplete="off" class="bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[10px] rounded-sm outline-hidden w-24">
        </label>
        <label class="flex flex-col shrink-0">
            <span class="text-[9px] opacity-60">Port:</span>
            <input type="text" x-model="port" inputmode="numeric" class="bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[10px] rounded-sm outline-hidden w-12">
        </label>
        <button type="button" @click="isConnected ? disconnect() : connect()" :disabled="isConnecting"
                class="mt-3 px-4 py-1 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 border border-gray-400 dark:border-gray-600 rounded-sm text-[10px] transition-all flex items-center shrink-0">
            <span x-text="isConnecting ? 'Connecting...' : (isConnected ? 'Disconnect' : 'Quickconnect')"></span>
        </button>
    </div>

    <!-- Message Log Area -->
    <div class="h-28 bg-white dark:bg-black/40 border-b border-gray-300 dark:border-gray-800 p-2 overflow-y-auto font-mono text-[10px] space-y-0.5 custom-scrollbar shrink-0" aria-live="polite">
        <template x-for="(log, index) in logs" :key="index">
            <div :class="{
                'text-green-600 dark:text-green-400': log.type === 'status' && log.text.includes('successful'),
                'text-blue-600 dark:text-blue-400': log.type === 'command',
                'text-red-600 dark:text-red-400': log.type === 'error'
            }" x-text="log.text"></div>
        </template>
    </div>

    <!-- File Explorer Split View -->
    <div class="grow flex flex-col sm:flex-row min-h-0">
        <!-- Local Site -->
        <div class="flex-1 flex flex-col min-h-0 min-w-0 border-b sm:border-b-0 sm:border-r border-gray-300 dark:border-gray-800">
            <div class="h-6 bg-gray-100 dark:bg-[#252526] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center min-w-0">
                <span class="text-[10px] font-semibold truncate">Local site: <span class="font-normal opacity-70" x-text="localPath"></span></span>
            </div>
            <div class="grow bg-white dark:bg-[#1e1e1e] overflow-y-auto custom-scrollbar">
                <div class="grid grid-cols-12 py-1 px-4 text-[10px] font-bold border-b border-gray-100 dark:border-white/5 opacity-60">
                    <div class="col-span-6">Filename</div>
                    <div class="col-span-3">Filesize</div>
                    <div class="col-span-3">Filetype</div>
                </div>
                <div class="text-[10px] divide-y divide-gray-100 dark:divide-white/5">
                    <template x-for="file in local" :key="file.name">
                        <div class="grid grid-cols-12 py-1 px-4 hover:bg-win-blue hover:text-white cursor-default">
                            <div class="col-span-6 flex items-center min-w-0">
                                <img :src="window.portfolioConfig.imgPath + (file.type === 'dir' ? 'win11/folder.webp' : 'notepad++.webp')" alt="" class="w-3.5 h-3.5 mr-2 shrink-0">
                                <span class="truncate" data-local-file x-text="file.name"></span>
                            </div>
                            <div class="col-span-3" x-text="size(file)"></div>
                            <div class="col-span-3 truncate" x-text="file.kind"></div>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <!-- Remote Site -->
        <div class="flex-1 flex flex-col min-h-0 min-w-0">
            <div class="h-6 bg-gray-100 dark:bg-[#252526] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center min-w-0">
                <span class="text-[10px] font-semibold truncate">Remote site: <span class="font-normal opacity-70" x-text="isConnected ? remotePath : ''"></span></span>
            </div>
            <div class="grow bg-white dark:bg-[#1e1e1e] overflow-y-auto custom-scrollbar relative">
                <template x-if="!isConnected">
                    <div class="absolute inset-0 flex items-center justify-center text-xs opacity-60">
                        Not connected to any server
                    </div>
                </template>
                <template x-if="isConnected">
                    <div>
                        <div class="grid grid-cols-12 py-1 px-4 text-[10px] font-bold border-b border-gray-100 dark:border-white/5 opacity-60">
                            <div class="col-span-6">Filename</div>
                            <div class="col-span-3">Filesize</div>
                            <div class="col-span-3">Permissions</div>
                        </div>
                        <div class="text-[10px] divide-y divide-gray-100 dark:divide-white/5">
                            <template x-for="file in remote" :key="file.name">
                                <div class="grid grid-cols-12 py-1 px-4 hover:bg-win-blue hover:text-white cursor-default">
                                    <div class="col-span-6 flex items-center min-w-0">
                                        <img :src="window.portfolioConfig.imgPath + (file.type === 'dir' ? 'win11/folder.webp' : 'notepad++.webp')" alt="" class="w-3.5 h-3.5 mr-2 shrink-0">
                                        <span class="truncate" x-text="file.name"></span>
                                    </div>
                                    <div class="col-span-3" x-text="size(file)"></div>
                                    <div class="col-span-3 font-mono" x-text="file.permissions"></div>
                                </div>
                            </template>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>

    <!-- Status Bar -->
    <div class="h-6 border-t border-gray-300 dark:border-gray-800 bg-[#f0f0f0] dark:bg-[#2b2b2b] flex items-center px-4 justify-between text-[9px] shrink-0 gap-4 min-w-0">
        <div class="opacity-70" x-text="isConnected ? 'Connected' : 'Ready'"></div>
        <div class="flex items-center space-x-4 min-w-0 opacity-70">
            <span class="truncate" x-text="'Server: sftp://' + user + '@' + host"></span>
            <span class="shrink-0">Queue: 0 files</span>
        </div>
    </div>
</div>
