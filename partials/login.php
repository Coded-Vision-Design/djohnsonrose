<!-- partials/login.php -->
<div class="h-full w-full relative flex flex-col items-center justify-center wallpaper-bg text-white" 
     x-show="!loggedIn && !loggingIn" 
     x-transition:enter="transition ease-out duration-500"
     x-transition:enter-start="opacity-0"
     x-transition:enter-end="opacity-100"
     x-transition:leave="transition ease-in duration-300"
     x-transition:leave-start="opacity-100"
     x-transition:leave-end="opacity-0">
    
    <div class="flex flex-col items-center space-y-6">
        <!-- User Avatar -->
        <div class="w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl">
            <img :src="user.avatar" alt="User" class="w-full h-full object-cover">
        </div>
        
        <h1 class="text-3xl font-semibold drop-shadow-lg" x-text="user.name"></h1>
        
        <div class="w-64 space-y-4">
            <button @click="login()" 
                    class="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded text-lg font-medium transition-all win-shadow">
                Sign In
            </button>
            <p class="text-center text-sm text-white/70">Welcome back, DeVante.</p>
        </div>
    </div>

    <!-- Bottom Info -->
    <div class="absolute bottom-6 right-6 sm:bottom-12 sm:right-12 text-right">
        <div class="text-4xl sm:text-6xl font-light mb-2" x-text="clock.time"></div>
        <div class="text-lg sm:text-xl" x-text="clock.date"></div>
    </div>
</div>
