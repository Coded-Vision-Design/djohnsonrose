<!-- partials/apps/github.php — 1:1 with v2/src/apps/github/GitHub.tsx.
     Recognisable repo-page layout (dark navbar, breadcrumb, Star/Watch/
     Fork bar, file tree, README pane, sidebar with language bar). Every
     "live" action defers to the real GitHub via window.open so nothing
     actually happens locally. -->
<?php
$REPO_URL = 'https://github.com/Coded-Vision-Design/djohnsonrose';
$OWNER = 'Coded-Vision-Design';
$REPO = 'djohnsonrose';

$files = [
    ['name' => '.github', 'type' => 'dir', 'message' => 'feat(v1): compile Tailwind locally + via CI', 'age' => '4 hours ago'],
    ['name' => 'api', 'type' => 'dir', 'message' => 'feat(v1): port the Admin Console to v1', 'age' => '2 hours ago'],
    ['name' => 'assets', 'type' => 'dir', 'message' => 'feat: cross-build Desktop shortcuts + telemetry parity', 'age' => '12 minutes ago'],
    ['name' => 'data', 'type' => 'dir', 'message' => 'feat: bundle SA Landscape clip', 'age' => '1 hour ago'],
    ['name' => 'partials', 'type' => 'dir', 'message' => 'feat(v1): port the Admin Console to v1', 'age' => '2 hours ago'],
    ['name' => 'portfolio', 'type' => 'dir', 'message' => 'chore(portfolio): refresh all 14 site screenshots', 'age' => '3 hours ago'],
    ['name' => 'scripts', 'type' => 'dir', 'message' => 'fix: hero capture + apostrophe escape', 'age' => '30 minutes ago'],
    ['name' => 'v2', 'type' => 'dir', 'message' => 'fix(v2 mobile): tighten padding + stacking', 'age' => '2 minutes ago'],
    ['name' => '.env.example', 'type' => 'file', 'message' => 'chore: sanitize .env.example', 'age' => '10 minutes ago'],
    ['name' => '.gitattributes', 'type' => 'file', 'message' => 'fix: Linguist override (PHP not Hack)', 'age' => '5 minutes ago'],
    ['name' => '.gitignore', 'type' => 'file', 'message' => 'chore: ignore Claude/hook config + .MOV originals', 'age' => '5 minutes ago'],
    ['name' => '.htaccess', 'type' => 'file', 'message' => 'fix: serve /data/*.mp4 and .webm', 'age' => '2 minutes ago'],
    ['name' => 'LICENSE', 'type' => 'file', 'message' => 'feat: LICENSE/SECURITY + GDPR cookie banner', 'age' => '5 hours ago'],
    ['name' => 'README.md', 'type' => 'file', 'message' => 'docs: portfolio README + refresh llm.txt', 'age' => '5 hours ago'],
    ['name' => 'SECURITY.md', 'type' => 'file', 'message' => 'feat: LICENSE/SECURITY + GDPR cookie banner', 'age' => '5 hours ago'],
    ['name' => 'bootstrap.php', 'type' => 'file', 'message' => 'feat: Google OAuth admin console + analytics', 'age' => '6 hours ago'],
    ['name' => 'config.php', 'type' => 'file', 'message' => 'feat: Google OAuth admin console + analytics', 'age' => '6 hours ago'],
    ['name' => 'deploy-config.json', 'type' => 'file', 'message' => 'feat: CV-aligned Word/Explorer + References vault', 'age' => '4 hours ago'],
    ['name' => 'dev-server.php', 'type' => 'file', 'message' => 'feat: restore-to-Desktop, classic context menu', 'age' => '6 hours ago'],
    ['name' => 'favicon.ico', 'type' => 'file', 'message' => 'Initial commit with project config', 'age' => '2 months ago'],
    ['name' => 'index.php', 'type' => 'file', 'message' => 'Initial commit with project config', 'age' => '2 months ago'],
    ['name' => 'llm.txt', 'type' => 'file', 'message' => 'docs: portfolio README + refresh llm.txt', 'age' => '5 hours ago'],
    ['name' => 'manifest.json', 'type' => 'file', 'message' => 'feat: restore-to-Desktop, classic context menu', 'age' => '6 hours ago'],
    ['name' => 'package.json', 'type' => 'file', 'message' => 'chore(portfolio): refresh all 14 site screenshots', 'age' => '3 hours ago'],
    ['name' => 'robots.txt', 'type' => 'file', 'message' => 'feat: restore-to-Desktop, classic context menu', 'age' => '6 hours ago'],
    ['name' => 'router.php', 'type' => 'file', 'message' => 'Initial commit with project config', 'age' => '2 months ago'],
    ['name' => 'sitemap.xml', 'type' => 'file', 'message' => 'feat: restore-to-Desktop, classic context menu', 'age' => '6 hours ago'],
    ['name' => 'tailwind.config.js', 'type' => 'file', 'message' => 'Initial commit with project config', 'age' => '2 months ago'],
];

