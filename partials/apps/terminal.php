<!-- partials/apps/terminal.php -->
<?php
// The projects, CV and skills come from data/portfolio.json and data/profile.json,
// like v2's Terminal. The commands that print them are in assets/js/windowing/terminal.js.
$terminalPortfolio = load_shared_data('portfolio');
$terminalProfile = load_shared_data('profile');
$terminalData = [
    'projects' => array_map(
        fn($p) => ['title' => $p['title'] ?? '', 'url' => $p['url'] ?? '', 'featured' => !empty($p['featured'])],
        $terminalPortfolio['projects'] ?? []
    ),
    'profile' => array_intersect_key($terminalProfile, array_flip(['name', 'headline', 'location', 'alumniOf'])),
    'portfolio' => [
        'summary' => $terminalPortfolio['summary'] ?? '',
        'philosophy' => $terminalPortfolio['philosophy'] ?? '',
        'experience' => array_map(
            fn($job) => array_intersect_key($job, array_flip(['role', 'company', 'period', 'location'])),
            $terminalPortfolio['experience'] ?? []
        ),
        'skills' => $terminalPortfolio['skills'] ?? [],
    ],
];
?>
<div class="h-full flex flex-col bg-[#0c0c0c] text-[#cccccc] font-mono text-xs overflow-hidden"
     x-data="terminalApp(<?php echo htmlspecialchars(js_value($terminalData), ENT_QUOTES, 'UTF-8'); ?>)"
     @contextmenu="handleContextMenu($event)">
    <!-- Terminal Header Mock -->
    <div class="h-9 bg-[#2b2b2b] flex items-center px-3 space-x-4 border-b border-white/5">
        <div class="flex items-center space-x-2 border-b-2 border-win-blue h-full px-2">
            <img src="<?php echo IMG_PATH; ?>win11/powershell.webp" alt="" class="w-4 h-4">
            <span class="text-[11px] font-medium">PowerShell</span>
            <button type="button" aria-label="Close tab" class="hover:bg-white/10 rounded-sm p-0.5" @click="$store.os.closeWindow(win.id)"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <button type="button" aria-label="New tab" class="hover:bg-white/10 rounded-sm p-1 text-gray-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></button>
    </div>

    <!-- Terminal Content -->
    <div class="grow overflow-y-auto p-4 custom-scrollbar" x-ref="terminalOutput" @click="$refs.terminalInput.focus()">
        <div class="mb-4 text-gray-400">Windows PowerShell<br>Copyright (C) Microsoft Corporation. All rights reserved.<br><br>Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows</div>
        
        <template x-for="(line, index) in history" :key="index">
            <div class="mb-3">
                <div class="flex items-center">
                    <span class="text-green-400 mr-2" x-text="'PS ' + line.path + '>'"></span>
                    <span x-text="line.cmd"></span>
                </div>
                <div class="mt-1 whitespace-pre-wrap text-blue-100/80 leading-relaxed" x-show="line.res" data-terminal-output x-text="line.res"></div>
            </div>
        </template>

        <div class="flex items-center group">
            <span class="text-green-400 mr-2 shrink-0" x-text="'PS ' + currentPath + '>'"></span>
            <input type="text" 
                   x-model="input" 
                   x-ref="terminalInput"
                   @keydown.enter="execute()" 
                   @keydown="handleKey($event)"
                   @paste="handlePaste($event)"
                   class="bg-transparent border-none outline-hidden grow text-[#cccccc] font-mono"
                   aria-label="Terminal input" spellcheck="false" autocapitalize="off" autocomplete="off"
                   autofocus>
        </div>
    </div>
</div>
