<!-- partials/apps/terminal.php -->
<div class="h-full flex flex-col bg-[#0c0c0c] text-[#cccccc] font-mono text-xs overflow-hidden" 
     x-data="terminalApp()" 
     @contextmenu="handleContextMenu($event)">
    <!-- Terminal Header Mock -->
    <div class="h-9 bg-[#2b2b2b] flex items-center px-3 space-x-4 border-b border-white/5">
        <div class="flex items-center space-x-2 border-b-2 border-win-blue h-full px-2">
            <span class="text-lg">🪟</span>
            <span class="text-[11px] font-medium">PowerShell</span>
            <button class="hover:bg-white/10 rounded p-0.5" @click="closeWindow($data.id)"><svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
        </div>
        <button class="hover:bg-white/10 rounded p-1 text-gray-400"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg></button>
    </div>

    <!-- Terminal Content -->
    <div class="flex-grow overflow-y-auto p-4 custom-scrollbar" x-ref="terminalOutput" @click="$refs.terminalInput.focus()">
        <div class="mb-4 text-gray-400">Windows PowerShell<br>Copyright (C) Microsoft Corporation. All rights reserved.<br><br>Install the latest PowerShell for new features and improvements! https://aka.ms/PSWindows</div>
        
        <template x-for="line in history">
            <div class="mb-3">
                <div class="flex items-center">
                    <span class="text-green-400 mr-2" x-text="'PS ' + line.path + '>'"></span>
                    <span x-text="line.cmd"></span>
                </div>
                <div class="mt-1 whitespace-pre-wrap text-blue-100/80 leading-relaxed" x-text="line.res"></div>
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
                   class="bg-transparent border-none outline-none flex-grow text-[#cccccc] font-mono"
                   autofocus>
        </div>
    </div>
</div>
