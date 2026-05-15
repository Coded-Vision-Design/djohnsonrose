<!-- partials/apps/admin.php — 1:1 with v2/src/apps/admin/AdminConsole.tsx.
     Lazy-loads Chart.js + Google Identity Services on first open so v1
     doesn't pay the ~110 KB cost on every page. Auth + stats endpoints
     are shared with v2 (api/admin_*.php, api/stats.php). -->
<div class="h-full flex flex-col bg-[#f5f5f5] dark:bg-[#1c1c1c] text-black dark:text-white overflow-hidden"
     style="font-family: 'Segoe UI', sans-serif;"
     x-data="adminApp()" x-init="init()">

    <!-- ============ Lock screen (unauthenticated) ============ -->
    <template x-if="!me || !me.authenticated">
        <div class="h-full flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-[#003a8c] via-[#0050b3] to-[#1890ff] text-white p-6 text-center">
            <img src="<?php echo IMG_PATH; ?>profile.png" alt="" class="w-20 h-20 rounded-full ring-4 ring-white/20">
            <div>
                <h1 class="text-2xl font-semibold">Admin Console</h1>
                <p class="opacity-80 text-sm mt-1">Sign in with an authorised Google account.</p>
            </div>
            <div x-ref="gisButton" aria-label="Sign in with Google" class="min-h-[44px]"></div>
            <template x-if="me && !me.client_id">
                <p class="text-xs text-red-200 max-w-sm">GOOGLE_OAUTH_CLIENT_ID isn't configured on the server.</p>
            </template>
            <template x-if="authError">
                <p class="text-xs text-red-200 max-w-sm" x-text="authError"></p>
            </template>
            <p class="text-[11px] opacity-60 mt-6 max-w-sm">
                This area is restricted. Your Google identity is verified server-side
                and only accounts on the allowlist may sign in.
            </p>
        </div>
    </template>

    <!-- ============ Dashboard (authenticated) ============ -->
    <template x-if="me && me.authenticated">
        <div class="h-full flex flex-col">

            <!-- Header -->
            <header class="shrink-0 bg-white dark:bg-[#2b2b2b] border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex flex-wrap items-center gap-3 justify-between">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0078d4] to-[#5cb6ff] flex items-center justify-center text-white font-bold text-lg shrink-0">A</div>
                    <div class="min-w-0">
                        <div class="font-semibold leading-tight truncate">Portfolio OS · Admin Console</div>
                        <div class="text-[11px] opacity-60 truncate">
                            Signed in as <span x-text="me.email"></span>
                            <template x-if="stats"><span> · Updated <span x-text="new Date(stats.generated_at).toLocaleTimeString()"></span></span></template>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2 ml-auto">
                    <nav class="flex bg-gray-100 dark:bg-black/20 rounded-full p-1 text-[12px]">
                        <button type="button" @click="tab = 'dashboard'"
                                :class="tab === 'dashboard' ? 'bg-white dark:bg-[#1c1c1c] shadow text-[#0078d4]' : 'opacity-70 hover:opacity-100'"
                                class="px-3 py-1 rounded-full transition">Dashboard</button>
                        <button type="button" @click="tab = 'enquiries'"
                                :class="tab === 'enquiries' ? 'bg-white dark:bg-[#1c1c1c] shadow text-[#0078d4]' : 'opacity-70 hover:opacity-100'"
                                class="px-3 py-1 rounded-full transition">
                            Enquiries
                            <template x-if="stats && stats.enquiries_count > 0">
                                <span class="ml-1 inline-flex min-w-[18px] justify-center bg-[#0078d4] text-white rounded-full text-[10px] px-1.5" x-text="stats.enquiries_count"></span>
                            </template>
                        </button>
                    </nav>
                    <button type="button" @click="loadStats()" :disabled="busy"
                            class="text-[12px] px-3 py-1 rounded-full border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-50">
                        <span x-text="busy ? 'Loading…' : 'Refresh'"></span>
                    </button>
                    <button type="button" @click="logout()"
                            class="text-[12px] px-3 py-1 rounded-full bg-gray-900 text-white hover:bg-black">
                        Sign out
                    </button>
                </div>
            </header>

            <!-- Body -->
            <div class="flex-grow overflow-auto p-4 md:p-6 space-y-6">
                <template x-if="busy && !stats">
                    <div class="flex items-center justify-center py-20">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-win-blue"></div>
                    </div>
                </template>

                <!-- Dashboard tab -->
                <template x-if="tab === 'dashboard' && stats">
                    <div class="space-y-6">
                        <!-- KPI strip -->
                        <section class="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm ring-1 ring-gray-200/60 dark:ring-white/10">
                                <div class="text-[11px] uppercase tracking-wide opacity-60">Total events</div>
                                <div class="text-2xl font-semibold mt-1" x-text="stats.total_events.toLocaleString()"></div>
                            </div>
                            <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm ring-1 ring-gray-200/60 dark:ring-white/10">
                                <div class="text-[11px] uppercase tracking-wide opacity-60">Enquiries</div>
                                <div class="text-2xl font-semibold mt-1" x-text="stats.enquiries_count.toLocaleString()"></div>
                            </div>
                            <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm ring-1 ring-amber-200/60 dark:ring-amber-500/30">
                                <div class="text-[11px] uppercase tracking-wide opacity-60">v1 events (PHP)</div>
                                <div class="text-2xl font-semibold mt-1" x-text="kpi('php')"></div>
                            </div>
                            <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm ring-1 ring-blue-200/60 dark:ring-blue-500/30">
                                <div class="text-[11px] uppercase tracking-wide opacity-60">v2 events (React)</div>
                                <div class="text-2xl font-semibold mt-1" x-text="kpi('react')"></div>
                            </div>
                        </section>

                        <!-- Source pie + Daily sessions -->
                        <section class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col lg:col-span-1">
                                <h3 class="text-sm font-semibold mb-3">v1 vs v2 (lifetime)</h3>
                                <div class="relative flex-grow min-h-[240px]"><canvas x-ref="sourceChart"></canvas></div>
                            </div>
                            <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col lg:col-span-2">
                                <h3 class="text-sm font-semibold mb-3">Daily sessions (last 14 days)</h3>
                                <div class="relative flex-grow min-h-[240px]"><canvas x-ref="dailyChart"></canvas></div>
                            </div>
                        </section>

                        <!-- Per-app + Device type -->
                        <section class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col lg:col-span-2">
                                <h3 class="text-sm font-semibold mb-3">Most used apps (60 days)</h3>
                                <div class="relative flex-grow min-h-[240px]"><canvas x-ref="perAppChart"></canvas></div>
                            </div>
                            <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col lg:col-span-1">
                                <h3 class="text-sm font-semibold mb-3">Device type</h3>
                                <div class="relative flex-grow min-h-[240px]"><canvas x-ref="deviceChart"></canvas></div>
                            </div>
                        </section>

                        <!-- Browser + country -->
                        <section class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col">
                                <h3 class="text-sm font-semibold mb-3">Browser breakdown</h3>
                                <div class="relative flex-grow min-h-[240px]"><canvas x-ref="browserChart"></canvas></div>
                            </div>
                            <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col">
                                <h3 class="text-sm font-semibold mb-3">Top countries</h3>
                                <div class="relative flex-grow min-h-[240px]"><canvas x-ref="countryChart"></canvas></div>
                            </div>
                        </section>

                        <!-- Screen time -->
                        <section class="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <template x-for="row in stats.screen_time" :key="row.source">
                                <div class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl p-4 shadow-sm">
                                    <div class="text-[11px] uppercase tracking-wide opacity-60">
                                        <span x-text="(row.source || 'unknown').toUpperCase()"></span> session depth
                                    </div>
                                    <div class="text-2xl font-semibold mt-1" x-text="row.events_per_session"></div>
                                    <div class="text-[11px] opacity-60 mt-1">
                                        <span x-text="(+row.events).toLocaleString()"></span> events across
                                        <span x-text="(+row.sessions).toLocaleString()"></span> sessions (30d)
                                    </div>
                                </div>
                            </template>
                        </section>
                    </div>
                </template>

                <!-- Enquiries tab -->
                <template x-if="tab === 'enquiries' && stats">
                    <section class="bg-white dark:bg-[#2b2b2b] border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
                        <div class="flex flex-col md:flex-row min-h-[420px]">
                            <div class="md:w-2/5 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-800 overflow-y-auto max-h-[60vh]">
                                <template x-if="stats.enquiries.length === 0">
                                    <div class="p-6 text-sm opacity-60">No enquiries yet.</div>
                                </template>
                                <template x-for="row in stats.enquiries" :key="row.id">
                                    <button type="button" @click="selectedEnquiry = row"
                                            :class="selectedEnquiry && selectedEnquiry.id === row.id ? 'bg-[#e6f3fb] dark:bg-white/10' : ''"
                                            class="w-full text-left p-3 border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                                        <div class="text-[11px] opacity-60 flex justify-between gap-2">
                                            <span class="truncate" x-text="row.sender || 'Web Visitor'"></span>
                                            <span class="shrink-0" x-text="new Date(row.created_at).toLocaleDateString()"></span>
                                        </div>
                                        <div class="font-semibold truncate mt-0.5" x-text="row.subject || '(no subject)'"></div>
                                        <div class="text-xs opacity-60 truncate mt-0.5" x-text="(row.body || '').split('\n')[0]"></div>
                                    </button>
                                </template>
                            </div>
                            <div class="md:w-3/5 p-4 md:p-6 overflow-y-auto max-h-[60vh]">
                                <template x-if="!selectedEnquiry">
                                    <div class="opacity-60 text-sm">Select an enquiry to read it.</div>
                                </template>
                                <template x-if="selectedEnquiry">
                                    <article class="space-y-3">
                                        <h2 class="text-lg font-semibold" x-text="selectedEnquiry.subject"></h2>
                                        <div class="text-[11px] opacity-60 grid grid-cols-2 gap-2">
                                            <div><span class="opacity-60">From: </span><span x-text="selectedEnquiry.sender || 'Web Visitor'"></span></div>
                                            <div><span class="opacity-60">To: </span><span x-text="selectedEnquiry.recipient"></span></div>
                                            <div><span class="opacity-60">Received: </span><span x-text="new Date(selectedEnquiry.created_at).toLocaleString()"></span></div>
                                            <div><span class="opacity-60">IP: </span><span x-text="selectedEnquiry.ip_address"></span></div>
                                        </div>
                                        <pre class="text-sm whitespace-pre-wrap font-sans border-t border-gray-200 dark:border-gray-800 pt-3" x-text="selectedEnquiry.body"></pre>
                                    </article>
                                </template>
                            </div>
                        </div>
                    </section>
                </template>
            </div>
        </div>
    </template>
</div>
