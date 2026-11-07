<!-- partials/widgets.php -->
<div x-show="widgetsOpen"
     x-cloak
     data-widgets
     role="dialog"
     aria-label="Widgets"
     @click.away="widgetsOpen = false"
     x-transition:enter="transition ease-out duration-300"
     x-transition:enter-start="opacity-0 -translate-x-full"
     x-transition:enter-end="opacity-100 translate-x-0"
     x-transition:leave="transition ease-in duration-200"
     x-transition:leave-start="opacity-100 translate-x-0"
     x-transition:leave-end="opacity-0 -translate-x-full"
     class="fixed inset-y-4 left-4 w-[400px] max-w-[calc(100%-2rem)] bg-win-bg/80 dark:bg-[#1c1c1c]/90 backdrop-blur-3xl rounded-2xl shadow-2xl z-15000 flex flex-col overflow-hidden border border-white/20 dark:border-white/10 text-black dark:text-white">

    <!-- Widgets Header -->
    <div class="p-6 flex items-center justify-between shrink-0">
        <div class="flex items-center space-x-2 min-w-0">
            <span class="text-2xl" x-text="clock.time.split(' ')[0]"></span>
            <span class="text-xs font-semibold opacity-70 uppercase tracking-widest truncate" x-text="clock.date"></span>
        </div>
        <div class="flex items-center space-x-4">
            <span class="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <img alt="" :src="user.avatar" class="w-6 h-6 rounded-full">
            </span>
        </div>
    </div>

    <!-- Widgets Grid -->
    <div class="grow overflow-y-auto px-6 pb-6 space-y-4 custom-scrollbar">
        <!-- Weather Widget Large. A failed fetch says so, the same as v2's Widgets.tsx. -->
        <div class="glass p-6 rounded-2xl flex flex-col space-y-4 shadow-xs border-white/10">
            <template x-if="weather.status === 'error'">
                <div data-weather-failed class="flex items-center justify-between">
                    <div>
                        <div class="text-sm font-bold">Weather unavailable</div>
                        <div class="text-xs opacity-70 mt-1">The forecast could not be loaded. It will try again later.</div>
                    </div>
                    <span class="text-5xl" aria-hidden="true">☁️</span>
                </div>
            </template>
            <template x-if="weather.status !== 'error'">
                <div class="flex flex-col space-y-4">
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="text-sm font-bold opacity-70" x-text="weather.city"></div>
                            <div class="text-4xl font-light" x-text="weather.temp + '°C'"></div>
                        </div>
                        <span class="text-5xl" x-text="weather.icon" aria-hidden="true"></span>
                    </div>
                    <div class="text-sm font-medium" x-text="weather.condition"></div>
                    <div x-show="typeof weather.temp === 'number'" class="grid grid-cols-4 gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                        <template x-for="i in 4">
                            <div class="flex flex-col items-center">
                                <span class="text-xs opacity-70" x-text="['Mon', 'Tue', 'Wed', 'Thu'][i-1]"></span>
                                <span class="text-lg" aria-hidden="true">🌤️</span>
                                <span class="text-xs font-bold" x-text="(weather.temp - i) + '°'"></span>
                            </div>
                        </template>
                    </div>
                </div>
            </template>
        </div>

        <!-- News Section -->
        <div class="space-y-3">
            <h3 class="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider ml-1">Top Stories</h3>
            <template x-for="item in $store.os.news" :key="item.id || item.title">
                <a :href="item.link"
                   target="_blank"
                   rel="noopener noreferrer"
                   class="glass p-4 rounded-xl block hover:bg-white/40 dark:hover:bg-white/10 transition-all group shadow-xs border-white/10 no-underline">
                    <div class="flex flex-col space-y-1">
                        <h4 class="text-xs font-bold leading-tight group-hover:text-win-blue transition-colors text-black dark:text-white" x-text="item.title"></h4>
                        <p class="text-xs opacity-70 line-clamp-2 text-gray-700 dark:text-gray-300" x-text="item.description"></p>
                        <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1" x-text="(item.pubDate || '').split(' ').slice(0, 4).join(' ')"></span>
                    </div>
                </a>
            </template>
            <!-- Loading news -->
            <template x-if="$store.os.news.length === 0 && $store.os.newsStatus === 'loading'">
                <div role="status" class="p-8 flex flex-col items-center justify-center space-y-3 opacity-70">
                    <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-win-blue"></div>
                    <span class="text-xs font-bold uppercase tracking-widest">Fetching Headlines...</span>
                </div>
            </template>
            <template x-if="$store.os.news.length === 0 && $store.os.newsStatus === 'error'">
                <div data-news-failed class="p-6 text-center">
                    <div class="text-sm font-bold">Headlines unavailable</div>
                    <div class="text-xs opacity-70 mt-1">Close Widgets and open them again to retry.</div>
                </div>
            </template>
        </div>
    </div>

    <!-- Widgets Footer -->
    <div class="p-4 bg-black/5 dark:bg-black/20 flex items-center justify-center shrink-0 border-t border-white/10">
        <button type="button" class="text-xs font-bold text-win-blue dark:text-[#60cdff] hover:underline uppercase tracking-widest">Customise Widgets</button>
    </div>
</div>
