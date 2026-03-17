<!-- partials/apps/edge.php -->
<div class="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white" x-data="edgeApp()">
    <!-- Browser Header -->
    <div class="bg-gray-100 dark:bg-[#2b2b2b] pt-1.5 pb-2 space-y-1.5 shrink-0 border-b dark:border-white/5">
        <!-- Tabs -->
        <div class="flex items-center space-x-1 px-3 overflow-x-auto scrollbar-none">
            <template x-for="tab in tabs" :key="tab.id">
                <div @click="activeTabId = tab.id" 
                     :class="activeTabId === tab.id ? 'bg-white dark:bg-[#1c1c1c] shadow-[0_-1px_0_rgba(0,0,0,0.08)] z-10' : 'hover:bg-gray-200 dark:hover:bg-white/5 opacity-80'"
                     class="flex items-center px-3 py-1.5 rounded-t-lg cursor-default min-w-[120px] max-w-[200px] transition-all border-transparent shrink-0 group relative"
                     x-data="{ showClose: false }"
                     @mouseenter="setTimeout(() => showClose = true, 50)"
                     @mouseleave="showClose = false">
                    <span class="truncate mr-2 text-[13px] font-normal" x-text="tab.title"></span>
                    <button @click.stop="closeTab(tab.id)" 
                            x-show="showClose || activeTabId === tab.id"
                            class="ml-auto hover:bg-gray-300 dark:hover:bg-white/10 rounded p-0.5 transition-opacity duration-200">
                        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </template>
            <button @click="addTab()" class="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-white/5 shrink-0 ml-1">
                <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            </button>
        </div>
        <!-- Address Bar Row -->
        <div class="flex items-center space-x-1 sm:space-x-2 px-3 mt-[2px]">
            <div class="flex items-center space-x-0.5">
                <button class="p-2 rounded hover:bg-gray-200 dark:hover:bg-white/5 hidden sm:block opacity-70"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg></button>
                <button class="p-2 rounded hover:bg-gray-200 dark:hover:bg-white/5 hidden sm:block opacity-70"><svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg></button>
                <button @click="refreshPage()" class="p-2 rounded hover:bg-gray-200 dark:hover:bg-white/5 transition-transform" :class="{ 'animate-spin': isRefreshing }">
                    <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </button>
            </div>
            <div class="flex-grow bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-full px-4 py-1 flex items-center shadow-sm min-w-0 h-8 group focus-within:ring-2 ring-win-blue/20">
                <svg class="w-3 h-3 text-green-500 mr-2 shrink-0 opacity-80" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
                <input type="text" 
                       x-model="activeTab().url" 
                       @click="focusUrl($event)"
                       class="bg-transparent border-none outline-none w-full text-xs truncate font-normal" 
                       @keydown.enter="loadUrl()">
            </div>
            <!-- Edge Menu (...) -->
            <div class="relative" x-data="{ open: false }">
                <button @click="open = !open" @click.away="open = false" class="p-2 rounded hover:bg-gray-200 dark:hover:bg-white/5 opacity-70">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
                </button>
                <div x-show="open" 
                     x-cloak 
                     class="absolute right-0 mt-1 w-48 bg-white dark:bg-[#2b2b2b] rounded-lg shadow-xl border border-gray-200 dark:border-white/10 py-1 z-50 animate-in fade-in zoom-in duration-75">
                    <button class="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 dark:hover:bg-white/5 flex items-center" @click="addTab(); open = false">
                        <span class="mr-2">➕</span> New tab
                    </button>
                    <button class="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 dark:hover:bg-white/5 flex items-center">
                        <span class="mr-2">🔍</span> Find
                    </button>
                    <div class="my-1 border-t border-gray-200 dark:border-white/10"></div>
                    <button class="w-full text-left px-4 py-2 text-xs hover:bg-gray-100 dark:hover:bg-white/5 flex items-center" @click="activeTab().url = 'portfolio://projects'; open = false">
                        <span class="mr-2">ℹ️</span> About
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Content Area -->
    <div class="flex-grow relative overflow-auto bg-gray-50 dark:bg-[#1c1c1c]">
        <template x-if="activeTab().url === 'portfolio://projects'">
            <div class="max-w-5xl mx-auto p-4 sm:p-8">
                <h1 class="font-bold mb-4 sm:mb-8 text-2xl sm:text-3xl">Featured Projects</h1>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                    <?php 
                    $projects = include __DIR__ . '/../../data/projects.php';
                    foreach ($projects as $p): ?>
                        <div class="bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-white/5 group">
                            <div class="h-48 bg-gray-200 dark:bg-gray-800 relative">
                                <img src="<?php echo $p['thumbnail']; ?>" class="w-full h-full object-cover">
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button class="bg-win-blue text-white px-6 py-2 rounded-full font-medium flex items-center space-x-2" @click="window.open('<?php echo $p['url']; ?>', '_blank')">
                                        <img src="<?php echo IMG_PATH; ?>chrome.webp" class="w-4 h-4">
                                        <span>Visit Site</span>
                                    </button>
                                </div>
                            </div>
                            <div class="p-6">
                                <div class="flex justify-between items-start mb-2">
                                    <h3 class="text-xl font-bold"><?php echo $p['title']; ?></h3>
                                    <div class="flex items-center space-x-2 px-2 py-1 <?php echo (isset($p['country_code']) && strpos($p['country_code'], 'gb') !== false) ? 'bg-win-blue/10 text-win-blue border-win-blue/20' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10'; ?> rounded-full border">
                                        <?php if (isset($p['country_code'])): ?>
                                            <img src="https://flagcdn.com/w20/<?php echo strtolower($p['country_code']); ?>.png" 
                                                 class="w-4 h-auto rounded-sm shadow-sm"
                                                 alt="<?php echo $p['location']; ?>">
                                        <?php endif; ?>
                                        <span class="text-[10px] font-bold">
                                            <?php echo $p['location'] ?? 'UK'; ?>
                                        </span>
                                    </div>
                                </div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm mb-4"><?php echo $p['description']; ?></p>
                                <div class="flex flex-wrap gap-2">
                                    <?php foreach ($p['tags'] as $t): ?>
                                        <span class="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-[10px] text-gray-500 uppercase tracking-wider"><?php echo $t; ?></span>
                                    <?php endforeach; ?>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        </template>
        <template x-if="activeTab().url !== 'portfolio://projects'">
            <div class="h-full flex flex-col items-center justify-center text-center p-10">
                <img src="<?php echo IMG_PATH; ?>chrome.webp" class="w-16 h-16 mb-4">
                <h2 class="text-2xl font-bold mb-2">Chrome Browser</h2>
                <p class="text-gray-500 max-w-md">This is a simulated Chrome browser. For external links, please use the "Visit Site" buttons or type a URL to see a mock page.</p>
                <button @click="activeTab().url = 'portfolio://projects'" class="mt-6 text-win-blue hover:underline">Back to Projects</button>
            </div>
        </template>
    </div>
</div>