$languages = [
    ['name' => 'TypeScript', 'pct' => 47.2, 'color' => '#3178c6'],
    ['name' => 'PHP',        'pct' => 31.6, 'color' => '#4F5D95'],
    ['name' => 'JavaScript', 'pct' => 19.4, 'color' => '#f1e05a'],
    ['name' => 'CSS',        'pct' => 1.5,  'color' => '#563d7c'],
    ['name' => 'HTML',       'pct' => 0.3,  'color' => '#e34c26'],
];

$topics = ['portfolio', 'windows-11', 'react', 'php', 'typescript', 'alpinejs', 'tailwindcss'];
?>
<div class="h-full flex flex-col bg-[#0d1117] text-[#e6edf3] overflow-hidden"
     style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">

    <!-- Top nav bar -->
    <div class="shrink-0 bg-[#010409] border-b border-[#30363d] flex items-center px-3 sm:px-4 h-12 gap-4">
        <img src="<?php echo IMG_PATH; ?>github.webp" alt="" class="w-7 h-7 shrink-0">
        <div class="flex items-center text-sm min-w-0 truncate">
            <a href="https://github.com/<?php echo $OWNER; ?>" target="_blank" rel="noopener noreferrer"
               class="text-[#2f81f7] hover:underline truncate"><?php echo $OWNER; ?></a>
            <span class="mx-1.5 opacity-60">/</span>
            <a href="<?php echo $REPO_URL; ?>" target="_blank" rel="noopener noreferrer"
               class="font-semibold hover:underline truncate"><?php echo $REPO; ?></a>
            <span class="ml-2 px-2 py-0.5 text-[10px] border border-[#30363d] rounded-full opacity-80 hidden sm:inline-block">
                Public
            </span>
        </div>
        <button type="button"
                @click="window.open('<?php echo $REPO_URL; ?>', '_blank', 'noopener')"
                class="ml-auto shrink-0 text-xs sm:text-[13px] bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1.5 rounded-md font-medium flex items-center gap-2">
            <svg class="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M0 1.75C0 .784.784 0 1.75 0h3.5a.75.75 0 0 1 0 1.5h-3.5a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-3.5a.75.75 0 0 1 1.5 0v3.5A1.75 1.75 0 0 1 14.25 16H1.75A1.75 1.75 0 0 1 0 14.25Z"/>
                <path d="M14.78 1.22a.75.75 0 0 1 0 1.06L8.06 9l5.72.001a.75.75 0 0 1 0 1.5H6.5a.75.75 0 0 1-.75-.75V2.219a.75.75 0 0 1 1.5 0v5.72l6.72-6.72a.75.75 0 0 1 1.06 0Z"/>
            </svg>
            <span class="hidden sm:inline">Open on GitHub</span>
            <span class="sm:hidden">Open</span>
        </button>
    </div>

    <!-- Tabs -->
    <div class="shrink-0 bg-[#0d1117] border-b border-[#30363d] flex items-center px-3 sm:px-4 overflow-x-auto">
        <button type="button" @click="window.open('<?php echo $REPO_URL; ?>', '_blank', 'noopener')"
                class="flex items-center gap-2 px-3 py-2 text-[13px] whitespace-nowrap border-b-2 border-[#fd8c73] text-white font-semibold">
            Code
        </button>
        <?php foreach ([['Issues', 0], ['Pull requests', 0], ['Actions', null], ['Projects', null], ['Security', null], ['Insights', null]] as $tab): ?>
            <button type="button" @click="window.open('<?php echo $REPO_URL; ?>', '_blank', 'noopener')"
                    class="flex items-center gap-2 px-3 py-2 text-[13px] whitespace-nowrap border-b-2 border-transparent text-[#e6edf3]/80 hover:text-white hover:border-[#30363d]">
                <?php echo $tab[0]; ?>
                <?php if ($tab[1] !== null): ?>
                    <span class="text-[11px] bg-[#30363d] rounded-full px-1.5 leading-4"><?php echo $tab[1]; ?></span>
                <?php endif; ?>
            </button>
        <?php endforeach; ?>
    </div>

    <!-- Body -->
    <div class="flex-grow overflow-auto">
        <div class="max-w-[1280px] mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-[1fr_296px] gap-4">

            <!-- Main column -->
            <div class="min-w-0">
                <!-- Star/Watch/Fork bar -->
                <div class="flex flex-wrap items-center gap-2 mb-3">
                    <?php foreach ([['Star', 0], ['Watch', 0], ['Fork', 0]] as $btn): ?>
                        <button type="button" @click="window.open('<?php echo $REPO_URL; ?>', '_blank', 'noopener')"
                                class="flex items-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[12px] px-3 py-1.5 rounded-md">
                            <?php echo $btn[0]; ?>
                            <span class="ml-1 bg-[#0d1117] border border-[#30363d] px-1.5 leading-4 rounded-full text-[11px]"><?php echo $btn[1]; ?></span>
                        </button>
                    <?php endforeach; ?>
                </div>

                <!-- Branch / commits row -->
                <div class="flex items-center gap-2 mb-2 text-[12px] flex-wrap">
                    <button type="button" @click="window.open('<?php echo $REPO_URL; ?>/branches', '_blank', 'noopener')"
                            class="flex items-center gap-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-3 py-1.5 rounded-md">
                        main
                    </button>
                    <span class="opacity-60">·</span>
                    <span class="opacity-70">60 commits</span>
                </div>

                <!-- File list -->
                <div class="border border-[#30363d] rounded-md overflow-hidden">
                    <div class="bg-[#161b22] px-3 py-2 text-[12px] opacity-80 border-b border-[#30363d] flex items-center gap-2">
                        <div class="w-7 h-7 rounded-full bg-gradient-to-br from-[#2f81f7] to-[#a371f7] flex items-center justify-center text-[10px] font-bold">CV</div>
                        <span class="font-semibold">CodedVisionDesign</span>
                        <span class="hidden sm:inline truncate opacity-80">fix(v2 mobile): tighten padding + stacking in high-traffic apps</span>
                        <span class="ml-auto shrink-0 opacity-70">2 minutes ago</span>
                    </div>
                    <div class="divide-y divide-[#21262d]">
                        <?php foreach ($files as $f): ?>
                            <button type="button"
                                    @click="window.open('<?php echo $REPO_URL; ?>/blob/main/<?php echo $f['name']; ?>', '_blank', 'noopener')"
                                    class="w-full grid grid-cols-[1fr_auto] sm:grid-cols-[1fr_2fr_auto] gap-3 items-center text-left px-3 py-1.5 text-[13px] hover:bg-[#0d1117]/60">
                                <div class="flex items-center gap-2 min-w-0">
                                    <?php if ($f['type'] === 'dir'): ?>
                                        <svg class="w-4 h-4 text-[#54aeff]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                            <path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.07.26 1.4.7l.9 1.2a.25.25 0 0 0 .2.1H13.75a1.75 1.75 0 0 1 1.75 1.75v9a1.75 1.75 0 0 1-1.75 1.75H2.25A1.75 1.75 0 0 1 .5 13.75V2.75c0-.464.184-.91.513-1.237Z"/>
                                        </svg>
                                    <?php else: ?>
                                        <svg class="w-4 h-4 text-[#7d8590]" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                                            <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 9 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688l-.011-.013-2.914-2.914-.013-.011Z"/>
                                        </svg>
                                    <?php endif; ?>
                                    <span class="truncate hover:underline"><?php echo htmlspecialchars($f['name']); ?></span>
                                </div>
                                <span class="hidden sm:block text-[12px] opacity-60 truncate"><?php echo htmlspecialchars($f['message']); ?></span>
                                <span class="text-[12px] opacity-60 whitespace-nowrap"><?php echo $f['age']; ?></span>
                            </button>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- README -->
                <div class="mt-5 border border-[#30363d] rounded-md overflow-hidden">
                    <div class="bg-[#161b22] px-4 py-2 text-[12px] flex items-center gap-2 border-b border-[#30363d]">
                        <span class="font-semibold">README.md</span>
                    </div>
                    <div class="p-5 sm:p-8 text-[14px] leading-relaxed">
                        <h1 class="text-2xl font-bold border-b border-[#30363d] pb-3 mb-4">Portfolio OS — DeVanté Johnson-Rose</h1>
                        <p class="mb-3">A pixel-faithful Windows 11 desktop, in the browser, as a portfolio.</p>
                        <p class="mb-4">Live: <a href="https://devante.johnson-rose.co.uk" target="_blank" rel="noopener noreferrer" class="text-[#2f81f7] hover:underline">https://devante.johnson-rose.co.uk</a></p>
                        <p class="mb-4 opacity-90">Two parallel builds of the same OS ship from the same repo and the same <code class="bg-[#161b22] px-1 py-0.5 rounded text-[12px]">assets/</code>:</p>
                        <table class="text-[13px] mb-4 border-collapse">
                            <thead><tr class="border-b border-[#30363d]">
                                <th class="text-left py-1 pr-6 font-semibold">Track</th>
                                <th class="text-left py-1 pr-6 font-semibold">Stack</th>
                                <th class="text-left py-1 font-semibold">URL</th>
                            </tr></thead>
                            <tbody>
                                <tr class="border-b border-[#21262d]"><td class="py-1 pr-6">v1</td><td class="py-1 pr-6">PHP 8 · Alpine.js · Tailwind</td><td class="py-1">/</td></tr>
                                <tr><td class="py-1 pr-6">v2</td><td class="py-1 pr-6">React 19 · TypeScript · Vite · Zustand</td><td class="py-1">/v2/</td></tr>
                            </tbody>
                        </table>
                        <p class="mb-4 opacity-90">A toggle in each taskbar (or the Desktop shortcut on mobile) flips between the two builds so visitors can compare the same product written two different ways.</p>
                        <div class="mt-6 flex flex-wrap gap-2">
                            <button type="button" @click="window.open('<?php echo $REPO_URL; ?>/blob/main/README.md', '_blank', 'noopener')"
                                    class="text-[12px] bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] px-3 py-1.5 rounded-md">
                                View full README on GitHub →
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right sidebar -->
            <aside class="space-y-5 lg:max-w-[296px] min-w-0">
                <section>
                    <h3 class="text-[14px] font-semibold mb-2">About</h3>
                    <p class="text-[14px] opacity-80 mb-3">
                        React + PHP twin builds of an interactive Windows-style portfolio OS.
                        Live at <a href="https://devante.johnson-rose.co.uk" target="_blank" rel="noopener noreferrer" class="text-[#2f81f7] hover:underline">devante.johnson-rose.co.uk</a>.
                    </p>
                    <div class="flex flex-wrap gap-1.5 mb-3">
                        <?php foreach ($topics as $t): ?>
                            <span class="text-[11px] bg-[#1f6feb]/15 text-[#79c0ff] border border-[#388bfd]/30 rounded-full px-2 py-0.5"><?php echo $t; ?></span>
                        <?php endforeach; ?>
                    </div>
                    <ul class="text-[13px] space-y-1.5 opacity-90">
                        <li>MIT licence</li>
                        <li>0 stars · 0 watchers · 0 forks</li>
                    </ul>
                </section>

                <section>
                    <h3 class="text-[14px] font-semibold mb-2">Releases</h3>
                    <p class="text-[13px] opacity-70">No releases published</p>
                </section>

                <section>
                    <h3 class="text-[14px] font-semibold mb-2">Packages</h3>
                    <p class="text-[13px] opacity-70">No packages published</p>
                </section>

                <section>
                    <h3 class="text-[14px] font-semibold mb-2">Contributors</h3>
                    <div class="flex items-center gap-2">
                        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-[#2f81f7] to-[#a371f7] flex items-center justify-center text-[11px] font-bold">CV</div>
                        <span class="text-[13px]">CodedVisionDesign</span>
                    </div>
                </section>

                <section>
                    <h3 class="text-[14px] font-semibold mb-2">Languages</h3>
                    <div class="h-2 rounded-full overflow-hidden flex mb-2">
                        <?php foreach ($languages as $l): ?>
                            <div style="width: <?php echo $l['pct']; ?>%; background: <?php echo $l['color']; ?>;"></div>
                        <?php endforeach; ?>
                    </div>
                    <ul class="space-y-1 text-[12px]">
                        <?php foreach ($languages as $l): ?>
                            <li class="flex items-center gap-2">
                                <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background: <?php echo $l['color']; ?>"></span>
                                <span class="font-semibold"><?php echo $l['name']; ?></span>
                                <span class="opacity-70"><?php echo $l['pct']; ?>%</span>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                </section>
            </aside>
        </div>
    </div>
</div>
