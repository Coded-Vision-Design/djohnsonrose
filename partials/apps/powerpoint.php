<!-- partials/apps/powerpoint.php -->
<div class="h-full flex flex-col bg-[#f3f3f3] text-black select-none overflow-hidden">
    <!-- PowerPoint Header -->
    <div class="h-9 bg-[#b7472a] text-white flex items-center px-4 shrink-0 justify-between">
        <div class="flex items-center space-x-4 text-[11px]">
            <img :src="window.portfolioConfig.imgPath + 'powerpoint.webp'" class="w-4 h-4 object-contain brightness-0 invert">
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer">File</span>
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer font-bold border-b-2 border-white">Home</span>
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer">Insert</span>
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer">Design</span>
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer">Transitions</span>
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer">Animations</span>
        </div>
    </div>

    <div class="flex-grow flex overflow-hidden">
        <!-- Slides Sidebar -->
        <div class="w-48 bg-white border-r border-gray-300 flex flex-col p-4 space-y-4 shrink-0 overflow-y-auto custom-scrollbar">
            <div class="space-y-1">
                <div class="text-[9px] text-gray-500">1</div>
                <div class="aspect-video bg-[#b7472a]/10 border-2 border-[#b7472a] rounded p-2 flex flex-col space-y-1">
                    <div class="h-2 w-3/4 bg-[#b7472a]/20 rounded"></div>
                    <div class="h-1 w-1/2 bg-[#b7472a]/10 rounded"></div>
                </div>
            </div>
            <div class="space-y-1 opacity-40">
                <div class="text-[9px] text-gray-500">2</div>
                <div class="aspect-video bg-gray-100 border border-gray-200 rounded p-2 flex flex-col space-y-1">
                    <div class="h-2 w-1/2 bg-gray-300 rounded"></div>
                    <div class="h-1 w-3/4 bg-gray-200 rounded"></div>
                </div>
            </div>
        </div>

        <!-- Slide Canvas -->
        <div class="flex-grow flex items-center justify-center p-8 bg-[#dadada] overflow-hidden">
            <div class="aspect-video w-full max-w-3xl bg-white shadow-2xl flex flex-col items-center justify-center p-12 text-center space-y-8">
                <div class="w-full border-2 border-dashed border-gray-200 p-8 rounded hover:border-[#b7472a] transition-colors cursor-text">
                    <h1 class="text-4xl font-bold text-gray-800 outline-none" contenteditable="true">Click to add title</h1>
                </div>
                <div class="w-2/3 border-2 border-dashed border-gray-200 p-4 rounded hover:border-[#b7472a] transition-colors cursor-text">
                    <p class="text-xl text-gray-400 outline-none" contenteditable="true">Click to add subtitle</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Status Bar -->
    <div class="h-6 bg-white border-t border-gray-300 px-4 flex items-center justify-between text-[10px] text-gray-600 shrink-0">
        <div>Slide 1 of 1</div>
        <div class="flex items-center space-x-4">
            <span>English (United Kingdom)</span>
            <span class="flex items-center space-x-1">
                <span>🖥️</span>
                <span>66%</span>
            </span>
        </div>
    </div>
</div>
