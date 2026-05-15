<!-- partials/apps/database.php — 1:1 with v2/src/apps/database/Database.tsx.
     Real SQL-ish editor; the parser + executor live in window.PortfolioSQL
     (assets/js/components/apps/database-sql.js). -->
<div class="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#1c1c1c] text-black dark:text-white select-none overflow-hidden"
     style="font-family: 'Segoe UI', sans-serif;"
     x-data="databaseApp()" x-init="init()">

    <!-- SSMS toolbar -->
    <div class="h-9 bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 flex items-center px-2 space-x-1 shrink-0">
        <button type="button" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1">
            <span class="text-[10px] font-semibold">New Query</span>
        </button>
        <div class="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>
        <button type="button" @click="runQuery()" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1 text-green-600">
            <span class="text-[10px] font-bold">▶ Execute</span>
        </button>
        <button type="button" @click="helpOpen = !helpOpen" class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/5 flex items-center space-x-1">
            <span class="text-[10px]">💡 Examples</span>
        </button>
        <div class="w-px h-6 bg-gray-300 dark:bg-gray-700 mx-1"></div>
        <div class="flex items-center space-x-2 px-2">
            <div class="flex items-center space-x-1 bg-gray-100 dark:bg-black/20 border border-gray-300 dark:border-gray-700 rounded px-2 py-0.5">
                <img :src="window.portfolioConfig.imgPath + 'mssql.webp'" alt="" class="w-3 h-3 object-contain">
                <span class="text-[10px]">DeVante-Workstation · Portfolio_DB</span>
            </div>
        </div>
        <div class="ml-auto text-[10px] opacity-60 pr-2 hidden sm:block">
            Read-only · client-side SELECT engine
        </div>
    </div>

    <!-- Examples drawer -->
    <div x-show="helpOpen" x-cloak class="bg-gray-50 dark:bg-[#252526] border-b border-gray-300 dark:border-gray-800 px-3 py-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-1.5 text-[10px] shrink-0">
        <template x-for="ex in EXAMPLES" :key="ex.sql">
            <button type="button" @click="runExample(ex.sql)"
                    :title="ex.sql"
                    class="text-left p-2 rounded hover:bg-white dark:hover:bg-white/5 border border-gray-200 dark:border-gray-700">
                <div class="font-semibold" x-text="ex.label"></div>
                <div class="opacity-60 truncate font-mono" x-text="ex.sql"></div>
            </button>
        </template>
    </div>

    <!-- Workspace -->
    <div class="flex-grow flex min-h-0">
        <!-- Object Explorer -->
        <div class="w-64 border-r border-gray-300 dark:border-gray-800 flex flex-col bg-[#f0f0f0] dark:bg-[#252526] shrink-0 overflow-hidden">
            <div class="p-2 bg-gray-200 dark:bg-[#333333] text-[11px] font-semibold border-b border-gray-300 dark:border-gray-800 flex items-center justify-between">
                <span>Object Explorer</span>
                <button type="button" class="opacity-60">✕</button>
            </div>
            <div class="flex-grow overflow-y-auto p-2 text-[11px]">
                <div class="flex items-center space-x-1 cursor-default">
                    <span class="text-[10px] transform rotate-90 opacity-60">▶</span>
                    <img :src="window.portfolioConfig.imgPath + 'mssql.webp'" alt="" class="w-3.5 h-3.5 object-contain">
                    <span class="font-semibold">DeVante-DB (SQL Server 16.0)</span>
                </div>
                <div class="ml-4 mt-1 space-y-1">
                    <div class="flex items-center space-x-1 cursor-pointer hover:text-win-blue">
                        <span class="text-[10px] transform rotate-90 opacity-60">▶</span>
                        <span class="text-yellow-600">📁</span>
                        <span>Databases</span>
                    </div>
                    <div class="ml-4 space-y-1">
                        <div class="flex items-center space-x-1 text-win-blue font-semibold">
                            <span class="text-[10px] transform rotate-90">▼</span>
                            <span class="text-yellow-600">🗄️</span>
                            <span>Portfolio_DB</span>
                        </div>
                        <div class="ml-4 space-y-1">
                            <template x-for="t in TABLES" :key="t.id">
                                <button type="button" @click="pickTable(t.id)"
                                        class="w-full text-left flex items-center space-x-1 cursor-pointer hover:text-win-blue">
                                    <span class="text-blue-500">📊</span>
                                    <span :class="activeTable === t.id ? 'font-bold underline' : ''" x-text="t.label"></span>
                                </button>
                            </template>
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

        <!-- Query + results -->
        <div class="flex-grow flex flex-col min-w-0 bg-white dark:bg-[#1e1e1e]">
            <!-- SQL editor -->
            <div class="h-1/3 border-b border-gray-300 dark:border-gray-800 flex flex-col shrink-0">
                <div class="h-6 bg-gray-100 dark:bg-[#2d2d2d] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center text-[10px] space-x-2">
                    <span class="font-bold border-b-2 border-win-blue pb-0.5">SQLQuery1.sql</span>
                </div>
                <textarea x-model="query"
                          @keydown.f5.prevent="runQuery()"
                          @keydown.enter.cmd.prevent="runQuery()"
                          @keydown.enter.ctrl.prevent="runQuery()"
                          spellcheck="false"
                          aria-label="SQL query editor"
                          class="flex-grow w-full p-4 font-mono text-[13px] outline-none resize-none bg-white dark:bg-[#1e1e1e] text-black dark:text-white"></textarea>
            </div>

            <!-- Results -->
            <div class="flex-grow flex flex-col min-h-0">
                <div class="h-6 bg-gray-100 dark:bg-[#2d2d2d] border-b border-gray-300 dark:border-gray-800 px-2 flex items-center text-[10px] space-x-4">
                    <button type="button" @click="resultsTab = 'results'"
                            :class="resultsTab === 'results' ? 'font-bold border-b-2 border-win-blue pb-0.5' : 'opacity-60'">Results</button>
                    <button type="button" @click="resultsTab = 'messages'"
                            :class="resultsTab === 'messages' ? 'font-bold border-b-2 border-win-blue pb-0.5' : 'opacity-60'">Messages</button>
                </div>

                <div class="flex-grow overflow-auto relative">
                    <div x-show="loading" x-cloak class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-20">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-win-blue"></div>
                    </div>

                    <template x-if="error && resultsTab === 'results'">
                        <div class="p-4 text-red-500 font-mono text-xs">
                            <div class="font-bold mb-1">Msg 50000, Level 16, State 1</div>
                            <span x-text="error"></span>
                        </div>
                    </template>

                    <template x-if="resultsTab === 'messages'">
                        <div class="p-4 font-mono text-xs">
                            <template x-if="error"><span class="text-red-500" x-text="error"></span></template>
                            <template x-if="!error && results">
                                <span x-text="`(${rowCount} row${rowCount === 1 ? '' : 's'} affected) · ${results.elapsed.toFixed(1)} ms`"></span>
                            </template>
                            <template x-if="!error && !results"><span>Awaiting query…</span></template>
                        </div>
                    </template>

                    <template x-if="!error && resultsTab === 'results' && results">
                        <table class="w-full text-left text-[11px] border-collapse min-w-max">
                            <thead class="bg-gray-100 dark:bg-[#252526] sticky top-0 z-10">
                                <tr>
                                    <th class="p-1 w-8 border border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-[#333]"></th>
                                    <template x-for="col in results.columns" :key="col">
                                        <th class="p-1 px-3 border border-gray-300 dark:border-gray-700 font-normal" x-text="col"></th>
                                    </template>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-200 dark:divide-gray-800">
                                <template x-for="(row, idx) in results.rows" :key="idx">
                                    <tr class="hover:bg-win-blue/10">
                                        <td class="p-1 text-center bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-gray-700 opacity-60" x-text="idx + 1"></td>
                                        <template x-for="col in results.columns" :key="col">
                                            <td :class="row[col] === null ? 'italic text-gray-400' : ''"
                                                :title="row[col] === null ? 'NULL' : String(row[col])"
                                                class="p-1 px-3 border border-gray-300 dark:border-gray-700 truncate max-w-[300px]"
                                                x-text="row[col] === null ? 'NULL' : String(row[col])"></td>
                                        </template>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </template>
                </div>
            </div>
        </div>
    </div>

    <!-- Status bar -->
    <div class="h-6 bg-[#0078d4] flex items-center px-2 shrink-0 text-white text-[10px] justify-between">
        <div class="flex items-center space-x-4">
            <span class="flex items-center space-x-1">
                <span :class="error ? 'bg-red-400' : 'bg-green-400'" class="w-2 h-2 rounded-full border border-white"></span>
                <span x-text="error ? 'Query failed.' : (loading ? 'Executing query...' : 'Query executed successfully.')"></span>
            </span>
        </div>
        <div class="flex items-center space-x-4 divide-x divide-white/20">
            <span class="pl-4">DEVANTE-PC (16.0 RTM)</span>
            <span class="pl-4">sa (54)</span>
            <span class="pl-4">Portfolio_DB</span>
            <span class="pl-4" x-text="`${rowCount} rows`"></span>
            <span class="pl-4" x-text="elapsedLabel"></span>
        </div>
    </div>
</div>
