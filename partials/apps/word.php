<!-- partials/apps/word.php -->
<div class="h-full flex flex-col bg-[#f3f3f3] dark:bg-[#1c1c1c] select-none" x-data="wordApp()">
    <!-- Word Title Bar (Integrated) -->
    <div class="h-8 bg-[#2b579a] flex items-center px-3 justify-between shrink-0">
        <div class="flex items-center space-x-4">
            <img :src="window.portfolioConfig.imgPath + 'word.webp'" class="w-4 h-4">
            <span class="text-[11px] text-white font-medium">CV.docx - Word</span>
        </div>
        <div class="flex items-center space-x-2">
            <div class="flex items-center bg-white/10 rounded px-2 py-0.5 space-x-2 mr-4">
                <button class="text-white/80 hover:text-white transition-colors" title="Save"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V7l-4-4zm-5 16a3 3 0 110-6 3 3 0 010 6zm3-10H5V5h10v4z"/></svg></button>
                <button class="text-white/80 hover:text-white transition-colors" title="Undo"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg></button>
            </div>
            <span class="text-white/80 text-[11px]">DeVante Johnson-Rose</span>
        </div>
    </div>

    <!-- Word Ribbon -->
    <div class="bg-white dark:bg-[#2b2b2b] border-b border-gray-300 dark:border-gray-800 shrink-0">
        <div class="flex items-center space-x-6 px-4 py-1 text-[11px] font-medium border-b border-gray-100 dark:border-gray-800">
            <span class="cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 px-2 py-0.5 rounded">File</span>
            <span class="text-[#2b579a] border-b-2 border-[#2b579a] pb-0.5 font-bold">Home</span>
            <span class="cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 px-2 py-0.5 rounded">Insert</span>
            <span class="cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 px-2 py-0.5 rounded">Draw</span>
            <span class="cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 px-2 py-0.5 rounded">Design</span>
            <span class="cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 px-2 py-0.5 rounded">Layout</span>
            <span class="cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 px-2 py-0.5 rounded">References</span>
        </div>
        
        <div class="p-2 flex items-center space-x-4 bg-gray-50 dark:bg-[#2d2d2d] overflow-x-auto scrollbar-none shadow-sm">
            <!-- Clipboard Group -->
            <div class="flex flex-col items-center border-r border-gray-300 dark:border-gray-700 pr-3">
                <div class="flex items-center space-x-2 mb-1">
                    <button @click="execCommand('paste')" class="flex flex-col items-center p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded group">
                        <svg class="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                        <span class="text-[9px] mt-0.5">Paste</span>
                    </button>
                    <div class="flex flex-col space-y-1">
                        <button @click="execCommand('cut')" class="flex items-center space-x-1 p-0.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded">
                            <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758L5 19m0-14l4.121 4.121"/></svg>
                            <span class="text-[9px]">Cut</span>
                        </button>
                        <button @click="execCommand('copy')" class="flex items-center space-x-1 p-0.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded">
                            <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/></svg>
                            <span class="text-[9px]">Copy</span>
                        </button>
                    </div>
                </div>
                <span class="text-[8px] text-gray-400 uppercase">Clipboard</span>
            </div>

            <!-- Font Group -->
            <div class="flex flex-col items-center border-r border-gray-300 dark:border-gray-700 pr-3">
                <div class="flex flex-col space-y-1 mb-1">
                    <div class="flex items-center space-x-1">
                        <select x-model="fontFamily" @change="execCommand('fontName', fontFamily)" class="bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded px-1 py-0.5 text-[10px] w-24 outline-none">
                            <option value="Calibri">Calibri</option>
                            <option value="Arial">Arial</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Segoe UI">Segoe UI</option>
                        </select>
                        <select x-model="fontSize" @change="execCommand('fontSize', fontSize)" class="bg-white dark:bg-black/20 border border-gray-300 dark:border-white/10 rounded px-1 py-0.5 text-[10px] w-10 outline-none">
                            <option value="1">8</option>
                            <option value="2">10</option>
                            <option value="3">12</option>
                            <option value="4">14</option>
                            <option value="5">18</option>
                            <option value="6">24</option>
                            <option value="7">36</option>
                        </select>
                    </div>
                    <div class="flex items-center space-x-0.5">
                        <button @click="execCommand('bold')" :class="isBold ? 'bg-win-blue/20 ring-1 ring-win-blue' : ''" class="w-6 h-6 font-bold hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs transition-all">B</button>
                        <button @click="execCommand('italic')" :class="isItalic ? 'bg-win-blue/20 ring-1 ring-win-blue' : ''" class="w-6 h-6 italic hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs transition-all">I</button>
                        <button @click="execCommand('underline')" :class="isUnderline ? 'bg-win-blue/20 ring-1 ring-win-blue' : ''" class="w-6 h-6 underline hover:bg-gray-200 dark:hover:bg-white/10 rounded text-xs transition-all">U</button>
                        <div class="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                        <button @click="execCommand('foreColor', '#ff0000')" class="w-6 h-6 flex flex-col items-center justify-center hover:bg-gray-200 dark:hover:bg-white/10 rounded">
                            <span class="text-xs font-bold leading-none">A</span>
                            <div class="w-3 h-0.5 bg-red-600 mt-0.5"></div>
                        </button>
                    </div>
                </div>
                <span class="text-[8px] text-gray-400 uppercase">Font</span>
            </div>

            <!-- Paragraph Group -->
            <div class="flex flex-col items-center border-r border-gray-300 dark:border-gray-700 pr-3">
                <div class="flex flex-col space-y-1 mb-1">
                    <div class="flex items-center space-x-1">
                        <button @click="execCommand('insertUnorderedList')" class="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg></button>
                        <button @click="execCommand('insertOrderedList')" class="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm1 3H2v1h2v.5H3v1h1v.5H2v1h3v-4H2v1zM7 5v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg></button>
                    </div>
                    <div class="flex items-center space-x-1">
                        <button @click="execCommand('justifyLeft')" :class="alignment === 'left' ? 'bg-win-blue/20 ring-1 ring-win-blue' : ''" class="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M15 15H3v2h12v-2zm0-8H3v2h12V7zM3 13h18v-2H3v2zm0 8h18v-2H3v2zM3 3v2h18V3H3z"/></svg></button>
                        <button @click="execCommand('justifyCenter')" :class="alignment === 'center' ? 'bg-win-blue/20 ring-1 ring-win-blue' : ''" class="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M7 15v2h10v-2H7zm-4-4v2h18v-2H3zm4-4v2h10V7H7zm-4-4v2h18V3H3zm4 16v2h10v-2H7z"/></svg></button>
                        <button @click="execCommand('justifyRight')" :class="alignment === 'right' ? 'bg-win-blue/20 ring-1 ring-win-blue' : ''" class="p-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded"><svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M21 15h-12v2h12v-2zm0-8h-12v2h12V7zM3 11h18v2H3v-2zm0 8h18v2H3v-2zM3 3h18v2H3V3z"/></svg></button>
                    </div>
                </div>
                <span class="text-[8px] text-gray-400 uppercase">Paragraph</span>
            </div>

            <!-- Styles Group -->
            <div class="flex flex-col items-center border-r border-gray-300 dark:border-gray-700 pr-3">
                <div class="flex items-center space-x-2 mb-1">
                    <div class="border-2 border-[#2b579a] p-1 bg-white dark:bg-black/20 text-[10px] w-16 h-10 flex flex-col justify-between hover:bg-gray-100 cursor-pointer">
                        <span class="font-bold">AaBbCc</span>
                        <span class="text-[8px] opacity-70">Normal</span>
                    </div>
                    <div class="border border-gray-300 dark:border-gray-700 p-1 bg-white dark:bg-black/20 text-[10px] w-16 h-10 flex flex-col justify-between hover:bg-gray-100 cursor-pointer text-[#2b579a]">
                        <span class="font-bold text-lg leading-none">AaBbCc</span>
                        <span class="text-[8px] opacity-70">Title</span>
                    </div>
                </div>
                <span class="text-[8px] text-gray-400 uppercase">Styles</span>
            </div>

            <!-- Editing Group -->
            <div class="flex flex-col items-center">
                <div class="flex flex-col space-y-0.5 mb-1">
                    <button class="flex items-center space-x-1 px-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">
                        <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                        <span class="text-[9px]">Find</span>
                    </button>
                    <button class="flex items-center space-x-1 px-1 hover:bg-gray-200 dark:hover:bg-white/10 rounded">
                        <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        <span class="text-[9px]">Replace</span>
                    </button>
                </div>
                <span class="text-[8px] text-gray-400 uppercase">Editing</span>
            </div>

            <div class="ml-auto">
                <button @click="print()" class="text-[11px] bg-[#2b579a] text-white px-4 py-1.5 rounded-sm hover:bg-[#1e3e6d] transition-colors font-medium flex items-center space-x-2">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
                    <span>Print PDF</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Document Area -->
    <div class="flex-grow overflow-y-auto p-4 sm:p-12 flex justify-center bg-[#e6e6e6] dark:bg-[#202020] custom-scrollbar">
        <div class="w-full max-w-[816px] min-h-[1056px] bg-white text-black shadow-2xl p-16 sm:p-24 outline-none pointer-events-auto origin-top transition-transform"
             id="word-editor"
             contenteditable="true"
             spellcheck="false"
             @input="content = $event.target.innerHTML"
             @mouseup="updateState()"
             @keyup="updateState()">
            <div id="word-document-content" class="font-serif">
                <?php include __DIR__ . '/../../data/cv.php'; ?>
            </div>
        </div>
    </div>

    <!-- Word Status Bar -->
    <div class="h-6 bg-[#2b579a] flex items-center px-4 justify-between shrink-0 text-white text-[10px]">
        <div class="flex items-center space-x-4">
            <span>Page 1 of 1</span>
            <span x-text="(content.trim().split(/\s+/).filter(w => w.length > 0).length) + ' words'"></span>
            <span>English (United Kingdom)</span>
        </div>
        <div class="flex items-center space-x-4">
            <span>Focus</span>
            <div class="flex items-center space-x-2">
                <span>100%</span>
                <div class="w-20 h-1 bg-white/20 rounded-full relative">
                    <div class="absolute inset-y-0 left-0 w-1/2 bg-white rounded-full"></div>
                    <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow"></div>
                </div>
            </div>
        </div>
    </div>
</div>
