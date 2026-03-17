<!-- partials/apps/database.php -->
<div class="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden" x-data="databaseApp()">
    <!-- SSMS Toolbar -->
    <div class="h-9 bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 flex items-center px-2 space-x-1 shrink-0">
        <button class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1">
            <span class="text-[10px] font-semibold">New Query</span>
        </button>
        <div class="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>
        <button class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1 text-green-600" @click="executeQuery()">
            <span class="text-[10px] font-bold">▶ Execute</span>
        </button>
        <div class="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>
        <div class="flex items-center space-x-2 px-2">
            <div class="flex items-center space-x-1 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5">
                <img :src="window.portfolioConfig.imgPath + 'mssql.webp'" class="w-3 h-3 object-contain">
                <span class="text-[10px]">DeVante-Workstation</span>
            </div>
        </div>
    </div>

    <!-- Main Workspace -->
    <div class="flex-grow flex min-h-0">
        <!-- Object Explorer Sidebar -->
        <div class="w-64 border-r border-gray-300 dark:border-gray-800 flex flex-col bg-[#f0f0f0] dark:bg-[#252526] shrink-0 overflow-hidden">
            <div class="p-2 bg-gray-200 dark:bg-[#333333] text-[11px] font-semibold border-b border-gray-300 dark:border-gray-800 flex items-center justify-between">
                <span>Object Explorer</span>
                <button class="opacity-60">✕</button>
            </div>
            <div class="flex-grow overflow-y-auto p-2 font-['Segoe_UI'] text-[11px]">
                <div class="flex items-center space-x-1 cursor-default">
                    <span class="text-[10px] transform rotate-90 opacity-60">▶</span>
                    <img :src="window.portfolioConfig.imgPath + 'mssql.webp'" class="w-3.5 h-3.5 object-contain">
                    <span class="font-semibold">DeVante-DB (SQL Server 16.0)</span>
                </div>
                <div class="ml-4 mt-1 space-y-1">
                    <div class="flex items-center space-x-1 cursor-pointer hover:text-win-blue">
                        <span class="text-[10px] transform rotate-90 opacity-60">▶</span>
                        <span class="text-yellow-600">📁</span>
                        <span>Databases</span>
                    </div>
                    <div class="ml-4 space-y-1">
                        <div class="flex items-center space-x-1 cursor-pointer text-win-blue font-semibold">
                            <span class="text-[10px] transform rotate-90">▼</span>
                            <span class="text-yellow-600">🗄️</span>
                            <span>Portfolio_DB</span>
                        </div>
                        <div class="ml-4 space-y-1">
                            <div class="flex items-center space-x-1 cursor-pointer hover:text-win-blue" @click="activeTable = 'projects'">
                                <span class="text-blue-500">📊</span>
                                <span :class="activeTable === 'projects' ? 'font-bold underline' : ''">dbo.Projects</span>
                            </div>
                            <div class="flex items-center space-x-1 cursor-pointer hover:text-win-blue" @click="activeTable = 'experience'">
                                <span class="text-blue-500">📊</span>
                                <span :class="activeTable === 'experience' ? 'font-bold underline' : ''">dbo.Experience</span>
                            </div>
                            <div class="flex items-center space-x-1 cursor-pointer hover:text-win-blue" @click="activeTable = 'certifications'">
                                <span class="text-blue-500">📊</span>
                                <span :class="activeTable === 'certifications' ? 'font-bold underline' : ''">dbo.Certifications</span>
                            </div>
                            <div class="flex items-center space-x-1 cursor-pointer hover:text-win-blue" @click="activeTable = 'email_logs'">
                                <span class="text-blue-500">📊</span>
                                <span :class="activeTable === 'email_logs' ? 'font-bold underline' : ''">dbo.EmailLogs</span>
                            </div>
                        </div>
                    </div>
                    <div class="flex items-center space-x-1 cursor-default opacity-60">
                        <span class="text-[10px] opacity-60">▶</span>
                        <span class="text-yellow-600">📁</span>
                        <span>Security</span>
                    </div>
                    <div class="flex items-center space-x-1 cursor-default opacity-60">
                        <span class="text-[10px] opacity-60">▶</span>
                        <span class="text-yellow-600">📁</span>
                        <span>Server Objects</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Query & Results View -->
        <div class="flex-grow flex flex-col min-w-0 bg-white dark:bg-[#1e1e1e]">
            <!-- SQL Editor Area -->
            <div class="h-1/3 border-b border-gray-300 dark:border-gray-800 flex flex-col shrink-0">
                <div class="h-6 bg-gray-100 dark:bg-[#2d2d2d] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center text-[10px] space-x-2">
                    <span class="font-bold border-b-2 border-win-blue pb-0.5">SQLQuery1.sql</span>
                </div>
                <div class="flex-grow p-4 font-mono text-[13px] overflow-auto focus:outline-none" contenteditable="true" spellcheck="false">
                    <span class="text-blue-600 dark:text-blue-400 font-bold">SELECT</span> * <span class="text-blue-600 dark:text-blue-400 font-bold">FROM</span> <span class="text-green-600 dark:text-green-400">[Portfolio_DB].[dbo].[<span x-text="activeTable"></span>]</span>
                </div>
            </div>

            <!-- Results Area -->
            <div class="flex-grow flex flex-col min-h-0">
                <div class="h-6 bg-gray-100 dark:bg-[#2d2d2d] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center text-[10px] space-x-4">
                    <button class="font-bold border-b-2 border-win-blue pb-0.5">Results</button>
                    <button class="opacity-60">Messages</button>
                </div>
                
                <div class="flex-grow overflow-auto custom-scrollbar relative">
                    <template x-if="loading">
                        <div class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-20">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-win-blue"></div>
                        </div>
                    </template>

                    <template x-if="error">
                        <div class="p-4 text-red-500 font-mono text-xs">
                            <div class="font-bold mb-1">Msg 50000, Level 16, State 1</div>
                            <span x-text="error"></span>
                        </div>
                    </template>

                    <table x-show="!error" class="w-full text-left text-[11px] border-collapse min-w-max font-['Segoe_UI']">
                        <thead class="bg-gray-100 dark:bg-[#252526] sticky top-0 z-10">
                            <tr>
                                <th class="p-1 w-8 border border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-[#333]"></th>
                                <template x-for="col in columns" :key="col">
                                    <th class="p-1 px-3 border border-gray-300 dark:border-gray-700 font-normal" x-text="col"></th>
                                </template>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                            <template x-for="(row, idx) in tableData" :key="idx">
                                <tr class="hover:bg-win-blue/10">
                                    <td class="p-1 text-center bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-gray-700 opacity-60" x-text="idx + 1"></td>
                                    <template x-for="col in columns" :key="col">
                                        <td class="p-1 px-3 border border-gray-300 dark:border-gray-700 truncate max-w-[250px]" 
                                            :class="row[col] === null ? 'italic text-gray-400' : ''"
                                            x-text="row[col] === null ? 'NULL' : row[col]"></td>
                                    </template>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- SSMS Status Bar -->
    <div class="h-6 bg-[#0078d4] flex items-center px-2 shrink-0 text-white text-[10px] justify-between font-['Segoe_UI']">
        <div class="flex items-center space-x-4">
            <span class="flex items-center space-x-1">
                <span class="bg-green-400 w-2 h-2 rounded-full border border-white"></span>
                <span>Query executed successfully.</span>
            </span>
        </div>
        <div class="flex items-center space-x-4 divide-x divide-white/20">
            <span class="pl-4">DEVANTE-PC (16.0 RTM)</span>
            <span class="pl-4">sa (54)</span>
            <span class="pl-4">Portfolio_DB</span>
            <span class="pl-4" x-text="tableData.length + ' rows'"></span>
            <span class="pl-4">00:00:00</span>
        </div>
    </div>
</div>
