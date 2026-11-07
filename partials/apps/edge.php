<!-- partials/apps/edge.php -->
<?php
// The projects come from data/portfolio.json, as in v2's Chrome.
$edgeProjects = load_shared_data('portfolio')['projects'] ?? [];
?>
<div class="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white" data-chrome
     x-data="edgeApp(<?php echo htmlspecialchars(js_value($edgeProjects), ENT_QUOTES, 'UTF-8'); ?>)">
    <!-- Browser Header -->
    <div class="bg-gray-100 dark:bg-[#2b2b2b] pt-1.5 pb-2 space-y-1.5 shrink-0 border-b dark:border-white/5">
        <!-- Tabs -->
        <div class="flex items-center space-x-1 px-3 overflow-x-auto scrollbar-none" role="tablist" aria-label="Tabs">
            <template x-for="tab in tabs" :key="tab.id">
                <div @click="selectTab(tab.id)" role="tab" :aria-selected="activeTabId === tab.id"
                     :class="activeTabId === tab.id ? 'bg-white dark:bg-[#1c1c1c] shadow-[0_-1px_0_rgba(0,0,0,0.08)] z-10' : 'hover:bg-gray-200 dark:hover:bg-white/5 opacity-80'"
                     class="flex items-center px-3 py-1.5 rounded-t-lg cursor-default min-w-[120px] max-w-[200px] transition-all shrink-0 group relative">
                    <span class="truncate mr-2 text-[13px] font-normal" x-text="tab.title"></span>
                    <button type="button" aria-label="Close tab" @click.stop="closeTab(tab.id)"
                            class="ml-auto hover:bg-gray-300 dark:hover:bg-white/10 rounded-sm p-0.5">
                        <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </template>
            <button type="button" aria-label="New tab" @click="addTab()" class="p-1.5 rounded-sm hover:bg-gray-200 dark:hover:bg-white/5 shrink-0 ml-1">
                <svg class="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
            </button>
        </div>
        <!-- Address Bar Row -->
        <div class="flex items-center space-x-1 sm:space-x-2 px-3 mt-[2px]">
            <div class="flex items-center space-x-0.5 shrink-0">
                <button type="button" aria-label="Go back" title="Go back" @click="goBack()" :disabled="!activeTab()?.back.length"
                        class="p-2 rounded-sm hover:bg-gray-200 dark:hover:bg-white/5 opacity-70 disabled:opacity-30 disabled:hover:bg-transparent">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                </button>
                <button type="button" aria-label="Go forward" title="Go forward" @click="goForward()" :disabled="!activeTab()?.forward.length"
                        class="p-2 rounded-sm hover:bg-gray-200 dark:hover:bg-white/5 opacity-70 disabled:opacity-30 disabled:hover:bg-transparent hidden sm:block">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                </button>
                <button type="button" aria-label="Reload" title="Reload" @click="refreshPage()" class="p-2 rounded-sm hover:bg-gray-200 dark:hover:bg-white/5 opacity-70" :class="{ 'animate-spin': isRefreshing }">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                </button>
                <button type="button" aria-label="Home" title="Home" @click="go(homeUrl)" class="p-2 rounded-sm hover:bg-gray-200 dark:hover:bg-white/5 opacity-70">
                    <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 11l9-7 9 7M5 10v10h5v-6h4v6h5V10"></path></svg>
                </button>
            </div>
            <div class="grow bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-full px-4 py-1 flex items-center shadow-xs min-w-0 h-8 focus-within:ring-2 ring-win-blue/20">
                <svg class="w-3 h-3 text-green-500 mr-2 shrink-0 opacity-80" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>
                <input type="text" aria-label="Address bar" enterkeyhint="go" autocomplete="off" spellcheck="false" autocapitalize="off"
                       :value="address"
                       @input="draft = $event.target.value"
                       @focus="$event.target.select()"
                       @keydown.enter.prevent="go(address)"
                       @keydown.escape="draft = null"
                       class="bg-transparent border-none outline-hidden w-full text-xs truncate font-normal">
            </div>
        </div>
    </div>

    <!-- Content Area -->
    <div class="grow relative overflow-auto bg-gray-50 dark:bg-[#1c1c1c]">
        <template x-if="activeTab()?.url === homeUrl">
            <div class="max-w-5xl mx-auto p-4 sm:p-8">
                <h1 class="font-bold mb-4 sm:mb-8 text-2xl sm:text-3xl">Featured Projects</h1>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                    <template x-for="project in projects" :key="project.id ?? project.title">
                        <article class="bg-white dark:bg-white/5 rounded-xl overflow-hidden shadow-lg border border-gray-100 dark:border-white/5 group">
                            <div class="h-48 bg-gray-200 dark:bg-gray-800 relative">
                                <img :src="portfolioConfig.basePath + project.thumbnail" :alt="'Screenshot of ' + project.title" loading="lazy" class="w-full h-full object-cover">
                                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity flex items-center justify-center">
                                    <a :href="project.url" target="_blank" rel="noopener noreferrer" :aria-label="'Visit ' + project.title"
                                       class="bg-win-blue text-white px-6 py-2 rounded-full font-medium flex items-center space-x-2 hover:bg-blue-600">
                                        <img src="<?php echo IMG_PATH; ?>chrome.webp" alt="" class="w-4 h-4">
                                        <span>Visit Site</span>
                                    </a>
                                </div>
                            </div>
                            <div class="p-4 sm:p-6">
                                <div class="flex justify-between items-start gap-2 mb-2">
                                    <h3 class="text-xl font-bold" data-project-title x-text="project.title"></h3>
                                    <template x-if="project.country_code">
                                        <div class="flex items-center space-x-2 px-2 py-1 rounded-full border shrink-0"
                                             :class="project.country_code.includes('gb') ? 'bg-win-blue/10 text-win-blue border-win-blue/20' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10'">
                                            <img :src="flagUrl(project)" alt="" class="w-4 h-auto rounded-xs shadow-xs">
                                            <span class="text-[10px] font-bold" x-text="project.location ?? 'UK'"></span>
                                        </div>
                                    </template>
                                </div>
                                <p class="text-gray-600 dark:text-gray-400 text-sm mb-4" x-text="project.description"></p>
                                <div class="flex flex-wrap gap-2">
                                    <template x-for="tag in tags(project)" :key="tag">
                                        <span class="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded-sm text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider" x-text="tag"></span>
                                    </template>
                                </div>
                            </div>
                        </article>
                    </template>
                </div>
            </div>
        </template>
        <template x-if="activeTab() && activeTab().url !== homeUrl">
            <div class="h-full flex flex-col items-center justify-center text-center p-6 sm:p-10">
                <img src="<?php echo IMG_PATH; ?>chrome.webp" alt="" class="w-16 h-16 mb-4">
                <h2 class="text-2xl font-bold mb-2 break-all" x-text="activeTab().title"></h2>
                <p class="text-gray-500 dark:text-gray-400 max-w-md">This Chrome is part of the portfolio, so other sites open in a real browser tab.</p>
                <template x-if="external">
                    <a :href="activeTab().url" target="_blank" rel="noopener noreferrer"
                       class="mt-6 bg-win-blue text-white px-6 py-2 rounded-full font-medium hover:bg-blue-600"
                       x-text="'Open ' + activeTab().title + ' in a new tab'"></a>
                </template>
                <button type="button" @click="go(homeUrl)" class="mt-4 text-win-blue hover:underline">Back to projects</button>
            </div>
        </template>
    </div>
</div>
