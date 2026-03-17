<!-- partials/apps/settings.php -->
<div class="h-full flex text-black dark:text-white" :class="isMobile ? 'flex-col bg-white dark:bg-[#1c1c1c]' : 'bg-[#f3f3f3] dark:bg-[#202020]'" x-data="settingsApp()">
    <!-- Sidebar -->
    <div :class="isMobile ? 'w-full border-b flex overflow-x-auto p-2 space-x-2 shrink-0' : 'w-64 border-r p-4 space-y-2'" class="border-gray-300 dark:border-gray-700">
        <div class="flex items-center space-x-3 p-3 mb-6" x-show="!isMobile">
            <img :src="user.avatar" class="w-12 h-12 rounded-full">
            <div>
                <div class="font-semibold text-sm" x-text="user.name"></div>
                <div class="text-[10px] text-gray-500">Local Account</div>
            </div>
        </div>
        <template x-for="item in nav">
            <button @click="currentTab = item.id" 
                    :class="{'bg-white dark:bg-white/10 shadow-sm': currentTab === item.id, 'px-4 py-2 rounded-full whitespace-nowrap text-[10px]': isMobile, 'w-full text-left px-3 py-2 rounded-md text-xs': !isMobile}"
                    class="font-medium flex items-center transition-all border border-transparent"
                    :class="isMobile && currentTab === item.id ? 'border-win-blue text-win-blue' : ''">
                <span :class="isMobile ? 'mr-1 text-sm' : 'mr-3 text-lg'" x-text="item.icon"></span>
                <span x-text="item.label"></span>
            </button>
        </template>
    </div>

    <!-- Content -->
    <div class="flex-grow overflow-y-auto" :class="isMobile ? 'p-4' : 'p-10'">
        <h1 class="font-semibold mb-8" :class="isMobile ? 'text-xl mb-4' : 'text-3xl'" x-text="nav.find(i => i.id === currentTab).label"></h1>
        
        <!-- System Tab -->
        <div x-show="currentTab === 'system'" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="glass p-6 rounded-lg border border-gray-200 dark:border-white/10">
                    <div class="text-xs font-bold uppercase text-gray-400 mb-2">Technical Status</div>
                    <div class="text-xl font-bold text-win-blue">Experience Level: Senior</div>
                    <div class="text-xs text-gray-500 mt-1">Specialising in Scalable Architectures</div>
                </div>
                <div class="glass p-6 rounded-lg border border-gray-200 dark:border-white/10">
                    <div class="text-xs font-bold uppercase text-gray-400 mb-2">Operational Scope</div>
                    <div class="text-xl font-bold text-win-blue">Environments Managed: Enterprise</div>
                    <div class="text-xs text-gray-500 mt-1">High-Availability Cloud Infrastructure</div>
                </div>
            </div>

            <div class="glass p-6 rounded-lg flex items-center justify-between border border-gray-200 dark:border-white/10">
                <div class="flex items-center">
                    <span class="text-2xl mr-4">🔊</span>
                    <div>
                        <div class="font-medium">System Sounds</div>
                        <div class="text-xs text-gray-500">Enable or disable UI sound effects</div>
                    </div>
                </div>
                <button @click="toggleSound()" 
                        :class="Alpine.store('os').settings.sound ? 'bg-win-blue' : 'bg-gray-400'"
                        class="w-12 h-6 rounded-full relative transition-colors">
                    <div :class="Alpine.store('os').settings.sound ? 'translate-x-7' : 'translate-x-1'" 
                         class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
                </button>
            </div>
            
            <div class="glass p-6 rounded-lg flex items-center justify-between border border-gray-200 dark:border-white/10">
                <div class="flex items-center">
                    <span class="text-2xl mr-4">🌙</span>
                    <div>
                        <div class="font-medium">Dark Mode</div>
                        <div class="text-xs text-gray-500">Switch between light and dark themes</div>
                    </div>
                </div>
                <button @click="toggleTheme()" 
                        :class="Alpine.store('os').settings.theme === 'dark' ? 'bg-win-blue' : 'bg-gray-400'"
                        class="w-12 h-6 rounded-full relative transition-colors">
                    <div :class="Alpine.store('os').settings.theme === 'dark' ? 'translate-x-7' : 'translate-x-1'" 
                         class="absolute top-1 w-4 h-4 bg-white rounded-full transition-transform"></div>
                </button>
            </div>
        </div>

        <!-- Personalisation Tab -->
        <div x-show="currentTab === 'personalisation'" class="space-y-6" x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0 translate-y-4" x-transition:enter-end="opacity-100 translate-y-0">
            <!-- Current Wallpaper Preview -->
            <div class="glass p-6 rounded-lg border border-gray-200 dark:border-white/10 flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-8">
                <div class="w-full md:w-64 aspect-video rounded-lg overflow-hidden border-4 border-white/20 shadow-2xl relative">
                    <div class="absolute inset-0 bg-cover bg-center transition-all duration-500" :style="'background-image: url(' + (selectedWallpaper || Alpine.store('os').settings.wallpaper) + ')'"></div>
                    <!-- Mock Taskbar in preview -->
                    <div class="absolute bottom-0 inset-x-0 h-2 bg-white/20 backdrop-blur-md"></div>
                </div>
                <div class="flex-grow">
                    <h2 class="text-xl font-semibold mb-1">Background</h2>
                    <p class="text-xs text-gray-500 mb-4">Select a picture to preview, then click Save to apply it.</p>
                    <div class="flex items-center space-x-4">
                        <button @click="saveWallpaper()" 
                                :disabled="!selectedWallpaper || selectedWallpaper === Alpine.store('os').settings.wallpaper"
                                class="bg-win-blue text-white px-6 py-1.5 rounded text-xs font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                            Save Changes
                        </button>
                        <button @click="selectedWallpaper = Alpine.store('os').settings.wallpaper"
                                x-show="selectedWallpaper && selectedWallpaper !== Alpine.store('os').settings.wallpaper"
                                class="text-xs hover:underline opacity-60">
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <template x-for="wp in wallpapers" :key="wp.id">
                    <div @click="setWallpaper(wp.url)" 
                         class="cursor-pointer group relative rounded-md overflow-hidden aspect-square border-2 transition-all hover:scale-105"
                         :class="(selectedWallpaper || Alpine.store('os').settings.wallpaper) === wp.url ? 'border-win-blue ring-2 ring-win-blue/20 shadow-lg' : 'border-transparent hover:border-gray-400'">
                        <div class="absolute inset-0 bg-cover bg-center" :style="'background-image: url(' + wp.url + '); background-color: #333;'"></div>
                        <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    </div>
                </template>
            </div>
        </div>

        <!-- Experience Tab -->
        <div x-show="currentTab === 'experience'" class="space-y-6" x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0 translate-y-4" x-transition:enter-end="opacity-100 translate-y-0">
            <div class="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-win-blue/20 before:to-transparent">
                <template x-for="job in experience" :key="job.id">
                    <div class="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <!-- Icon / Logo -->
                        <div class="flex items-center justify-center w-12 h-12 rounded-full border border-win-blue bg-white dark:bg-[#202020] text-win-blue shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 overflow-hidden">
                            <template x-if="job.logo">
                                <img :src="window.portfolioConfig.basePath + job.logo" class="w-8 h-8 object-contain">
                            </template>
                            <template x-if="!job.logo">
                                <span class="text-sm font-bold" x-text="job.id"></span>
                            </template>
                        </div>
                        <!-- Content -->
                        <div class="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass p-6 rounded-lg border border-gray-200 dark:border-white/10 shadow-sm transition-all hover:border-win-blue/50">
                            <div class="flex items-center justify-between space-x-2 mb-1">
                                <div class="font-bold dark:text-white text-base" x-text="job.role"></div>
                                <time class="font-mono text-[10px] text-win-blue font-bold whitespace-nowrap bg-win-blue/10 px-2 py-0.5 rounded" x-text="job.period"></time>
                            </div>
                            <div class="text-win-blue text-xs font-semibold mb-3" x-text="job.company"></div>
                            <div class="text-xs text-gray-500 leading-relaxed" x-text="job.highlights"></div>
                        </div>
                    </div>
                </template>
            </div>
        </div>

        <!-- Qualifications Tab -->
        <div x-show="currentTab === 'qualifications'" class="space-y-6" x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0 translate-y-4" x-transition:enter-end="opacity-100 translate-y-0">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-6 glass rounded-lg border border-gray-200 dark:border-white/10 col-span-full">
                    <h3 class="text-lg font-bold mb-4 flex items-center">
                        <span class="mr-3">🏫</span> Academic Specialist
                    </h3>
                    <div class="space-y-4">
                        <div class="flex items-start space-x-4 p-4 bg-win-blue/5 rounded-lg border border-win-blue/10">
                            <div class="text-2xl">🎓</div>
                            <div>
                                <div class="font-bold text-sm">Bsc (Hons) Business Computing 2:1</div>
                                <div class="text-xs text-gray-500">University of East Anglia</div>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div class="p-4 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10">
                                <div class="font-bold text-xs">Level 3 Extended Diploma</div>
                                <div class="text-[10px] text-gray-500">ICT Systems and Principles</div>
                            </div>
                            <div class="p-4 bg-black/5 dark:bg-white/5 rounded-lg border border-black/10 dark:border-white/10">
                                <div class="font-bold text-xs">Level 3 Diploma</div>
                                <div class="text-[10px] text-gray-500">Professional Competence for IT/Telecoms</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="p-6 glass rounded-lg border border-gray-200 dark:border-white/10 col-span-full">
                    <h3 class="text-lg font-bold mb-4 flex items-center">
                        <span class="mr-3">📜</span> Certifications
                    </h3>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <template x-for="cert in certs" :key="cert.id">
                            <div class="p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg flex flex-col justify-between transition-all hover:shadow-md hover:border-win-blue/30 group">
                                <div class="font-bold text-xs mb-1 group-hover:text-win-blue transition-colors" x-text="cert.name"></div>
                                <div class="text-[10px] text-gray-500 uppercase tracking-widest" x-text="cert.issuer"></div>
                            </div>
                        </template>
                    </div>
                </div>
            </div>
        </div>

        <!-- About Tab -->
        <div x-show="currentTab === 'about'" class="space-y-6" x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0 translate-y-4" x-transition:enter-end="opacity-100 translate-y-0">
            <div class="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
                <div class="flex items-center space-x-4 mb-6">
                    <img :src="user.avatar" class="w-20 h-20 rounded-full border-4 border-win-blue/20">
                    <div>
                        <h2 class="text-2xl font-bold" x-text="user.name"></h2>
                        <p class="text-sm text-win-blue font-medium">Senior Desktop Developer & 3rd Line Engineer</p>
                    </div>
                </div>
                
                <div class="space-y-6">
                    <div>
                        <div class="font-bold text-xs uppercase text-gray-400 mb-2">Who am I?</div>
                        <p class="text-sm leading-relaxed opacity-80" x-text="summary"></p>
                    </div>

                    <div>
                        <div class="font-bold text-xs uppercase text-gray-400 mb-2">Career philosophy</div>
                        <p class="text-sm leading-relaxed opacity-80" x-text="philosophy"></p>
                    </div>
                </div>
            </div>

            <!-- Technical Expertise -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
                    <div class="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">Frameworks & Technologies</div>
                    <div class="flex flex-wrap gap-2">
                        <template x-for="tech in skills.frameworks">
                            <span class="px-2 py-1 bg-win-blue/10 border border-win-blue/20 rounded text-[10px] font-medium" x-text="tech"></span>
                        </template>
                    </div>
                </div>
                <div class="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
                    <div class="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">Tools & Infrastructure</div>
                    <div class="flex flex-wrap gap-2">
                        <template x-for="tool in skills.tools">
                            <span class="px-2 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[10px] font-medium" x-text="tool"></span>
                        </template>
                    </div>
                </div>
                <div class="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
                    <div class="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">Operations & Management</div>
                    <div class="flex flex-wrap gap-2">
                        <template x-for="op in skills.operations">
                            <span class="px-2 py-1 bg-win-blue/10 border border-win-blue/20 rounded text-[10px] font-medium" x-text="op"></span>
                        </template>
                    </div>
                </div>
                <div class="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
                    <div class="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">API Integration</div>
                    <div class="flex flex-wrap gap-2">
                        <template x-for="api in skills.apis">
                            <span class="px-2 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[10px] font-medium" x-text="api"></span>
                        </template>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
                    <div class="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">Core Skillset Highlights</div>
                    <div class="space-y-2">
                        <template x-for="skill in ['Active Directory / Group Policy', 'Windows / Mac OS', 'Microsoft Office 365', 'Imaging / SCCM / JAMF', 'RAID / Backup / DR', 'iOS / iPadOS / MDM', 'Azure / Cloud Ops', 'SQL / Stored Procedures', 'Docker / Virtualisation']">
                            <div class="flex items-center text-xs opacity-80">
                                <span class="text-win-blue mr-2">✔</span>
                                <span x-text="skill"></span>
                            </div>
                        </template>
                    </div>
                </div>
                <div class="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
                    <div class="font-bold text-xs uppercase text-gray-400 mb-4 tracking-wider">Interests & Human Profile</div>
                    <div class="flex flex-wrap gap-2">
                        <template x-for="interest in ['Technology', 'Fitness', 'MMA', 'IOT', 'Automation', 'Virtualisation', 'Photography', 'Athletics', 'Rugby', 'Brazilian Jiu-Jitsu']">
                            <span class="px-2 py-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded text-[10px] font-medium" x-text="interest"></span>
                        </template>
                    </div>
                </div>
            </div>

            <div class="p-6 glass rounded-lg border border-gray-200 dark:border-white/10">
                <div class="font-bold text-lg mb-4 text-win-blue">Home Lab specifications</div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div class="space-y-1">
                        <div class="text-[10px] uppercase text-gray-500">Device name</div>
                        <div class="text-sm dark:text-white font-medium">DEVANTE-HOMELAB</div>
                    </div>
                    <div class="space-y-1">
                        <div class="text-[10px] uppercase text-gray-500">Processor</div>
                        <div class="text-sm dark:text-white font-medium">AMD Ryzen 7 9800X3D (8-Core, 16-Thread)</div>
                    </div>
                    <div class="space-y-1">
                        <div class="text-[10px] uppercase text-gray-500">Installed RAM</div>
                        <div class="text-sm dark:text-white font-medium">128 GB DDR5 6000MHz</div>
                    </div>
                    <div class="space-y-1">
                        <div class="text-[10px] uppercase text-gray-500">Graphics Card</div>
                        <div class="text-sm dark:text-white font-medium">NVIDIA GeForce RTX 5070 Ti</div>
                    </div>
                    <div class="space-y-1">
                        <div class="text-[10px] uppercase text-gray-500">Storage</div>
                        <div class="text-sm dark:text-white font-medium">4TB NVMe PCIe Gen 5 SSD</div>
                    </div>
                    <div class="space-y-1">
                        <div class="text-[10px] uppercase text-gray-500">System type</div>
                        <div class="text-sm dark:text-white font-medium">64-bit Full-Stack Home Lab Architecture</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</div>
