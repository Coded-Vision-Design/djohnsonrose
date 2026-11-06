<!-- partials/apps/docker.php - Docker Desktop style. The lists come from data/devtools.json, as in v2. -->
<div class="h-full flex flex-col bg-[#0d1117] text-[#e6edf3] select-none overflow-hidden font-['Segoe_UI',sans-serif]" data-docker
     x-data="dockerApp(<?php echo htmlspecialchars(js_value(load_shared_data('devtools')['docker'] ?? []), ENT_QUOTES, 'UTF-8'); ?>)">
    <!-- Docker Desktop title bar -->
    <div class="h-9 bg-[#161b22] border-b border-[#30363d] flex items-center px-3 shrink-0 gap-2">
        <button type="button" @click="navOpen = !navOpen" :aria-expanded="navOpen" aria-label="Navigation"
                class="md:hidden p-1 -ml-1 rounded-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d]">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        <div class="flex items-center gap-2 min-w-0">
            <img :src="window.portfolioConfig.imgPath + 'docker.webp'" alt="" class="w-5 h-5 object-contain">
            <span class="text-[13px] font-semibold text-[#e6edf3] truncate">Docker Desktop</span>
        </div>
        <div class="flex-1"></div>
        <div class="flex items-center gap-1 text-[11px] text-[#8b949e] shrink-0">
            <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-500"></span> Engine running</span>
        </div>
    </div>

    <div class="flex-1 flex min-h-0 relative">
        <!-- Sidebar: beside the content on wide screens, over it on phones -->
        <aside x-show="navOpen" x-cloak
               class="w-52 max-w-[85%] bg-[#161b22] border-r border-[#30363d] flex flex-col shrink-0 absolute md:static inset-y-0 left-0 z-30 shadow-xl md:shadow-none">
            <nav class="p-2 space-y-0.5" aria-label="Docker">
                <template x-for="item in [
                    ['containers', 'Containers', 'M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2'],
                    ['images', 'Images', 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14'],
                    ['volumes', 'Volumes', 'M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4'],
                ]" :key="item[0]">
                    <button type="button" @click="showView(item[0])"
                            :class="activeView === item[0] ? 'bg-[#21262d] text-[#58a6ff]' : 'text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]'"
                            class="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-[13px] transition-colors">
                        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" :d="item[2]"></path></svg>
                        <span x-text="item[1]"></span>
                    </button>
                </template>
            </nav>
            <div class="mt-auto p-2 border-t border-[#30363d]">
                <div class="text-[10px] text-[#8b949e] px-2" x-text="engine"></div>
            </div>
        </aside>

        <!-- Main content -->
        <div class="flex-1 flex flex-col min-w-0 overflow-hidden">
            <!-- Containers view -->
            <template x-if="activeView === 'containers'">
                <div class="flex-1 flex flex-col min-h-0">
                    <div class="px-4 py-3 border-b border-[#30363d] flex flex-wrap items-center justify-between gap-2">
                        <h1 class="text-[15px] font-semibold text-[#e6edf3]">Containers</h1>
                        <div class="relative w-full sm:w-56">
                            <input type="text" x-model="searchQuery" placeholder="Search containers..." aria-label="Search containers"
                                   class="bg-[#21262d] border border-[#30363d] rounded-md pl-8 pr-3 py-1.5 text-[12px] text-[#e6edf3] placeholder-[#8b949e] w-full focus:outline-hidden focus:ring-1 focus:ring-[#58a6ff] focus:border-[#58a6ff]">
                            <svg class="w-4 h-4 text-[#8b949e] absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                    </div>

                    <!-- Container table -->
                    <div class="flex-1 overflow-auto">
                        <table class="w-full text-left text-[12px] border-collapse min-w-max">
                            <thead class="bg-[#161b22] sticky top-0 z-10 border-b border-[#30363d]">
                                <tr>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Name</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Image</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Status</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Ports</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Created</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e] w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template x-for="c in filteredContainers" :key="c.id">
                                    <tr class="border-b border-[#21262d] hover:bg-[#161b22]/80 transition-colors cursor-default" :class="{ 'bg-[#21262d]/50': selectedId === c.id }" @click="selectedId = c.id">
                                        <td class="py-2 px-4">
                                            <div class="flex items-center gap-2">
                                                <span class="w-2 h-2 rounded-full shrink-0" :class="c.status === 'running' ? 'bg-green-500' : 'bg-[#8b949e]'"></span>
                                                <span class="font-medium text-[#e6edf3]" data-container-name x-text="c.name"></span>
                                            </div>
                                            <div class="text-[10px] text-[#8b949e] font-mono mt-0.5" x-text="c.id"></div>
                                        </td>
                                        <td class="py-2 px-4 text-[#8b949e]" x-text="c.image"></td>
                                        <td class="py-2 px-4">
                                            <span class="inline-flex items-center gap-1" :class="c.status === 'running' ? 'text-green-400' : 'text-[#8b949e]'" x-text="c.statusLabel"></span>
                                        </td>
                                        <td class="py-2 px-4 font-mono text-[11px] text-[#8b949e]" x-text="c.ports || '-'"></td>
                                        <td class="py-2 px-4 text-[#8b949e]" x-text="c.created"></td>
                                        <td class="py-2 px-4" @click.stop>
                                            <div class="flex items-center gap-1">
                                                <template x-if="c.status === 'running'">
                                                    <button type="button" @click="act(c, 'stop')" class="px-2 py-1 rounded-sm text-[10px] font-medium bg-[#21262d] hover:bg-red-500/20 text-red-400 border border-[#30363d] hover:border-red-500/50 transition-colors">Stop</button>
                                                </template>
                                                <template x-if="c.status !== 'running'">
                                                    <button type="button" @click="act(c, 'start')" class="px-2 py-1 rounded-sm text-[10px] font-medium bg-[#21262d] hover:bg-green-500/20 text-green-400 border border-[#30363d] hover:border-green-500/50 transition-colors">Start</button>
                                                </template>
                                                <button type="button" @click="act(c, 'restart')" :disabled="c.status !== 'running'" class="px-2 py-1 rounded-sm text-[10px] font-medium bg-[#21262d] hover:bg-[#58a6ff]/20 text-[#58a6ff] border border-[#30363d] disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Restart</button>
                                            </div>
                                        </td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>

                    <!-- Container details (Logs / Inspect) when selected -->
                    <template x-if="selectedContainer">
                        <div class="border-t border-[#30363d] bg-[#0d1117] shrink-0">
                            <div class="flex items-center justify-between px-4 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                                <div class="flex items-center gap-3">
                                    <span class="text-[11px] font-medium text-[#e6edf3]" x-text="selectedContainer.name"></span>
                                    <button type="button" @click="containerDetailTab = 'logs'" :class="containerDetailTab === 'logs' ? 'text-[#58a6ff] border-b border-[#58a6ff]' : 'text-[#8b949e] hover:text-[#e6edf3]'" class="text-[10px] pb-0.5">Logs</button>
                                    <button type="button" @click="containerDetailTab = 'inspect'" :class="containerDetailTab === 'inspect' ? 'text-[#58a6ff] border-b border-[#58a6ff]' : 'text-[#8b949e] hover:text-[#e6edf3]'" class="text-[10px] pb-0.5">Inspect</button>
                                </div>
                                <button type="button" @click="selectedId = null" class="text-[#8b949e] hover:text-[#e6edf3] text-[10px]">Close</button>
                            </div>
                            <div class="p-3 font-mono text-[11px] min-h-[60px] max-h-28 overflow-y-auto custom-scrollbar text-[#8b949e]">
                                <template x-if="containerDetailTab === 'logs'">
                                    <div class="space-y-0.5">
                                        <template x-for="(line, index) in containerLogs" :key="index">
                                            <div x-text="line"></div>
                                        </template>
                                    </div>
                                </template>
                                <template x-if="containerDetailTab === 'inspect'">
                                    <pre class="whitespace-pre-wrap text-[10px]" x-text="containerInspect"></pre>
                                </template>
                            </div>
                        </div>
                    </template>

                    <!-- CLI output panel (realistic last command) -->
                    <div class="border-t border-[#30363d] bg-[#0d1117] shrink-0">
                        <div class="flex items-center justify-between px-4 py-1.5 bg-[#161b22] border-b border-[#30363d]">
                            <span class="text-[11px] font-medium text-[#8b949e]">Last command</span>
                            <button type="button" @click="cliOutput = []; lastCommand = ''" class="text-[10px] text-[#8b949e] hover:text-[#e6edf3]">Clear</button>
                        </div>
                        <div class="p-3 font-mono text-[11px] text-[#8b949e] min-h-[72px] max-h-32 overflow-y-auto custom-scrollbar">
                            <template x-if="lastCommand">
                                <div class="space-y-1">
                                    <div class="text-[#e6edf3]"><span class="text-green-400">$</span> <span x-text="lastCommand"></span></div>
                                    <template x-for="(line, index) in cliOutput" :key="index">
                                        <div :class="line.type === 'error' ? 'text-red-400' : 'text-[#8b949e]'" x-text="line.text"></div>
                                    </template>
                                </div>
                            </template>
                            <template x-if="!lastCommand">
                                <div class="text-[#8b949e]">Run Start or Stop on a container to see the equivalent docker command.</div>
                            </template>
                        </div>
                    </div>
                </div>
            </template>

            <!-- Images view -->
            <template x-if="activeView === 'images'">
                <div class="flex-1 flex flex-col min-h-0 p-4">
                    <h1 class="text-[15px] font-semibold text-[#e6edf3] mb-3">Images</h1>
                    <div class="overflow-auto">
                        <table class="w-full text-left text-[12px] border-collapse min-w-max">
                            <thead class="bg-[#161b22] border-b border-[#30363d]">
                                <tr>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Image</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Tag</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Image ID</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Created</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template x-for="image in images" :key="image.id">
                                    <tr class="border-b border-[#21262d] hover:bg-[#161b22]/80">
                                        <td class="py-2 px-4 text-[#e6edf3]" x-text="image.name"></td>
                                        <td class="py-2 px-4 text-[#8b949e]" x-text="image.tag"></td>
                                        <td class="py-2 px-4 font-mono text-[#8b949e]" x-text="image.id"></td>
                                        <td class="py-2 px-4 text-[#8b949e]" x-text="image.created"></td>
                                        <td class="py-2 px-4 text-[#8b949e]" x-text="image.size"></td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                </div>
            </template>

            <!-- Volumes view -->
            <template x-if="activeView === 'volumes'">
                <div class="flex-1 flex flex-col min-h-0 p-4">
                    <h1 class="text-[15px] font-semibold text-[#e6edf3] mb-3">Volumes</h1>
                    <div class="overflow-auto">
                        <table class="w-full text-left text-[12px] border-collapse min-w-max">
                            <thead class="bg-[#161b22] border-b border-[#30363d]">
                                <tr>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Name</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Driver</th>
                                    <th class="py-2.5 px-4 font-medium text-[#8b949e]">Mountpoint</th>
                                </tr>
                            </thead>
                            <tbody>
                                <template x-for="volume in volumes" :key="volume.name">
                                    <tr class="border-b border-[#21262d] hover:bg-[#161b22]/80">
                                        <td class="py-2 px-4 text-[#e6edf3]" x-text="volume.name"></td>
                                        <td class="py-2 px-4 text-[#8b949e]" x-text="volume.driver"></td>
                                        <td class="py-2 px-4 font-mono text-[#8b949e] text-[10px]" x-text="volume.mountpoint"></td>
                                    </tr>
                                </template>
                            </tbody>
                        </table>
                    </div>
                </div>
            </template>
        </div>
    </div>
</div>
