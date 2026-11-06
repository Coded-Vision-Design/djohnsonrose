<!-- partials/login.php - the lock screen. Kept the same as v2's src/shell/LockScreen.tsx:
     name and role in the middle, an account picker at the bottom left (the owner
     signs in, "Recruiter" opens /cv) and the clock at the bottom right, or at the
     top on phones. The role comes from data/profile.json, as on /cv. -->
<?php $lockProfile = load_shared_data('profile'); ?>
<div class="h-full w-full relative flex flex-col gap-6 p-6 sm:p-12 overflow-y-auto wallpaper-bg text-white"
     x-show="!loggedIn && !loggingIn"
     x-transition:enter="transition ease-out duration-500"
     x-transition:enter-start="opacity-0"
     x-transition:enter-end="opacity-100"
     x-transition:leave="transition ease-in duration-300"
     x-transition:leave-start="opacity-100"
     x-transition:leave-end="opacity-0">
    <div class="absolute inset-0 bg-black/40"></div>

    <div class="relative z-10 flex-1 flex flex-col items-center justify-center space-y-6 text-center">
        <!-- User Avatar -->
        <div class="w-32 h-32 rounded-full border-4 border-white/20 overflow-hidden shadow-2xl">
            <img :src="user.avatar" alt="<?php echo htmlspecialchars($lockProfile['name'] ?? ''); ?>" class="w-full h-full object-cover">
        </div>

        <div class="space-y-1">
            <h1 class="text-3xl font-semibold drop-shadow-lg" x-text="user.name"></h1>
            <p class="text-lg text-white/90 drop-shadow-md" data-lock-role><?php
                echo implode(' · ', array_map(
                    fn($part) => '<span class="whitespace-nowrap">' . htmlspecialchars($part) . '</span>',
                    explode(' · ', (string)($lockProfile['headline'] ?? ''))
                ));
            ?></p>
        </div>

        <div class="w-64 space-y-4">
            <button @click="login()"
                    class="w-full py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 rounded-sm text-lg font-medium transition-all win-shadow">
                Sign In
            </button>
            <p class="text-center text-sm text-white/70">Welcome back, DeVante.</p>
        </div>
    </div>

    <!-- On phones the picker and clock join the column above, with the clock first. -->
    <div class="contents sm:flex sm:items-end sm:justify-between sm:gap-6">
        <nav aria-label="Accounts" class="relative z-10 self-start sm:self-end">
            <ul class="flex flex-col gap-1">
                <li>
                    <button type="button" @click="login()" aria-current="true"
                            class="flex items-center gap-3 w-full min-h-11 px-3 py-2 rounded-md text-left bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                        <img src="<?php echo IMG_PATH; ?>profile.webp" alt="" class="w-10 h-10 rounded-full object-cover">
                        <span class="text-base font-medium"><?php echo htmlspecialchars($lockProfile['name'] ?? ''); ?></span>
                    </button>
                </li>
                <li>
                    <a href="<?php echo BASE_PATH; ?>cv"
                       class="flex items-center gap-3 w-full min-h-11 px-3 py-2 rounded-md hover:bg-white/20 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                        <span class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center" aria-hidden="true">
                            <svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 9.5c4.1 0 7 2.1 7 4.6V18H3v-1.9c0-2.5 2.9-4.6 7-4.6Z"/></svg>
                        </span>
                        <span class="flex flex-col text-left leading-tight">
                            <span class="text-base font-medium">Recruiter</span>
                            <span class="text-sm text-white/80">Open the CV, no sign-in</span>
                        </span>
                    </a>
                </li>
            </ul>
        </nav>

        <div class="relative z-10 order-first sm:order-none text-center sm:text-right" data-lock-clock>
            <div class="text-4xl sm:text-6xl font-light mb-2 drop-shadow-lg" x-text="clock.time"></div>
            <!-- The long date, as v2 shows it. Reading clock.time keeps it current. -->
            <div class="text-lg sm:text-xl drop-shadow-md" x-text="(clock.time, new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }))"></div>
        </div>
    </div>
</div>
