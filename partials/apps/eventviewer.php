<!-- partials/apps/eventviewer.php -->
<div class="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden" x-data="eventViewerApp()">
    <!-- Header -->
    <div class="h-9 bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 flex items-center px-2 sm:px-4 shrink-0 justify-between">
        <div class="flex items-center space-x-2 min-w-0 mr-2">
            <img :src="window.portfolioConfig.imgPath + 'eventviewer.webp'" class="w-4 h-4 object-contain shrink-0">
            <span class="text-[10px] sm:text-xs font-semibold truncate">Event Viewer (Local)</span>
        </div>
        <div class="flex items-center shrink-0">
            <select x-model="filter" class="bg-transparent border border-gray-300 dark:border-gray-700 rounded text-[9px] sm:text-[10px] px-1 sm:px-2 py-0.5 outline-none">
                <option value="All">All Events</option>
                <option value="Information">Information</option>
                <option value="Warning">Warning</option>
                <option value="Error">Error</option>
            </select>
        </div>
    </div>

    <div class="flex-grow flex min-h-0">
        <!-- Sidebar -->
        <div class="w-56 bg-white dark:bg-[#252526] border-r border-gray-300 dark:border-gray-800 flex flex-col shrink-0 hidden lg:flex">
            <div class="p-3 text-[11px] font-bold opacity-60 border-b border-gray-200 dark:border-gray-800">Console Tree</div>
            <div class="flex-grow overflow-y-auto py-2">
                <div class="px-4 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-win-blue font-medium flex items-center">
                    <span class="mr-2">📂</span> Windows Logs
                </div>
                <div class="pl-8 space-y-1 mt-1">
                    <div class="text-xs hover:bg-black/5 dark:hover:bg-white/5 py-1 px-2 rounded cursor-pointer">Application</div>
                    <div class="text-xs hover:bg-black/5 dark:hover:bg-white/5 py-1 px-2 rounded cursor-pointer font-bold">Security</div>
                    <div class="text-xs hover:bg-black/5 dark:hover:bg-white/5 py-1 px-2 rounded cursor-pointer">Setup</div>
                    <div class="text-xs hover:bg-black/5 dark:hover:bg-white/5 py-1 px-2 rounded cursor-pointer">System</div>
                </div>
            </div>
        </div>

        <!-- Main View -->
        <div class="flex-grow flex flex-col min-w-0">
            <!-- Log Table -->
            <div class="flex-grow flex flex-col min-h-0 bg-white dark:bg-[#1e1e1e]">
                <div class="grid grid-cols-4 sm:grid-cols-12 bg-gray-100 dark:bg-[#2d2d2d] py-1.5 px-4 text-[10px] sm:text-[11px] font-bold border-b border-gray-300 dark:border-gray-800 shrink-0 sticky top-0">
                    <div class="col-span-1 sm:col-span-2">Level</div>
                    <div class="col-span-1 sm:col-span-2">Time</div>
                    <div class="hidden sm:block sm:col-span-2">Source</div>
                    <div class="col-span-2 sm:col-span-6">Description</div>
                </div>
                <div class="flex-grow overflow-y-auto custom-scrollbar">
                    <template x-for="log in logs" :key="log.id">
                        <div @click="selectedLog = log"
                             :class="selectedLog?.id === log.id ? 'bg-blue-100 dark:bg-blue-900/40' : 'hover:bg-gray-50 dark:hover:bg-white/5'"
                             class="grid grid-cols-4 sm:grid-cols-12 py-1 px-4 text-[10px] sm:text-[11px] border-b border-gray-100 dark:border-white/5 cursor-pointer transition-colors">
                            <div class="col-span-1 sm:col-span-2 flex items-center">
                                <span :class="{
                                    'text-blue-500': log.level === 'Information',
                                    'text-yellow-500': log.level === 'Warning',
                                    'text-red-500': log.level === 'Error'
                                }" class="mr-1 sm:mr-2" x-text="log.level === 'Information' ? 'ℹ️' : log.level === 'Warning' ? '⚠️' : '❌'"></span>
                                <span class="hidden sm:inline" x-text="log.level"></span>
                            </div>
                            <div class="col-span-1 sm:col-span-2 text-gray-500 truncate" x-text="log.time"></div>
                            <div class="hidden sm:block sm:col-span-2 truncate" x-text="log.source"></div>
                            <div class="col-span-2 sm:col-span-6 truncate" x-text="log.description"></div>
                        </div>
                    </template>
                </div>
            </div>

            <!-- Detail Pane -->
            <div class="h-40 sm:h-48 bg-gray-50 dark:bg-[#252526] border-t border-gray-300 dark:border-gray-800 p-3 sm:p-4 overflow-y-auto shrink-0">
                <template x-if="selectedLog">
                    <div class="space-y-3">
                        <div class="text-[10px] sm:text-[11px] font-bold uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700 pb-1 mb-2">General Details</div>
                        <div class="text-[11px] sm:text-xs leading-relaxed" x-text="selectedLog.description"></div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-[9px] sm:text-[10px] text-gray-500 mt-4">
                            <div class="flex sm:block space-x-2 sm:space-x-0">
                                <span class="font-bold uppercase shrink-0">Log Name:</span>
                                <span class="truncate">Security</span>
                            </div>
                            <div class="flex sm:block space-x-2 sm:space-x-0">
                                <span class="font-bold uppercase shrink-0">Source:</span>
                                <span class="truncate" x-text="selectedLog.source"></span>
                            </div>
                            <div class="flex sm:block space-x-2 sm:space-x-0">
                                <span class="font-bold uppercase shrink-0">Logged:</span>
                                <span class="truncate" x-text="selectedLog.date + ' ' + selectedLog.time"></span>
                            </div>
                            <div class="flex sm:block space-x-2 sm:space-x-0">
                                <span class="font-bold uppercase shrink-0">Computer:</span>
                                <span class="truncate">DeVante-Workstation</span>
                            </div>
                        </div>
                    </div>
                </template>
                <template x-if="!selectedLog">
                    <div class="h-full flex items-center justify-center text-xs opacity-40">
                        Select an event to view its details
                    </div>
                </template>
            </div>
        </div>
    </div>
</div>
