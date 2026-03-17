<!-- partials/apps/filezilla.php -->
<div class="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden" x-data="filezillaApp()">
    <!-- FileZilla Toolbar -->
    <div class="h-10 bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 flex items-center px-2 space-x-2 shrink-0">
        <div class="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-700 pr-2">
            <button class="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5"><span class="text-xs">📂</span></button>
            <button class="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/5"><span class="text-xs">⚙️</span></button>
        </div>
        <div class="flex items-center space-x-2 flex-grow">
            <div class="flex flex-col">
                <span class="text-[9px] opacity-60">Host:</span>
                <input type="text" x-model="host" placeholder="sftp.johnson-rose.co.uk" class="bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[10px] rounded outline-none w-32">
            </div>
            <div class="flex flex-col">
                <span class="text-[9px] opacity-60">Username:</span>
                <input type="text" x-model="user" placeholder="devante" class="bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[10px] rounded outline-none w-24">
            </div>
            <div class="flex flex-col">
                <span class="text-[9px] opacity-60">Password:</span>
                <input type="password" x-model="pass" placeholder="••••••••" class="bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[10px] rounded outline-none w-24">
            </div>
            <div class="flex flex-col">
                <span class="text-[9px] opacity-60">Port:</span>
                <input type="text" x-model="port" placeholder="22" class="bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 px-2 py-0.5 text-[10px] rounded outline-none w-12">
            </div>
            <button @click="isConnected ? disconnect() : connect()" 
                    class="mt-3 px-4 py-1 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 border border-gray-400 dark:border-gray-600 rounded text-[10px] transition-all flex items-center">
                <span x-text="isConnecting ? 'Connecting...' : (isConnected ? 'Disconnect' : 'Quickconnect')"></span>
            </button>
        </div>
    </div>

    <!-- Message Log Area -->
    <div class="h-32 bg-white dark:bg-black/40 border-b border-gray-300 dark:border-gray-800 p-2 overflow-y-auto font-mono text-[10px] space-y-0.5 custom-scrollbar shrink-0">
        <template x-for="log in logs">
            <div :class="{
                'text-green-600 dark:text-green-400': log.type === 'status' && log.text.includes('successful'),
                'text-blue-600 dark:text-blue-400': log.type === 'command',
                'text-red-600 dark:text-red-400': log.type === 'error'
            }" x-text="log.text"></div>
        </template>
    </div>

    <!-- File Explorer Split View -->
    <div class="flex-grow flex min-h-0">
        <!-- Local Site -->
        <div class="flex-1 flex flex-col border-r border-gray-300 dark:border-gray-800">
            <div class="h-6 bg-gray-100 dark:bg-[#252526] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center justify-between">
                <span class="text-[10px] font-semibold">Local site: <span class="font-normal opacity-70" x-text="localPath"></span></span>
            </div>
            <div class="flex-grow bg-white dark:bg-[#1e1e1e] overflow-y-auto custom-scrollbar">
                <div class="grid grid-cols-12 py-1 px-4 text-[10px] font-bold border-b border-gray-100 dark:border-white/5 opacity-60">
                    <div class="col-span-6">Filename</div>
                    <div class="col-span-3">Filesize</div>
                    <div class="col-span-3">Filetype</div>
                </div>
                <div class="text-[10px] divide-y divide-gray-100 dark:divide-white/5">
                    <div class="grid grid-cols-12 py-1 px-4 hover:bg-win-blue hover:text-white cursor-default">
                        <div class="col-span-6 flex items-center"><span class="mr-2">📁</span> assets</div>
                        <div class="col-span-3"></div>
                        <div class="col-span-3">File folder</div>
                    </div>
                    <div class="grid grid-cols-12 py-1 px-4 hover:bg-win-blue hover:text-white cursor-default">
                        <div class="col-span-6 flex items-center"><span class="mr-2">📁</span> partials</div>
                        <div class="col-span-3"></div>
                        <div class="col-span-3">File folder</div>
                    </div>
                    <div class="grid grid-cols-12 py-1 px-4 hover:bg-win-blue hover:text-white cursor-default">
                        <div class="col-span-6 flex items-center"><span class="mr-2">📄</span> index.php</div>
                        <div class="col-span-3">2 KB</div>
                        <div class="col-span-3">PHP File</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Remote Site -->
        <div class="flex-1 flex flex-col">
            <div class="h-6 bg-gray-100 dark:bg-[#252526] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center justify-between">
                <span class="text-[10px] font-semibold">Remote site: <span class="font-normal opacity-70" x-text="remotePath"></span></span>
            </div>
            <div class="flex-grow bg-white dark:bg-[#1e1e1e] overflow-y-auto custom-scrollbar relative">
                <template x-if="!isConnected">
                    <div class="absolute inset-0 flex items-center justify-center text-xs opacity-40">
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
                            <div class="grid grid-cols-12 py-1 px-4 hover:bg-win-blue hover:text-white cursor-default">
                                <div class="col-span-6 flex items-center"><span class="mr-2">📁</span> public_html</div>
                                <div class="col-span-3"></div>
                                <div class="col-span-3">0755</div>
                            </div>
                            <div class="grid grid-cols-12 py-1 px-4 hover:bg-win-blue hover:text-white cursor-default">
                                <div class="col-span-6 flex items-center"><span class="mr-2">📄</span> .htaccess</div>
                                <div class="col-span-3">1 KB</div>
                                <div class="col-span-3">0644</div>
                            </div>
                        </div>
                    </div>
                </template>
            </div>
        </div>
    </div>

    <!-- Status Bar -->
    <div class="h-6 border-t border-gray-300 dark:border-gray-800 bg-[#f0f0f0] dark:bg-[#2b2b2b] flex items-center px-4 justify-between text-[9px] opacity-60 shrink-0">
        <div>Ready</div>
        <div class="flex items-center space-x-4">
            <span>Server: sftp://devante@johnson-rose.co.uk</span>
            <span>Queue: 0 files</span>
        </div>
    </div>
</div>
