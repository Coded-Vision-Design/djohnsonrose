<!-- partials/apps/paint.php -->
<div class="h-full flex flex-col bg-[#f0f0f0] dark:bg-[#202020] select-none" x-data="paintApp()">
    <!-- Paint Ribbon UI -->
    <div class="bg-white dark:bg-[#2d2d2d] border-b border-gray-300 dark:border-gray-700 flex flex-col shadow-sm">
        <!-- Top Tabs -->
        <div class="flex items-center px-4 pt-1 space-x-6 text-[11px] font-medium border-b border-gray-100 dark:border-gray-800">
            <span class="text-win-blue border-b-2 border-win-blue pb-1 px-1 cursor-default">File</span>
            <span class="text-win-blue border-b-2 border-win-blue pb-1 px-1 cursor-default">Home</span>
            <span class="text-gray-500 pb-1 px-1 cursor-not-allowed">View</span>
        </div>
        
        <!-- Ribbon Content -->
        <div class="flex items-center p-2 space-x-4 h-24 overflow-x-auto">
            <!-- Clipboard & History Group -->
            <div class="flex flex-col items-center border-r border-gray-200 dark:border-gray-700 pr-4 h-full justify-between">
                <div class="flex items-center space-x-2">
                    <button @click="undo()" :disabled="historyStep <= 0" class="p-2 rounded hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all active:scale-90" title="Undo (Ctrl+Z)">
                        ↩️
                    </button>
                    <button @click="redo()" :disabled="historyStep >= history.length - 1" class="p-2 rounded hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 transition-all active:scale-90" title="Redo (Ctrl+Y)">
                        ↪️
                    </button>
                </div>
                <span class="text-[9px] uppercase text-gray-400">History</span>
            </div>

            <!-- Tools Group -->
            <div class="flex flex-col items-center border-r border-gray-200 dark:border-gray-700 pr-4 h-full justify-between">
                <div class="grid grid-cols-3 gap-1">
                    <button @click="tool = 'pencil'" :class="tool === 'pencil' ? 'bg-blue-100 dark:bg-blue-900/50 border-win-blue' : 'border-transparent'" class="p-1.5 rounded border hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" title="Pencil">✏️</button>
                    <button @click="tool = 'fill'" :class="tool === 'fill' ? 'bg-blue-100 dark:bg-blue-900/50 border-win-blue' : 'border-transparent'" class="p-1.5 rounded border hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" title="Fill">🪣</button>
                    <button @click="tool = 'text'" :class="tool === 'text' ? 'bg-blue-100 dark:bg-blue-900/50 border-win-blue' : 'border-transparent'" class="p-1.5 rounded border hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" title="Text">A</button>
                    <button @click="tool = 'eraser'" :class="tool === 'eraser' ? 'bg-blue-100 dark:bg-blue-900/50 border-win-blue' : 'border-transparent'" class="p-1.5 rounded border hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" title="Eraser">🧽</button>
                    <button @click="tool = 'picker'" :class="tool === 'picker' ? 'bg-blue-100 dark:bg-blue-900/50 border-win-blue' : 'border-transparent'" class="p-1.5 rounded border hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" title="Color Picker">🧪</button>
                    <button @click="tool = 'zoom'" :class="tool === 'zoom' ? 'bg-blue-100 dark:bg-blue-900/50 border-win-blue' : 'border-transparent'" class="p-1.5 rounded border hover:bg-gray-100 dark:hover:bg-white/5 transition-colors" title="Zoom">🔍</button>
                </div>
                <span class="text-[9px] uppercase text-gray-400">Tools</span>
            </div>

            <!-- Size Selection -->
            <div class="flex flex-col items-center border-r border-gray-200 dark:border-gray-700 pr-4 h-full justify-between">
                <div class="flex flex-col items-center py-1">
                    <input type="range" x-model="size" min="1" max="50" class="w-20 accent-win-blue cursor-pointer">
                    <div class="flex items-center justify-center h-8 w-8 mt-1">
                        <div class="bg-black dark:bg-white rounded-full" :style="`width: ${size/2}px; height: ${size/2}px`" style="text-align: center"></div>
                    </div>
                </div>
                <span class="text-[9px] uppercase text-gray-400">Size</span>
            </div>

            <!-- Colors -->
            <div class="flex flex-col items-center h-full justify-between">
                <div class="flex items-center space-x-3">
                    <div class="flex flex-col items-center">
                        <div class="w-10 h-10 rounded border-2 border-white dark:border-gray-600 shadow-inner overflow-hidden">
                            <input type="color" x-model="color" class="w-14 h-14 -m-2 cursor-pointer border-none bg-transparent">
                        </div>
                        <span class="text-[8px] mt-1">Color 1</span>
                    </div>
                    
                    <div class="grid grid-cols-5 sm:grid-cols-10 gap-1">
                        <template x-for="c in palette">
                            <div @click="color = c" 
                                 :style="`background-color: ${c}`"
                                 class="w-4 h-4 rounded-sm border border-gray-300 dark:border-gray-600 cursor-pointer hover:scale-125 transition-transform shadow-sm">
                            </div>
                        </template>
                    </div>
                </div>
                <span class="text-[9px] uppercase text-gray-400">Colors</span>
            </div>

            <div class="flex-grow"></div>

            <!-- Actions -->
            <div class="flex flex-col items-end space-y-2 pr-4">
                <button @click="clearCanvas()" class="text-[10px] px-3 py-1 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">Clear</button>
                <button @click="download()" class="text-[10px] px-3 py-1 rounded bg-win-blue text-white hover:bg-blue-600 transition-colors font-medium">Save PNG</button>
            </div>
        </div>
    </div>

    <!-- Canvas Area -->
    <div class="flex-grow overflow-auto p-2 sm:p-12 flex items-center justify-center bg-[#dbdbdb] dark:bg-[#111111] relative scrollbar-thin">
        <div class="bg-white shadow-2xl relative" x-ref="canvasContainer" :style="`width: ${canvasSize.w}px; height: ${canvasSize.h}px`" style="text-align: center">
            <canvas x-ref="canvas" 
                    :class="tool === 'fill' ? 'cursor-alias' : (tool === 'picker' ? 'cursor-cell' : 'cursor-crosshair')"
                    @mousedown="startAction($event)"
                    @mousemove="doAction($event)"
                    @mouseup="stopAction()"
                    @mouseleave="stopAction()">
            </canvas>
            
            <!-- Resizer Handles -->
            <div class="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-gray-500 cursor-nwse-resize z-10 shadow-sm" @mousedown.stop="startCanvasResize('both', $event)"></div>
            <div class="absolute top-1/2 -right-1.5 w-2 h-3 bg-white border border-gray-500 cursor-ew-resize -translate-y-1/2 z-10 shadow-sm" @mousedown.stop="startCanvasResize('width', $event)"></div>
            <div class="absolute bottom-1.5 right-1/2 w-3 h-2 bg-white border border-gray-500 cursor-ns-resize translate-x-1/2 z-10 shadow-sm" @mousedown.stop="startCanvasResize('height', $event)"></div>
        </div>
    </div>

    <!-- Status Bar -->
    <div class="h-6 bg-[#f3f3f3] dark:bg-[#2b2b2b] border-t border-gray-300 dark:border-gray-700 flex items-center px-4 justify-between text-[10px] text-gray-600 dark:text-gray-400 shrink-0">
        <div class="flex items-center space-x-6">
            <div class="flex items-center">
                <span class="mr-2 opacity-70">📍</span>
                <span x-text="mousePos.x + ', ' + mousePos.y + 'px'"></span>
            </div>
            <div class="flex items-center">
                <span class="mr-2 opacity-70">🖼️</span>
                <span x-text="canvasSize.w + ' x ' + canvasSize.h + 'px'"></span>
            </div>
        </div>
        <div class="flex items-center space-x-4">
            <span class="font-medium">100%</span>
            <div class="w-24 h-1 bg-gray-300 dark:bg-gray-700 rounded-full relative">
                <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-gray-400 rounded-full shadow-sm"></div>
            </div>
        </div>
    </div>

    <script>
        // App scripts moved to alpine-init.js for global availability
    </script>
</div>
