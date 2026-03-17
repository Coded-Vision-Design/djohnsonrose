<!-- partials/apps/calculator.php -->
<div class="h-full flex flex-col bg-[#f3f3f3] dark:bg-[#1c1c1c] text-black dark:text-white select-none" x-data="calcApp()" @keydown.window="handleKeyboard($event)">
    <!-- Titlebar Mock -->
    <div class="flex items-center justify-between px-4 py-2 bg-transparent h-12">
        <div class="flex items-center space-x-3">
            <button class="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
            <span class="text-xs font-semibold">Standard</span>
            <button class="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </button>
        </div>
        <button class="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded transition-colors">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </button>
    </div>

    <!-- Display -->
    <div class="flex flex-col justify-end items-end px-6 py-4 flex-shrink-0 min-h-[120px]">
        <div class="text-xs text-gray-500 dark:text-gray-400 mb-1 h-5 overflow-hidden text-right break-all" x-text="expression"></div>
        <div class="text-5xl font-semibold overflow-hidden text-right w-full" 
             :class="display.length > 10 ? 'text-3xl' : (display.length > 15 ? 'text-xl' : 'text-5xl')"
             x-text="display">0</div>
    </div>

    <!-- Memory Buttons Mock -->
    <div class="flex justify-around px-2 mb-2 text-[10px] font-bold text-gray-500 dark:text-gray-400">
        <button class="px-3 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded opacity-50 cursor-default">MC</button>
        <button class="px-3 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded opacity-50 cursor-default">MR</button>
        <button class="px-3 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">M+</button>
        <button class="px-3 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">M-</button>
        <button class="px-3 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">MS</button>
        <button class="px-3 py-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded opacity-50 cursor-default">M▾</button>
    </div>

    <!-- Keypad -->
    <div class="flex-grow grid grid-cols-4 gap-0.5 p-1 pb-2">
        <template x-for="btn in buttons">
            <button @click="press(btn.val)" 
                    :class="btn.class"
                    class="h-full flex items-center justify-center text-sm rounded transition-all hover:bg-gray-200 dark:hover:bg-white/10 border border-transparent active:scale-95 active:bg-gray-300 dark:active:bg-white/20"
                    x-html="btn.label">
            </button>
        </template>
    </div>

    <script>
        // App scripts moved to alpine-init.js for global availability
    </script>
</div>
