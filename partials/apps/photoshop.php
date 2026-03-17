<!-- partials/apps/photoshop.php -->
<div class="h-full flex flex-col bg-[#1e1e1e] text-white select-none overflow-hidden">
    <!-- Photoshop Header -->
    <div class="h-9 bg-[#2b2b2b] border-b border-black/20 flex items-center px-4 shrink-0 justify-between">
        <div class="flex items-center space-x-4 text-[11px]">
            <img :src="window.portfolioConfig.imgPath + 'photoshop.webp'" class="w-4 h-4 object-contain">
            <span class="hover:text-blue-400 cursor-pointer">File</span>
            <span class="hover:text-blue-400 cursor-pointer">Edit</span>
            <span class="hover:text-blue-400 cursor-pointer">Image</span>
            <span class="hover:text-blue-400 cursor-pointer">Layer</span>
            <span class="hover:text-blue-400 cursor-pointer">Type</span>
            <span class="hover:text-blue-400 cursor-pointer">Select</span>
            <span class="hover:text-blue-400 cursor-pointer">Filter</span>
        </div>
    </div>

    <div class="flex-grow flex">
        <!-- Tools Sidebar -->
        <div class="w-10 bg-[#333333] border-r border-black/40 flex flex-col items-center py-4 space-y-4 shrink-0">
            <span class="text-xs opacity-60">📐</span>
            <span class="text-xs opacity-60">🖌️</span>
            <span class="text-xs opacity-60">✂️</span>
            <span class="text-xs opacity-60">🩹</span>
            <span class="text-xs opacity-60">🖋️</span>
            <span class="text-xs opacity-60">🔤</span>
        </div>

        <!-- Canvas Area -->
        <div class="flex-grow bg-[#111111] flex items-center justify-center p-12 relative overflow-hidden">
            <div class="bg-white/5 border border-white/10 w-full h-full rounded shadow-2xl flex flex-col items-center justify-center space-y-6 text-center">
                <img :src="window.portfolioConfig.imgPath + 'photoshop.webp'" class="w-32 h-32 opacity-20">
                <div>
                    <h2 class="text-xl font-bold opacity-40 uppercase tracking-[0.2em]">Adobe Photoshop</h2>
                    <p class="text-xs opacity-20 mt-2">Professional Imaging and Design Workspace</p>
                </div>
            </div>
        </div>

        <!-- Layers Panel -->
        <div class="w-64 bg-[#333333] border-l border-black/40 p-4 space-y-6 hidden lg:block shrink-0">
            <div>
                <div class="text-[10px] font-bold uppercase opacity-40 mb-3 tracking-widest">Properties</div>
                <div class="h-24 bg-black/20 rounded border border-white/5"></div>
            </div>
            <div>
                <div class="text-[10px] font-bold uppercase opacity-40 mb-3 tracking-widest">Layers</div>
                <div class="space-y-2">
                    <div class="flex items-center space-x-3 bg-blue-600/40 p-2 rounded border border-blue-500/20">
                        <span class="text-[10px]">👁️</span>
                        <span class="text-[10px] font-medium">Background.psd</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Status Bar -->
    <div class="h-6 bg-[#2b2b2b] border-t border-black/20 px-4 flex items-center justify-between text-[9px] opacity-40 shrink-0">
        <div>Doc: 1.2M / 4.5M</div>
        <div>100% (RGB/8)</div>
    </div>
</div>
