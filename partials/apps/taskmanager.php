<!-- partials/apps/taskmanager.php -->
<div class="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden" x-data="taskManagerApp()">
    <!-- Header -->
    <div class="h-10 border-b border-black/10 dark:border-white/10 flex items-center px-4 shrink-0">
        <div class="flex items-center space-x-3">
            <div class="w-5 h-5 bg-win-blue rounded flex items-center justify-center">
                <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <h1 class="text-sm font-semibold">Task Manager</h1>
        </div>
    </div>

    <!-- Stats Bar -->
    <div class="grid grid-cols-4 border-b border-black/10 dark:border-white/10 shrink-0">
        <div class="p-4 border-r border-black/10 dark:border-white/10">
            <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">CPU Usage</div>
            <div class="flex items-end space-x-2">
                <span class="text-2xl font-light" x-text="cpu + '%'"></span>
                <div class="flex-grow h-1.5 bg-black/5 dark:bg-white/5 rounded-full mb-2 overflow-hidden">
                    <div class="h-full bg-win-blue transition-all duration-1000" :style="`width: ${cpu}%`"></div>
                </div>
            </div>
        </div>
        <div class="p-4 border-r border-black/10 dark:border-white/10">
            <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Memory</div>
            <div class="flex items-end space-x-2">
                <span class="text-2xl font-light" x-text="(ram / 1024).toFixed(1) + ' GB'"></span>
                <div class="flex-grow h-1.5 bg-black/5 dark:bg-white/5 rounded-full mb-2 overflow-hidden">
                    <div class="h-full bg-win-blue transition-all duration-1000" :style="`width: ${(ram/16384)*100}%`"></div>
                </div>
            </div>
        </div>
        <div class="p-4 border-r border-black/10 dark:border-white/10">
            <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Network</div>
            <div class="flex items-end space-x-2">
                <span class="text-2xl font-light" x-text="network + ' Mbps'"></span>
                <div class="flex-grow h-1.5 bg-black/5 dark:bg-white/5 rounded-full mb-2 overflow-hidden text-right">
                    <div class="h-full bg-win-blue transition-all duration-500 ml-auto" :style="`width: ${Math.min(100, (network/10)*100)}%`"></div>
                </div>
            </div>
        </div>
        <div class="p-4">
            <div class="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Uptime</div>
            <div class="text-2xl font-light" x-text="uptime"></div>
        </div>
    </div>

    <!-- Process List Header -->
    <div class="grid grid-cols-12 bg-black/5 dark:bg-white/5 py-2 px-4 text-[11px] font-bold text-gray-500 shrink-0">
        <div class="col-span-5">Name</div>
        <div class="col-span-2 text-right">Status</div>
        <div class="col-span-1 text-right">CPU</div>
        <div class="col-span-2 text-right">Memory</div>
        <div class="col-span-2 text-right">Network</div>
    </div>

    <!-- Process List -->
    <div class="flex-grow overflow-y-auto custom-scrollbar">
        <template x-for="p in processes" :key="p.id">
            <div class="grid grid-cols-12 py-1.5 px-4 text-[12px] hover:bg-win-blue/10 border-b border-black/5 dark:border-white/5 group transition-colors">
                <div class="col-span-5 flex items-center text-black dark:text-white">
                    <span class="w-4 h-4 mr-2 flex items-center justify-center shrink-0" x-html="p.icon"></span>
                    <span x-text="p.name" class="truncate font-medium"></span>
                    <button @click="endTask(p.id)" class="ml-2 hidden group-hover:block text-[10px] text-red-500 hover:text-white hover:bg-red-500 font-bold px-1.5 py-0.5 border border-red-500/20 rounded">End Task</button>
                </div>
                <div class="col-span-2 text-right opacity-60" x-text="p.status"></div>
                <div class="col-span-1 text-right opacity-80" x-text="p.cpu + '%'"></div>
                <div class="col-span-2 text-right opacity-80" x-text="p.ram + ' MB'"></div>
                <div class="col-span-2 text-right opacity-80 text-win-blue" x-text="p.network > 0 ? p.network + ' Mbps' : '0 Mbps'"></div>
            </div>
        </template>
        
        <!-- System Processes -->
        <div class="grid grid-cols-12 py-1.5 px-4 text-[12px] opacity-40 italic border-b border-black/5 dark:border-white/5">
            <div class="col-span-5">System Idle Process</div>
            <div class="col-span-2 text-right">Running</div>
            <div class="col-span-1 text-right" x-text="(100-cpu) + '%'"></div>
            <div class="col-span-2 text-right">0 MB</div>
            <div class="col-span-2 text-right">0 Mbps</div>
        </div>
        <div class="grid grid-cols-12 py-1.5 px-4 text-[12px] opacity-60 border-b border-black/5 dark:border-white/5 text-black dark:text-white">
            <div class="col-span-5">Desktop Window Manager</div>
            <div class="col-span-2 text-right">Running</div>
            <div class="col-span-1 text-right">1.2%</div>
            <div class="col-span-2 text-right">42.5 MB</div>
            <div class="col-span-2 text-right">0.1 Mbps</div>
        </div>
        <div class="grid grid-cols-12 py-1.5 px-4 text-[12px] opacity-60 border-b border-black/5 dark:border-white/5 text-black dark:text-white">
            <div class="col-span-5">Windows Explorer</div>
            <div class="col-span-2 text-right">Running</div>
            <div class="col-span-1 text-right">0.5%</div>
            <div class="col-span-2 text-right">84.1 MB</div>
            <div class="col-span-2 text-right">0 Mbps</div>
        </div>
    </div>
    
    <!-- Footer -->
    <div class="h-8 border-t border-black/10 dark:border-white/10 flex items-center px-4 shrink-0 justify-between">
        <span class="text-[10px] text-gray-500" x-text="'Processes: ' + (processes.length + 42)"></span>
        <button class="text-[10px] text-win-blue hover:underline">Fewer details</button>
    </div>
</div>
