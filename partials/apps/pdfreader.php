<!-- partials/apps/pdfreader.php -->
<div class="h-full flex flex-col bg-[#525659] text-white select-none" x-data="pdfReaderApp()">
    <!-- Acrobat Header -->
    <div class="h-9 bg-[#323639] flex items-center px-4 justify-between shrink-0">
        <div class="flex items-center space-x-3">
            <div class="w-6 h-6 bg-[#ff0000] rounded flex items-center justify-center font-bold text-[10px] text-white">PDF</div>
            <span class="text-xs font-medium truncate max-w-[300px]" x-text="fileName || 'Adobe Acrobat Reader'"></span>
        </div>
        <div class="flex items-center space-x-4">
            <div class="flex items-center bg-black/20 rounded px-2 py-1 space-x-2">
                <button class="hover:bg-white/10 p-1 rounded"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13H5v-2h14v2z"/></svg></button>
                <span class="text-[10px] font-mono">100%</span>
                <button class="hover:bg-white/10 p-1 rounded"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M19 13h-6V7h-2v6H5v2h6v6h2v-6h6v-2z"/></svg></button>
            </div>
            <button @click="window.open(pdfUrl, '_blank')" class="bg-[#ff0000] hover:bg-[#cc0000] text-white px-3 py-1 rounded text-[10px] font-bold transition-colors">
                DOWNLOAD
            </button>
        </div>
    </div>

    <!-- Acrobat Toolbar -->
    <div class="h-9 bg-[#eef1f2] border-b border-gray-300 flex items-center px-4 space-x-6 text-[#444] shrink-0">
        <div class="flex items-center space-x-4">
            <button class="hover:bg-black/5 p-1 rounded" title="Print"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg></button>
            <button class="hover:bg-black/5 p-1 rounded" title="Rotate"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg></button>
        </div>
        <div class="h-4 w-px bg-gray-300"></div>
        <div class="flex items-center space-x-2">
            <span class="text-[11px] opacity-70">Page</span>
            <input type="text" value="1" class="w-8 h-6 border border-gray-300 text-center text-[11px] rounded">
            <span class="text-[11px] opacity-70">of 1</span>
        </div>
    </div>

    <!-- PDF Viewer -->
    <div class="flex-grow bg-[#525659] overflow-auto flex justify-center p-8 custom-scrollbar">
        <div class="w-full max-w-[850px] bg-white shadow-2xl relative min-h-[1100px]">
            <iframe :src="pdfUrl" 
                    class="w-full h-full min-h-[1100px] border-none">
            </iframe>
            
            <!-- Fallback if iframe fails -->
            <div x-show="!pdfUrl" class="absolute inset-0 flex flex-col items-center justify-center text-black">
                <div class="text-4xl mb-4">📄</div>
                <p class="text-sm">Unable to load PDF. <a :href="pdfUrl" target="_blank" class="text-blue-600 underline">Click here to download.</a></p>
            </div>
        </div>
    </div>
</div>
