<!-- partials/apps/excel.php -->
<div class="h-full flex flex-col bg-white text-black select-none overflow-hidden">
    <!-- Excel Header -->
    <div class="h-9 bg-[#217346] text-white flex items-center px-4 shrink-0 justify-between">
        <div class="flex items-center space-x-4 text-[11px]">
            <img :src="window.portfolioConfig.imgPath + 'excel.webp'" class="w-4 h-4 object-contain brightness-0 invert">
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer">File</span>
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer">Home</span>
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer font-bold border-b-2 border-white">Insert</span>
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer">Page Layout</span>
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer">Formulas</span>
            <span class="hover:bg-white/10 px-2 py-1 rounded cursor-pointer">Data</span>
        </div>
    </div>

    <!-- Formula Bar -->
    <div class="h-8 bg-[#f3f3f3] border-b border-gray-300 flex items-center px-2 space-x-2 shrink-0">
        <div class="w-16 bg-white border border-gray-300 text-[10px] px-2 py-0.5">A1</div>
        <div class="text-gray-400 text-xs italic shrink-0">fx</div>
        <div class="flex-grow bg-white border border-gray-300 text-[10px] px-2 py-0.5 h-6"></div>
    </div>

    <!-- Spreadsheet Grid -->
    <div class="flex-grow overflow-auto bg-[#e6e6e6] custom-scrollbar">
        <table class="w-full border-collapse bg-white">
            <thead>
                <tr>
                    <th class="w-10 bg-[#f3f3f3] border border-gray-300 text-[10px] font-normal"></th>
                    <template x-for="char in ['A','B','C','D','E','F','G','H','I','J','K']">
                        <th class="w-24 bg-[#f3f3f3] border border-gray-300 text-[10px] font-normal py-1" x-text="char"></th>
                    </template>
                </tr>
            </thead>
            <tbody>
                <template x-for="row in Array.from({length: 30}, (_, i) => i + 1)">
                    <tr>
                        <td class="bg-[#f3f3f3] border border-gray-300 text-[10px] text-center" x-text="row"></td>
                        <template x-for="col in 11">
                            <td class="border border-gray-300 p-1 min-h-[22px] focus-within:ring-2 focus-within:ring-[#217346] outline-none" contenteditable="true"></td>
                        </template>
                    </tr>
                </template>
            </tbody>
        </table>
    </div>

    <!-- Status Bar -->
    <div class="h-6 bg-[#217346] text-white px-4 flex items-center justify-between text-[10px] shrink-0">
        <div class="flex items-center space-x-4">
            <span>Ready</span>
            <span class="opacity-60">Sum: 0</span>
        </div>
        <div class="flex items-center space-x-4">
            <span>Sheet1</span>
            <span>100%</span>
        </div>
    </div>
</div>
