<!-- partials/apps/vscode.php -->
<div class="h-full flex bg-[#1e1e1e] text-[#cccccc] font-sans overflow-hidden select-none" x-data="vscodeApp()">
    <!-- Activity Bar -->
    <div class="w-12 flex flex-col items-center py-4 space-y-4 bg-[#333333] shrink-0">
        <div class="p-2 text-white opacity-100 border-l-2 border-white cursor-pointer"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8L19.2 7.5 12 11.1 4.8 7.5 12 4.8zm-7.2 5.1l6.2 3.1v6.2l-6.2-3.1v-6.2zm8.2 9.3v-6.2l6.2-3.1v6.2l-6.2 3.1z"/></svg></div>
        <div class="p-2 opacity-50 hover:opacity-100 cursor-pointer"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg></div>
        <div class="p-2 opacity-50 hover:opacity-100 cursor-pointer"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/></svg></div>
        <div class="mt-auto p-2 opacity-50 hover:opacity-100 cursor-pointer"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
        <div class="p-2 opacity-50 hover:opacity-100 cursor-pointer"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L3.34 8.88c-.11.2-.06.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg></div>
    </div>

    <!-- Side Bar -->
    <div class="w-60 bg-[#252526] shrink-0 flex flex-col hidden md:flex">
        <div class="h-9 px-4 flex items-center justify-between text-[11px] uppercase tracking-wider font-bold opacity-70">
            <span>Explorer</span>
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
        </div>
        <div class="flex-grow overflow-y-auto">
            <div class="px-1 py-1">
                <div class="flex items-center px-2 py-1 text-xs font-bold uppercase opacity-80 cursor-pointer">
                    <svg class="w-4 h-4 mr-1 transition-transform" :class="explorerOpen ? 'rotate-90' : ''" @click="explorerOpen = !explorerOpen" fill="currentColor" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    Projects
                </div>
                <div class="ml-4 space-y-0.5" x-show="explorerOpen">
                    <?php
                    $projectsJson = file_get_contents(__DIR__ . '/../../data/portfolio.json');
                    $portfolioData = json_decode($projectsJson, true);
                    $projects = $portfolioData['projects'];
                    $featured = array_values(array_filter($projects, fn($p) => !empty($p['featured'])));
                    $other = array_values(array_filter($projects, fn($p) => empty($p['featured'])));
                    ?>
                    <?php if (!empty($featured)): ?>
                        <div class="px-2 pt-1 pb-0.5 text-[9px] uppercase tracking-wider opacity-50">★ Featured</div>
                        <?php foreach ($featured as $p): ?>
                            <div @click="selectFile('<?php echo htmlspecialchars($p['title'], ENT_QUOTES); ?>')"
                                 :class="activeFile === '<?php echo htmlspecialchars($p['title'], ENT_QUOTES); ?>' ? 'bg-[#37373d]' : ''"
                                 class="flex items-center px-2 py-1 text-xs hover:bg-[#37373d] cursor-pointer">
                                <span class="mr-2 text-yellow-500">📂</span><?php echo htmlspecialchars($p['title']); ?>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    <?php if (!empty($other)): ?>
                        <div class="px-2 pt-2 pb-0.5 text-[9px] uppercase tracking-wider opacity-50">Other work</div>
                        <?php foreach ($other as $p): ?>
                            <div @click="selectFile('<?php echo htmlspecialchars($p['title'], ENT_QUOTES); ?>')"
                                 :class="activeFile === '<?php echo htmlspecialchars($p['title'], ENT_QUOTES); ?>' ? 'bg-[#37373d]' : ''"
                                 class="flex items-center px-2 py-1 text-xs hover:bg-[#37373d] cursor-pointer">
                                <span class="mr-2 text-yellow-500">📂</span><?php echo htmlspecialchars($p['title']); ?>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
    </div>

    <!-- Main Editor -->
    <div class="flex-grow flex flex-col min-w-0 bg-[#1e1e1e]">
        <!-- Tabs -->
        <div class="h-9 bg-[#252526] flex items-center overflow-x-auto scrollbar-none shrink-0">
            <div @click="activeTab = 'editor'"
                 :class="activeTab === 'editor' ? 'bg-[#1e1e1e] border-t border-win-blue' : 'opacity-50'"
                 class="h-full px-4 flex items-center text-xs cursor-pointer min-w-[120px] transition-all">
                <span class="mr-2 text-yellow-500">📂</span>
                <span class="truncate" x-text="activeFile"></span>
            </div>
            <div @click="activeTab = 'terminal'"
                 :class="activeTab === 'terminal' ? 'bg-[#1e1e1e] border-t border-win-blue' : 'opacity-50'"
                 class="h-full px-4 flex items-center text-xs cursor-pointer min-w-[120px] transition-all">
                <span class="mr-2 text-gray-400">⌨️</span>
                <span>Terminal</span>
            </div>
        </div>

        <!-- Breadcrumbs -->
        <div class="h-6 px-4 flex items-center text-[11px] opacity-60 bg-[#1e1e1e] shrink-0">
            Projects <span class="mx-1">></span> <span x-text="activeFile"></span>
        </div>

        <!-- Editor/Terminal Content -->
        <div class="flex-grow flex flex-col min-h-0 overflow-hidden">
            <!-- Editor View -->
            <div x-show="activeTab === 'editor'" class="flex-grow overflow-auto custom-scrollbar bg-[#1e1e1e] p-4">
                <div class="flex h-full">
                    <!-- Line Numbers -->
                    <div class="w-10 shrink-0 text-right pr-4 text-[#858585] font-mono text-xs leading-6 select-none border-r border-[#333333]">
                        <?php for($i=1; $i<=50; $i++) echo $i . "<br>"; ?>
                    </div>
                    <!-- Code Area -->
                    <div class="flex-grow font-mono text-xs leading-6 h-full px-4">
                        <!-- Project View -->
                        <div class="h-full flex flex-col">
                            <?php foreach ($projects as $p): ?>
                                <div x-show="activeFile === '<?php echo $p['title']; ?>'" class="flex flex-col h-full animate-window-open">
                                    <div class="flex items-center justify-between mb-6">
                                        <div>
                                            <h2 class="text-2xl font-bold text-white mb-2"><?php echo $p['title']; ?></h2>
                                            <p class="text-gray-400 text-sm max-w-2xl"><?php echo $p['description']; ?></p>
                                        </div>
                                        <div class="flex space-x-3">
                                            <button @click="runBuild()" 
                                                    class="bg-[#333333] hover:bg-[#444444] text-white px-4 py-2 rounded-md font-medium transition-colors flex items-center text-sm border border-white/10">
                                                <span class="mr-2" :class="isBuilding ? 'animate-spin' : ''">🔨</span>
                                                <span x-text="isBuilding ? 'Building...' : 'Build'"></span>
                                            </button>
                                            <button @click="window.open('<?php echo $p['url']; ?>', '_blank')" 
                                                    class="bg-win-blue hover:bg-blue-600 text-white px-6 py-2 rounded-md font-medium transition-colors flex items-center text-sm">
                                                <span>Visit Website</span>
                                                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div class="flex-grow relative group overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                        <img src="<?php echo $p['thumbnail']; ?>" 
                                             class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                             alt="<?php echo $p['title']; ?>">
                                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div class="flex flex-wrap gap-2">
                                                <?php foreach ($p['tags'] as $t): ?>
                                                    <span class="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] uppercase tracking-wider"><?php echo $t; ?></span>
                                                <?php endforeach; ?>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            <?php endforeach; ?>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Terminal View (VS Code Style) -->
            <div x-show="activeTab === 'terminal'" class="h-64 bg-[#1e1e1e] border-t border-[#333333] flex flex-col">
                <div class="h-9 flex items-center px-4 justify-between border-b border-[#333333] shrink-0">
                    <div class="flex space-x-4 text-[11px] uppercase font-bold tracking-wider opacity-70">
                        <span class="text-white border-b border-white">Terminal</span>
                        <span>Output</span>
                        <span>Debug Console</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <div class="text-[10px] bg-white/10 px-2 py-0.5 rounded cursor-pointer">powershell</div>
                        <button @click="terminalOutput = []" class="text-gray-400 hover:text-white p-1">🗑️</button>
                    </div>
                </div>
                <div id="vscode-terminal" class="flex-grow p-4 font-mono text-[12px] overflow-y-auto custom-scrollbar">
                    <template x-for="line in terminalOutput">
                        <div class="mb-1">
                            <span :class="{
                                'text-win-blue': line.type === 'command',
                                'text-gray-400': line.type === 'info',
                                'text-green-500': line.type === 'success',
                                'text-red-500': line.type === 'error'
                            }" x-text="line.text"></span>
                        </div>
                    </template>
                    <div x-show="isBuilding" class="animate-pulse text-win-blue">_</div>
                </div>
            </div>
        </div>

        <!-- Status Bar -->
        <div class="h-6 bg-win-blue text-white flex items-center px-3 justify-between text-[11px] shrink-0">
            <div class="flex items-center space-x-4">
                <div class="flex items-center cursor-pointer hover:bg-white/10 px-1">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-10h2v8h-2V7z"/></svg>
                    0
                </div>
                <div class="flex items-center cursor-pointer hover:bg-white/10 px-1">
                    <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
                    0
                </div>
            </div>
            <div class="flex items-center space-x-4">
                <div class="cursor-pointer hover:bg-white/10 px-1">Spaces: 4</div>
                <div class="cursor-pointer hover:bg-white/10 px-1">UTF-8</div>
                <div class="cursor-pointer hover:bg-white/10 px-1" x-text="activeFile.endsWith('.pdf') ? 'PDF' : 'HTML'"></div>
                <div class="cursor-pointer hover:bg-white/10 px-1">Prettier</div>
            </div>
        </div>
    </div>
</div>

