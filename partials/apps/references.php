<!-- partials/apps/references.php -->
<!-- 1:1 port of v2/src/apps/references/ReferencesVault.tsx. Fetches the same
     /data/references.enc.json envelope and decrypts in-browser via Web
     Crypto so v1 and v2 share the encrypted blob. -->
<div class="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white select-text"
     x-data="referencesVault()" x-init="init()">

    <!-- Unlocked view -->
    <template x-if="refs">
        <div class="h-full flex flex-col">
            <header class="h-9 bg-[#2b579a] text-white flex items-center justify-between px-3 text-[11px] shrink-0">
                <div class="flex items-center gap-2">
                    <span>🔓</span>
                    <span class="font-medium">References — Unlocked</span>
                    <span class="opacity-70" x-text="`· ${refs.length} item${refs.length === 1 ? '' : 's'}`"></span>
                </div>
                <button type="button" @click="lock()" class="bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded text-[10px]">Lock</button>
            </header>
            <div class="flex-grow flex min-h-0">
                <aside class="w-56 border-r border-gray-200 dark:border-gray-800 overflow-y-auto shrink-0">
                    <template x-for="(r, i) in refs" :key="i">
                        <button type="button"
                                @click="selected = i"
                                :class="selected === i ? 'bg-[#e6f3fb] dark:bg-white/10' : ''"
                                class="w-full text-left px-3 py-2 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                            <div class="text-[12px] font-semibold truncate" x-text="r.from"></div>
                            <div class="text-[10px] opacity-60 truncate" x-text="[r.role, r.company].filter(Boolean).join(' · ')"></div>
                        </button>
                    </template>
                </aside>
                <article class="flex-grow overflow-y-auto p-6">
                    <h2 class="text-lg font-semibold mb-1" x-text="refs[selected].from"></h2>
                    <p class="text-[12px] opacity-70 mb-4" x-text="[refs[selected].role, refs[selected].company].filter(Boolean).join(' · ')"></p>
                    <pre class="text-sm whitespace-pre-wrap font-sans leading-relaxed" x-text="refs[selected].body"></pre>
                </article>
            </div>
        </div>
    </template>

    <!-- Lock screen -->
    <template x-if="!refs">
        <div class="h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0a3d6b] via-[#1e4d8f] to-[#2b579a] text-white p-6 text-center">
            <div class="w-full max-w-sm bg-white/10 backdrop-blur-md rounded-2xl p-8 ring-1 ring-white/15 shadow-2xl">
                <div class="w-14 h-14 rounded-full bg-white/10 mx-auto flex items-center justify-center text-2xl mb-4">🔒</div>
                <h1 class="text-lg font-semibold mb-1">References — Encrypted</h1>
                <p class="text-[11px] opacity-80 mb-6 leading-relaxed">
                    Reference letters are stored encrypted in the browser bundle and only decrypt locally once a recruiter enters the shared password. Nothing ever leaves this tab.
                </p>
                <template x-if="loadError">
                    <div class="text-[11px] text-red-200 bg-red-900/30 rounded p-3" x-text="`Vault file unavailable: ${loadError}`"></div>
                </template>
                <template x-if="!loadError">
                    <form @submit.prevent="unlock()" class="space-y-3">
                        <input type="password" x-model="password" autocomplete="current-password" placeholder="Password" aria-label="Password" autofocus
                               class="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm placeholder-white/40 focus:outline-none focus:border-white/60">
                        <button type="submit" :disabled="!password || !envelope || busy"
                                class="w-full bg-white text-[#0a3d6b] font-semibold text-sm rounded-lg py-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition">
                            <span x-text="busy ? 'Decrypting…' : 'Unlock'"></span>
                        </button>
                        <p x-show="error" class="text-[11px] text-red-200" x-text="error"></p>
                        <p x-show="!envelope && !loadError" class="text-[10px] opacity-50">Loading vault…</p>
                    </form>
                </template>
                <p class="text-[10px] opacity-50 mt-6">
                    Don't have the password?
                    <a href="mailto:devante@johnson-rose.co.uk" class="underline">Email me</a>.
                </p>
            </div>
        </div>
    </template>
</div>
