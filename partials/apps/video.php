<!-- partials/apps/video.php -->
<div class="h-full flex flex-col bg-[#0a0a0a] text-white select-none" x-data="videoApp()">
    <!-- Player Header -->
    <div class="h-10 bg-[#1a1a1a] flex items-center px-4 justify-between border-b border-white/5">
        <div class="flex items-center space-x-2">
            <div class="w-5 h-5 bg-win-blue rounded flex items-center justify-center">
                <svg class="w-3 h-3 text-white fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <span class="text-[11px] font-medium truncate max-w-[300px]" x-text="videoName || 'Media Player'"></span>
        </div>
    </div>

    <!-- Video Container -->
    <div class="flex-grow relative group overflow-hidden bg-black flex items-center justify-center">
        <video x-ref="videoPlayer" 
               class="max-h-full max-w-full shadow-2xl"
               @click="togglePlay"
               @timeupdate="updateProgress"
               :src="videoUrl"
               playsinline>
        </video>

        <!-- Centered Play Button (Overlay) -->
        <div x-show="!playing" 
             @click="togglePlay"
             class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] cursor-pointer transition-opacity duration-300">
            <div class="w-20 h-20 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 hover:bg-white/20 hover:scale-110 transition-all shadow-2xl group/btn">
                <svg class="w-10 h-10 text-white fill-current ml-1 group-hover/btn:scale-110 transition-transform" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
        </div>
    </div>

    <!-- Player Controls -->
    <div class="bg-[#1a1a1a]/95 backdrop-blur-2xl p-4 space-y-4 border-t border-white/10">
        <!-- Progress Bar -->
        <div class="relative h-1.5 bg-white/10 rounded-full cursor-pointer group/seek" @mousedown="seek">
            <div class="absolute inset-y-0 left-0 bg-win-blue rounded-full transition-all duration-75" :style="`width: ${progress}%`"></div>
            <div class="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-xl scale-0 group-hover/seek:scale-100 transition-transform border-2 border-win-blue" :style="`left: ${progress}%`" style="margin-left: -8px"></div>
        </div>

        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-8">
                <button @click="togglePlay" class="text-white hover:text-win-blue transition-all active:scale-90">
                    <template x-if="!playing">
                        <svg class="w-7 h-7 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    </template>
                    <template x-if="playing">
                        <svg class="w-7 h-7 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                    </template>
                </button>
                <div class="text-[12px] font-mono tracking-wider opacity-80">
                    <span x-text="formatTime(currentTime)" class="text-white"></span>
                    <span class="mx-1 opacity-40">/</span>
                    <span x-text="formatTime(duration)" class="opacity-60"></span>
                </div>
            </div>

            <div class="flex items-center space-x-6">
                <div class="flex items-center space-x-3 group/vol">
                    <svg class="w-5 h-5 opacity-60 group-hover/vol:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
                    <input type="range" class="w-24 h-1 accent-win-blue cursor-pointer" min="0" max="1" step="0.05" x-model="volume" @input="$refs.videoPlayer.volume = volume">
                </div>
                <button @click="toggleFullscreen" class="text-white opacity-60 hover:opacity-100 hover:text-win-blue transition-all active:scale-90">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
                </button>
            </div>
        </div>
    </div>
</div>
