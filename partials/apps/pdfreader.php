<!-- partials/apps/pdfreader.php -->
<div class="h-full flex flex-col bg-[#525659] text-white select-none" x-data="pdfReaderApp()" data-pdf-reader>
    <!-- Acrobat Header -->
    <div class="h-10 bg-[#323639] flex items-center px-3 sm:px-4 gap-3 shrink-0">
        <div class="w-6 h-6 bg-[#ff0000] rounded-sm flex items-center justify-center font-bold text-[10px] text-white shrink-0" aria-hidden="true">PDF</div>
        <span class="text-xs font-medium truncate min-w-0" x-text="fileName || 'Adobe Acrobat Reader'"></span>
        <div class="ml-auto flex items-center gap-2 shrink-0">
            <a :href="pdfUrl" target="_blank" rel="noopener noreferrer"
               class="hidden sm:inline-block hover:bg-white/10 px-3 py-1 rounded-sm text-[11px] font-medium">Open in new tab</a>
            <a :href="pdfUrl" download
               class="bg-[#ff0000] hover:bg-[#cc0000] text-white px-3 py-1 rounded-sm text-[11px] font-bold transition-colors">Download</a>
        </div>
    </div>

    <!-- PDF Viewer: wide screens whose browser can show a PDF in a frame -->
    <iframe :src="pdfUrl" :title="fileName || 'PDF viewer'"
            class="grow w-full border-none bg-[#525659] hidden"
            :class="canShowPdf ? 'sm:block' : ''"></iframe>

    <!-- Phones, and browsers with no PDF viewer, get a way to open or save it -->
    <div data-pdf-prompt class="grow flex flex-col items-center justify-center text-center gap-4 p-6 overflow-auto"
         :class="canShowPdf ? 'sm:hidden' : ''">
        <img src="<?php echo IMG_PATH; ?>pdf.webp" alt="" class="w-16 h-16">
        <h2 class="text-base font-semibold break-words max-w-xs" x-text="fileName"></h2>
        <p class="text-sm text-white/80 max-w-xs">This browser cannot show a PDF inside a window. Open it full screen, or save a copy.</p>
        <a :href="pdfUrl" target="_blank" rel="noopener noreferrer" x-text="openLabel"
           class="w-full max-w-xs bg-[#ff0000] hover:bg-[#cc0000] text-white font-semibold rounded-md py-3 px-4"></a>
        <a :href="pdfUrl" download
           class="w-full max-w-xs border border-white/40 hover:bg-white/10 text-white font-semibold rounded-md py-3 px-4">Download</a>
    </div>
</div>
