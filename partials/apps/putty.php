<!-- partials/apps/putty.php -->
<div class="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden" x-data="{ activeSession: null }">
    <div class="flex-grow flex p-4 space-x-6">
        <!-- Category Sidebar -->
        <div class="w-48 flex flex-col space-y-1">
            <div class="text-[11px] font-semibold mb-2 opacity-60 uppercase tracking-wider">Category:</div>
            <div class="border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 rounded-sm p-1 h-64 overflow-y-auto">
                <div class="text-[11px] space-y-0.5">
                    <div class="flex items-center space-x-1 cursor-pointer hover:bg-win-blue hover:text-white px-1">
                        <span>▼</span> <span>Session</span>
                    </div>
                    <div class="ml-4 space-y-0.5 opacity-70">
                        <div class="cursor-pointer hover:bg-win-blue hover:text-white px-1">Logging</div>
                    </div>
                    <div class="flex items-center space-x-1 cursor-pointer hover:bg-win-blue hover:text-white px-1">
                        <span>▶</span> <span>Terminal</span>
                    </div>
                    <div class="flex items-center space-x-1 cursor-pointer hover:bg-win-blue hover:text-white px-1">
                        <span>▶</span> <span>Window</span>
                    </div>
                    <div class="flex items-center space-x-1 cursor-pointer hover:bg-win-blue hover:text-white px-1 font-bold">
                        <span>▶</span> <span>Connection</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Session Configuration -->
        <div class="flex-grow flex flex-col space-y-4">
            <div class="border border-gray-300 dark:border-gray-700 rounded-sm p-4 relative bg-white/50 dark:bg-white/5">
                <span class="absolute -top-2.5 left-4 bg-[#f0f0f0] dark:bg-[#1c1c1c] px-2 text-[11px] font-semibold">Basic options for your PuTTY session</span>
                
                <div class="space-y-4 pt-2">
                    <div class="flex flex-col space-y-1">
                        <label class="text-[11px]">Host Name (or IP address)</label>
                        <input type="text" value="192.168.1.15" class="bg-white dark:bg-black/40 border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs outline-none focus:border-win-blue">
                    </div>
                    
                    <div class="flex space-x-4">
                        <div class="flex flex-col space-y-1 w-24">
                            <label class="text-[11px]">Port</label>
                            <input type="text" value="22" class="bg-white dark:bg-black/40 border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs outline-none">
                        </div>
                        <div class="flex flex-col space-y-1">
                            <label class="text-[11px]">Connection type:</label>
                            <div class="flex space-x-3 text-[11px] pt-1">
                                <label class="flex items-center space-x-1"><input type="radio" checked> <span>SSH</span></label>
                                <label class="flex items-center space-x-1"><input type="radio"> <span>Serial</span></label>
                                <label class="flex items-center space-x-1"><input type="radio"> <span>Telnet</span></label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="border border-gray-300 dark:border-gray-700 rounded-sm p-4 relative bg-white/50 dark:bg-white/5 flex-grow">
                <span class="absolute -top-2.5 left-4 bg-[#f0f0f0] dark:bg-[#1c1c1c] px-2 text-[11px] font-semibold">Load, save or delete a stored session</span>
                
                <div class="flex flex-col space-y-2 h-full pt-2">
                    <label class="text-[11px]">Saved Sessions</label>
                    <div class="flex space-x-2">
                        <input type="text" x-model="activeSession" placeholder="Default Settings" class="flex-grow bg-white dark:bg-black/40 border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs outline-none">
                        <button class="px-4 py-1 bg-gray-200 dark:bg-white/10 border border-gray-400 dark:border-gray-600 rounded-sm text-[11px] hover:bg-gray-300">Save</button>
                    </div>
                    <div class="flex-grow border border-gray-300 dark:border-gray-700 bg-white dark:bg-black/20 rounded-sm overflow-y-auto">
                        <div class="text-xs">
                            <div @click="activeSession = 'Production VPS'" :class="activeSession === 'Production VPS' ? 'bg-win-blue text-white' : 'hover:bg-gray-100 dark:hover:bg-white/5'" class="px-2 py-1 cursor-pointer">Production VPS (CentOS 9)</div>
                            <div @click="activeSession = 'SQL Server Node'" :class="activeSession === 'SQL Server Node' ? 'bg-win-blue text-white' : 'hover:bg-gray-100 dark:hover:bg-white/5'" class="px-2 py-1 cursor-pointer">SQL Server Node (Ubuntu 22.04)</div>
                            <div @click="activeSession = 'Web Cluster 01'" :class="activeSession === 'Web Cluster 01' ? 'bg-win-blue text-white' : 'hover:bg-gray-100 dark:hover:bg-white/5'" class="px-2 py-1 cursor-pointer">Web Cluster 01 (Nginx/PHP-FPM)</div>
                            <div @click="activeSession = 'Dev Environment'" :class="activeSession === 'Dev Environment' ? 'bg-win-blue text-white' : 'hover:bg-gray-100 dark:hover:bg-white/5'" class="px-2 py-1 cursor-pointer">Dev Environment (Docker Host)</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- PuTTY Actions -->
    <div class="h-12 border-t border-gray-300 dark:border-gray-800 bg-[#f0f0f0] dark:bg-[#2b2b2b] flex items-center px-4 justify-end space-x-2 shrink-0">
        <button @click="openApp('terminal', activeSession || 'PuTTY Terminal')" class="px-6 py-1.5 bg-win-blue text-white border border-blue-700 rounded-sm text-xs font-semibold hover:bg-blue-600 shadow-sm transition-all active:scale-95">Open</button>
        <button class="px-6 py-1.5 bg-gray-200 dark:bg-white/10 border border-gray-400 dark:border-gray-600 rounded-sm text-xs hover:bg-gray-300">Cancel</button>
        <button class="px-6 py-1.5 bg-gray-200 dark:bg-white/10 border border-gray-400 dark:border-gray-600 rounded-sm text-xs hover:bg-gray-300">About</button>
    </div>
</div>
