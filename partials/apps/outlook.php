<!-- partials/apps/outlook.php -->
<div class="h-full flex flex-col bg-white dark:bg-[#1c1c1c] text-black dark:text-white" x-data="outlookApp()">
    <!-- Outlook Header -->
    <div class="h-9 bg-[#0078d4] text-white flex items-center px-4 justify-between shrink-0">
        <div class="flex items-center space-x-4">
            <span class="font-semibold text-sm">Outlook</span>
            <div class="text-xs opacity-80 border-l border-white/20 pl-4 hidden sm:block">New Message</div>
        </div>
        <div class="flex items-center space-x-4 text-xs">
            <span class="cursor-pointer hover:underline">Settings</span>
            <span class="cursor-pointer hover:underline hidden sm:inline">Help</span>
        </div>
    </div>

    <!-- Toolbar -->
    <div class="h-12 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 space-x-2 sm:space-x-6 shrink-0 overflow-x-auto scrollbar-none">
        <button @click="send()" class="flex items-center text-win-blue font-semibold text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 px-3 py-1.5 rounded transition-colors whitespace-nowrap">
            <span class="mr-1 sm:mr-2 text-base">✈️</span> Send Securely
        </button>
        <button @click="sendViaPersonalMail()" class="flex items-center text-gray-600 dark:text-gray-400 font-semibold text-xs hover:bg-gray-100 dark:hover:bg-white/5 px-3 py-1.5 rounded transition-colors whitespace-nowrap">
            <span class="mr-1 sm:mr-2 text-base">📧</span> Send from Personal Mail
        </button>
        <div class="w-px h-6 bg-gray-200 dark:bg-gray-800 hidden sm:block"></div>
        <button @click="triggerAttach()" class="flex items-center text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-white/5 px-3 py-1.5 rounded transition-colors whitespace-nowrap">
            <span class="mr-1 sm:mr-2 text-base">📎</span> Attach
        </button>
        <input type="file" x-ref="fileInput" class="hidden" multiple @change="handleFileSelect($event)">
        <button @click="subject = ''; body = ''; attachments = []" class="flex items-center text-gray-600 dark:text-gray-400 text-xs hover:bg-gray-100 dark:hover:bg-white/5 px-3 py-1.5 rounded transition-colors whitespace-nowrap">
            <span class="mr-1 sm:mr-2 text-base">🗑️</span> Discard
        </button>
    </div>

    <!-- Compose Form -->
    <div class="flex-grow p-6 space-y-4 overflow-y-auto">
        <!-- Honeypot field (hidden from users) -->
        <div class="hidden">
            <input type="text" x-model="honeypot" name="website_hp" autocomplete="off">
        </div>

        <div class="flex items-center border-b border-gray-200 dark:border-gray-800 py-2">
            <label class="w-12 text-xs text-gray-500">To</label>
            <div class="flex-grow flex flex-wrap gap-2">
                <span class="bg-blue-50 dark:bg-blue-900/30 text-win-blue dark:text-blue-300 px-2 py-0.5 rounded-full text-xs flex items-center border border-win-blue/20">
                    <span x-text="recipient"></span>
                </span>
            </div>
        </div>
        <div class="flex items-center border-b border-gray-200 dark:border-gray-800 py-2">
            <label class="w-12 text-xs text-gray-500">Subject</label>
            <input type="text" x-model="subject" class="flex-grow bg-transparent outline-none text-xs dark:text-white">
        </div>
        
        <!-- Attachment List -->
        <template x-if="attachments.length > 0">
            <div class="flex flex-wrap gap-2 pt-2">
                <template x-for="(file, index) in attachments" :key="index">
                    <div class="flex items-center bg-gray-100 dark:bg-white/5 px-2 py-1 rounded text-[10px] border border-gray-200 dark:border-white/10 group">
                        <span class="mr-2">📄</span>
                        <span x-text="file.name" class="max-w-[150px] truncate"></span>
                        <button @click="removeAttachment(index)" class="ml-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                    </div>
                </template>
            </div>
        </template>

        <textarea x-model="body" 
                  placeholder="Type your message here..."
                  class="w-full h-64 bg-transparent outline-none text-sm resize-none mt-4 dark:text-white custom-scrollbar"></textarea>
    </div>
</div>
