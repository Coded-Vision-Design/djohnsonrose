<!-- partials/apps/flstudio.php -->
<div class="h-full flex flex-col bg-[#202529] text-[#7c868e] select-none overflow-hidden font-['Segoe_UI']" 
     x-data="flstudioApp"
     @click="setupAudio(); if (audioContext && audioContext.state === 'suspended') audioContext.resume()"
     @mousemove="handleGlobalMouseMove($event)"
     @mouseup="isDraggingSlider = false; activeSliderTrack = null; endClipDrag()"
     @contextmenu.prevent="showFLContextMenu($event, 'global')">
    
    <!-- FL Hint Panel / Menu Bar -->
    <div class="h-6 bg-[#181c1f] border-b border-black/40 flex items-center px-2 text-[11px] justify-between shrink-0">
        <div class="flex items-center space-x-4">
            <div class="flex items-center space-x-2 text-gray-400">
                <span class="hover:text-white cursor-pointer font-bold text-[#ff6600]">FL</span>
                <span @click="exportProject()" class="hover:text-white cursor-pointer px-1 bg-win-blue/20 rounded border border-win-blue/30 text-win-blue" :class="isRecording ? 'animate-pulse' : ''">EXPORT WAV</span>
                <span class="hover:text-white cursor-pointer">FILE</span>
                <span class="hover:text-white cursor-pointer">EDIT</span>
                <span class="hover:text-white cursor-pointer">ADD</span>
                <span class="hover:text-white cursor-pointer">VIEW</span>
                <span class="hover:text-white cursor-pointer text-[#00ccff]">HELP</span>
            </div>
            <div class="h-3 w-px bg-white/10"></div>
            <div class="text-[10px] text-gray-500 italic truncate max-w-[300px]" x-text="hintText"></div>
        </div>
        <div class="flex items-center space-x-3 text-[10px]">
            <span x-text="new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})"></span>
        </div>
    </div>

    <!-- Main Toolbar -->
    <div class="h-16 bg-[#252a2e] border-b border-black/60 flex items-center px-2 space-x-2 shrink-0 shadow-lg relative z-10">
        <!-- Playback Section -->
        <div class="flex items-center space-x-1 bg-black/30 p-1.5 rounded-sm border border-white/5 shadow-inner h-12">
            <button @click="playing = !playing" 
                    :class="playing ? 'text-[#00ff00] drop-shadow-[0_0_8px_rgba(0,255,0,0.5)]' : 'text-gray-500 hover:text-white'" 
                    class="p-1.5 transition-all">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button @click="playing = false" class="p-1.5 text-gray-500 hover:text-white transition-all">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <button @click="playing = false; currentStep = 0; songStep = 0" class="p-1.5 text-gray-500 hover:text-white transition-all">
                <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
            </button>
            <div class="w-px h-8 bg-white/10 mx-1"></div>
            <div class="flex flex-col items-center justify-center px-2 min-w-[60px]">
                <div class="text-[9px] text-[#ff6600] font-bold opacity-70 leading-none">BPM</div>
                <input type="number" x-model.number="bpm" class="bg-transparent text-lg font-mono text-[#ff6600] w-12 text-center focus:outline-none focus:bg-black/20 rounded cursor-ns-resize" step="1" min="40" max="999">
            </div>
        </div>

        <!-- Pattern / Song Mode -->
        <div class="flex flex-col space-y-0.5 bg-black/20 p-1 rounded border border-white/5 h-12 justify-center px-3">
            <div class="flex items-center space-x-2 cursor-pointer" @click="mode = 'pattern'; hintText = 'Switched to Pattern mode'">
                <div class="w-2 h-2 rounded-full transition-colors" :class="mode === 'pattern' ? 'bg-[#ff6600]' : 'bg-gray-600'"></div>
                <span class="text-[10px] font-bold" :class="mode === 'pattern' ? 'text-gray-300' : 'text-gray-500'">PAT</span>
            </div>
            <div class="flex items-center space-x-2 cursor-pointer" @click="mode = 'song'; hintText = 'Switched to Song mode'">
                <div class="w-2 h-2 rounded-full transition-colors" :class="mode === 'song' ? 'bg-[#ff6600]' : 'bg-gray-600'"></div>
                <span class="text-[10px] font-bold" :class="mode === 'song' ? 'text-gray-300' : 'text-gray-500'">SONG</span>
            </div>
        </div>

        <!-- Time Display -->
        <div class="bg-black/50 px-4 h-12 rounded border border-white/10 shadow-inner flex items-center justify-center min-w-[120px]">
            <div class="text-2xl font-mono text-[#00ccff] tracking-widest" 
                 x-text="mode === 'pattern' ? (Math.floor(currentStep / 4 + 1) + ':' + (currentStep % 4 + 1) + ':00') : (Math.floor(songStep / 16 + 1) + ':' + (Math.floor((songStep % 16) / 4) + 1) + ':' + ((songStep % 4) + 1))"></div>
        </div>

        <!-- Main Tool Switchers -->
        <div class="flex items-center space-x-1 bg-black/20 p-1 rounded border border-white/5 h-12">
            <button @click="showPlaylist = !showPlaylist" :class="showPlaylist ? 'bg-white/10' : ''" class="p-2 hover:bg-white/10 rounded transition-colors" title="Playlist">
                <svg class="w-5 h-5" :class="showPlaylist ? 'text-[#00ccff]' : 'text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/></svg>
            </button>
            <button @click="showChannelRack = !showChannelRack" :class="showChannelRack ? 'bg-white/10' : ''" class="p-2 hover:bg-white/10 rounded transition-colors" title="Channel Rack">
                <svg class="w-5 h-5" :class="showChannelRack ? 'text-[#ff6600]' : 'text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2zM4 21a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1v-2z"/></svg>
            </button>
            <button @click="showMixer = !showMixer" :class="showMixer ? 'bg-white/10' : ''" class="p-2 hover:bg-white/10 rounded transition-colors" title="Mixer">
                <svg class="w-5 h-5" :class="showMixer ? 'text-gray-300' : 'text-gray-500'" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
            </button>
        </div>

        <!-- Visualizer Area (Mock) -->
        <div class="flex-grow flex items-center justify-end px-4 space-x-4">
            <div class="flex items-center space-x-1 opacity-40">
                <template x-for="i in 20">
                    <div class="w-1 bg-[#00ff00]" :style="`height: ${Math.random() * 40 + 5}px; opacity: ${playing ? 1 : 0.2}`"></div>
                </template>
            </div>
        </div>
    </div>

    <!-- Main Workspace -->
    <div class="flex-grow flex min-h-0 overflow-hidden relative">
        <!-- Browser (Left Sidebar) -->
        <div x-show="showBrowser" class="w-48 bg-[#1a1f22] border-r border-black/40 flex flex-col shrink-0 text-[11px]">
            <div class="h-7 bg-[#252a2e] flex items-center px-2 font-bold border-b border-black/40 text-gray-400">
                <span>BROWSER</span>
            </div>
            <div class="flex-grow overflow-y-auto p-1 space-y-0.5 custom-scrollbar text-gray-500">
                <div class="flex items-center space-x-2 p-1 hover:bg-white/5 cursor-pointer text-gray-300"><span>📁</span> <span>Samples</span></div>
                <div class="pl-4 space-y-0.5">
                    <template x-for="sample in [
                        { name: 'Studio Kick', url: 'https://cdn.freesound.org/previews/171/171104_2392966-lq.mp3' },
                        { name: 'Snare Snap', url: 'https://cdn.freesound.org/previews/387/387186_7263311-lq.mp3' },
                        { name: 'Closed Hat', url: 'https://cdn.freesound.org/previews/448/448572_9159116-lq.mp3' },
                        { name: 'Deep Bass', url: 'https://cdn.freesound.org/previews/264/264828_4931603-lq.mp3' }
                    ]">
                        <div class="flex items-center space-x-2 p-1 hover:bg-white/10 hover:text-white cursor-grab active:cursor-grabbing transition-colors rounded"
                             draggable="true"
                             @dragstart="event.dataTransfer.setData('application/json', JSON.stringify(sample)); hintText = 'Dragging: ' + sample.name">
                            <span>🔊</span> <span x-text="sample.name"></span>
                        </div>
                    </template>
                </div>
                <div class="flex items-center space-x-2 p-1 hover:bg-white/5 cursor-pointer text-gray-300"><span>📁</span> <span>Packs</span></div>
                <div class="pl-4 space-y-0.5">
                    <template x-for="sample in ['Kick 808', 'Snare 909', 'HiHat Closed', 'HiHat Open', 'Clap Tight', 'Perc Wood', 'Sub Bass A', 'Piano C4', 'Guitar Clean']">
                        <div class="flex items-center space-x-2 p-1 hover:bg-white/10 hover:text-white cursor-grab active:cursor-grabbing transition-colors rounded"
                             draggable="true"
                             @dragstart="handleDragStart($event, sample)">
                            <span>🔊</span> <span x-text="sample"></span>
                        </div>
                    </template>
                </div>
            </div>
        </div>

        <!-- MDI Area (Middle) -->
        <div class="flex-grow flex flex-col min-w-0 bg-[#121518] relative">
            
            <!-- Channel Rack Window -->
            <div x-show="showChannelRack" class="absolute top-10 left-10 w-[580px] h-[450px] bg-[#2b3339] rounded border border-white/10 shadow-2xl flex flex-col overflow-hidden z-20">
                <div class="h-8 bg-[#32393f] flex items-center px-3 text-[10px] font-bold border-b border-black/40 text-gray-300 justify-between shrink-0 cursor-move">
                    <div class="flex items-center space-x-2">
                        <span class="text-[#ff6600]">■</span>
                        <span>CHANNEL RACK</span>
                    </div>
                    <div class="flex space-x-2">
                        <span class="hover:text-white cursor-pointer" @click="showChannelRack = false">_</span>
                        <span class="hover:text-white cursor-pointer text-red-500" @click="showChannelRack = false">×</span>
                    </div>
                </div>
                <!-- Optimized Scrollable Area -->
                <div class="flex-grow overflow-y-auto p-3 space-y-1 custom-scrollbar bg-[#1e2327]">
                    <template x-for="(channel, cIndex) in channels" :key="cIndex">
                        <div class="flex items-center space-x-3 group hover:bg-white/[0.02] p-1 rounded-sm transition-colors"
                             @dragover.prevent=""
                             @drop="handleDrop($event, cIndex)"
                             @contextmenu.prevent.stop="showFLContextMenu($event, 'channel', channel)">
                            <!-- Channel Controls -->
                            <div class="flex items-center space-x-1 shrink-0 relative group/chan">
                                <!-- Mute/Solo Lights -->
                                <div class="flex flex-col space-y-1 mr-1">
                                    <div class="w-2 h-2 rounded-full bg-black/40 border border-white/5 flex items-center justify-center cursor-pointer" 
                                         @click="channel.muted = !channel.muted"
                                         title="Mute/Unmute">
                                        <div class="w-1 h-1 rounded-full" :class="channel.muted ? 'bg-gray-600' : 'bg-[#00ff00] shadow-[0_0_4px_rgba(0,255,0,0.8)]'"></div>
                                    </div>
                                    <div class="w-2 h-2 rounded-full bg-black/40 border border-white/5 flex items-center justify-center cursor-pointer" 
                                         @click="soloChannel(cIndex)"
                                         title="Solo">
                                        <div class="w-1 h-1 rounded-full" :class="channels.every((c, i) => i === cIndex || c.muted) && !channel.muted ? 'bg-[#ff6600] shadow-[0_0_4px_rgba(255,102,0,0.8)]' : 'bg-gray-600'"></div>
                                    </div>
                                </div>

                                <input type="text" x-model="channel.name" 
                                       class="w-24 bg-[#32393f] h-7 px-2 text-[10px] rounded border border-black/40 text-gray-300 hover:bg-[#3d454c] focus:bg-black/40 focus:outline-none shadow-sm transition-colors font-bold"
                                       :style="`border-left: 4px solid ${channel.color}`">
                                
                                <div class="hidden group-hover/chan:flex absolute -left-8 items-center bg-[#2b3339] rounded shadow-lg border border-black/40 z-10">
                                    <button @click="removeChannel(cIndex)" class="text-red-500 hover:text-red-400 p-1.5" title="Delete Track">
                                        <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                                    </button>
                                </div>

                                <div class="flex flex-col items-center">
                                    <select x-model="channel.type" class="bg-transparent text-[9px] text-gray-500 focus:outline-none appearance-none cursor-pointer hover:text-gray-300 ml-1 font-bold">
                                        <option value="drum">DRUM</option>
                                        <option value="synth">SYNTH</option>
                                        <option value="bass">BASS</option>
                                    </select>
                                    <template x-if="channel.type !== 'drum'">
                                        <input type="number" x-model.number="channel.note" class="w-10 bg-black/20 rounded text-[8px] text-win-blue focus:outline-none text-center h-4 mt-0.5" step="10" min="20" max="2000">
                                    </template>
                                </div>
                            </div>

                            <!-- Steps Grid -->
                            <div class="flex space-x-1.5">
                                <template x-for="(step, sIndex) in channel.steps" :key="sIndex">
                                    <div @click="toggleStep(cIndex, sIndex)"
                                         :class="[
                                            step === 1 ? 'shadow-[inset_0_0_8px_rgba(255,255,255,0.3)]' : '',
                                            (Math.floor(sIndex / 4) % 2 === 0) ? 
                                                (step === 1 ? 'bg-[#ff6600]' : 'bg-[#3d454c]') : 
                                                (step === 1 ? 'bg-[#ff8533]' : 'bg-[#2b3339]'),
                                            (playing && currentStep === sIndex) ? 'ring-2 ring-white/40 brightness-150 z-10' : 'ring-1 ring-black/20'
                                         ]"
                                         class="w-7 h-6 rounded-sm cursor-pointer hover:brightness-125 transition-all active:scale-90 shadow-sm">
                                    </div>
                                </template>
                            </div>
                        </div>
                    </template>
                </div>
                <div class="h-8 bg-[#1a1f22] border-t border-black/40 flex items-center px-3 justify-between shrink-0">
                    <div class="flex items-center space-x-2">
                        <button @click="addChannel()" class="h-5 px-3 bg-black/40 border border-white/10 rounded-sm flex items-center justify-center text-[10px] hover:bg-white/10 transition-colors text-gray-400 font-bold">+ ADD CHANNEL</button>
                    </div>
                    <div class="text-[9px] text-gray-600 font-bold" x-text="channels.length + ' CHANNELS'"></div>
                </div>
            </div>

            <!-- Piano Roll Window -->
            <div x-show="showPianoRoll && pianoRollChannel" class="absolute top-20 left-20 w-[600px] h-[400px] bg-[#2b3339] rounded border border-white/10 shadow-2xl flex flex-col overflow-hidden z-30">
                <div class="h-8 bg-[#32393f] flex items-center px-3 text-[10px] font-bold border-b border-black/40 text-gray-300 justify-between shrink-0 cursor-move">
                    <div class="flex items-center space-x-2">
                        <span class="text-[#00ff00]">■</span>
                        <span x-text="'PIANO ROLL - ' + (pianoRollChannel?.name || '')"></span>
                    </div>
                    <div class="flex space-x-2">
                        <span class="hover:text-white cursor-pointer" @click="showPianoRoll = false">_</span>
                        <span class="hover:text-white cursor-pointer" @click="showPianoRoll = false">×</span>
                    </div>
                </div>
                <div class="flex-grow flex overflow-hidden">
                    <!-- Piano Keys -->
                    <div class="w-12 bg-[#1a1f22] border-r border-black flex flex-col-reverse">
                        <template x-for="note in [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88]">
                            <div class="h-6 border-b border-black flex items-center justify-end px-1 text-[8px]" 
                                 :class="[277.18, 311.13, 369.99, 415.30, 466.16].includes(note) ? 'bg-black text-white' : 'bg-white text-black'">
                                <span x-text="Math.round(note) + 'Hz'"></span>
                            </div>
                        </template>
                    </div>
                    <!-- Note Grid -->
                    <div class="flex-grow overflow-auto bg-[#121518] relative" style="background-image: linear-gradient(#1e2327 1px, transparent 1px), linear-gradient(90deg, #1e2327 1px, transparent 1px); background-size: 24px 24px;">
                        <div class="absolute inset-0 flex flex-col-reverse">
                            <template x-for="note in [261.63, 277.18, 293.66, 311.13, 329.63, 349.23, 369.99, 392.00, 415.30, 440.00, 466.16, 493.88]">
                                <div class="h-6 flex">
                                    <template x-for="step in 16">
                                        <div class="w-6 h-full border-r border-b border-white/5 cursor-pointer hover:bg-white/5"
                                             @click="pianoRollChannel.note = note; pianoRollChannel.steps[step-1] = 1; playChannelSound(pianoRollChannel); hintText = 'Set note ' + Math.round(note) + 'Hz at step ' + step">
                                            <div x-show="pianoRollChannel.note === note && pianoRollChannel.steps[step-1] === 1" class="w-full h-full bg-[#00ff00]/60 border border-[#00ff00]"></div>
                                        </div>
                                    </template>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Playlist Window -->
            <div x-show="showPlaylist" class="absolute inset-0 top-0 left-0 right-0 bottom-0 bg-[#121518] flex flex-col overflow-hidden">
                <div class="h-8 bg-[#1a1f22] flex items-center px-3 text-[10px] font-bold border-b border-black/40 text-gray-500 shrink-0">
                    <div class="flex items-center space-x-2">
                        <span class="text-[#00ccff]">■</span>
                        <span>PLAYLIST - ARRANGEMENT</span>
                    </div>
                </div>
                <div class="flex-grow relative overflow-auto custom-scrollbar playlist-grid-container" 
                     style="background-image: linear-gradient(#1e2327 1px, transparent 1px), linear-gradient(90deg, #1e2327 1px, transparent 1px); background-size: 48px 32px; background-attachment: local;">
                    
                    <!-- Track Headers -->
                    <div class="absolute left-0 top-0 bottom-0 w-24 bg-[#1a1f22]/80 border-r border-black/40 z-10 pointer-events-none">
                        <template x-for="i in 20">
                            <div class="h-8 border-b border-black/20 flex items-center px-2 text-[9px] text-gray-500 font-bold" x-text="'Track ' + i"></div>
                        </template>
                    </div>
                    
                    <!-- Clips Grid -->
                    <div class="ml-24 min-w-[2000px] h-[640px] relative playlist-grid">
                        <template x-for="trackIndex in 20">
                            <div class="h-8 border-b border-white/5 w-full">
                            </div>
                        </template>

                        <!-- Rendered Clips -->
                        <template x-for="clip in playlistClips" :key="clip.id">
                            <div class="absolute h-7 flex items-center px-2 text-[9px] text-white font-bold rounded-sm border cursor-grab active:cursor-grabbing shadow-lg overflow-hidden transition-[top,left] duration-75"
                                 @mousedown.stop="startClipDrag($event, clip)"
                                 @contextmenu.prevent.stop="showFLContextMenu($event, 'clip', clip)"
                                 :class="activeDraggedClip?.id === clip.id ? 'z-50 ring-1 ring-white/50 opacity-90' : 'z-10'"
                                 :style="`top: ${(clip.track-1) * 32 + 2}px; left: ${clip.startStep * 12}px; width: ${clip.length * 12}px; background-color: ${clip.color}44; border-color: ${clip.color}88;`"
                                 :title="clip.name">
                                <div class="w-full h-full absolute inset-0 opacity-10 pointer-events-none" 
                                     :style="`background-image: repeating-linear-gradient(90deg, transparent, transparent 12px, white 12px, white 14px);`"
                                     x-show="clip.type === 'pattern'"></div>
                                <svg class="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100" x-show="clip.type === 'audio'">
                                    <path d="M0,50 Q5,20 10,50 T20,50 T30,50 T40,50 T50,50 T60,50 T70,50 T80,50 T90,50 T100,50" stroke="white" fill="none" stroke-width="1"></path>
                                </svg>
                                <svg class="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100" x-show="clip.type === 'automation'">
                                    <path d="M0,80 L20,60 L40,70 L60,30 L80,40 L100,10" stroke="white" fill="none" stroke-width="2"></path>
                                </svg>
                                <span class="relative z-10 truncate" x-text="clip.name"></span>
                            </div>
                        </template>

                        <!-- Playhead -->
                        <div class="absolute inset-y-0 w-px bg-white/60 shadow-[0_0_10px_rgba(255,255,255,0.8)] z-20 pointer-events-none"
                             x-show="playing"
                             :style="`left: ${mode === 'pattern' ? (currentStep * 12) : (songStep * 12)}px`">
                            <div class="w-3 h-3 bg-white rotate-45 -translate-x-1.5 -translate-y-1.5 shadow-lg"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Mixer Area -->
    <div x-show="showMixer" class="h-64 bg-[#1a1f22] border-t border-black flex flex-col shrink-0">
        <div class="h-7 bg-[#252a2e] flex items-center px-3 text-[10px] font-bold border-b border-black/40 text-gray-400 justify-between shrink-0">
            <div class="flex items-center space-x-2">
                <span class="text-gray-500">■</span>
                <span>MIXER - MASTER</span>
            </div>
            <div class="flex space-x-2">
                <span class="hover:text-white cursor-pointer" @click="showMixer = false">_</span>
                <span class="hover:text-white cursor-pointer">□</span>
                <span class="hover:text-white cursor-pointer" @click="showMixer = false">×</span>
            </div>
        </div>
        <div class="flex-grow flex overflow-x-auto p-1 space-x-0.5 custom-scrollbar bg-[#121518]">
            <template x-for="track in mixerTracks" :key="track.index">
                <div class="w-[52px] h-full bg-[#202529] flex flex-col items-center border border-black/60 shadow-inner group shrink-0 relative overflow-hidden"
                     @contextmenu.prevent.stop="showFLContextMenu($event, 'mixer', track)">
                    <div class="absolute right-0 top-1 bottom-10 w-2 flex flex-col-reverse space-y-[1px] px-[1px]">
                        <template x-for="i in 15">
                            <div class="flex-grow w-full rounded-sm transition-all duration-75"
                                 :class="[
                                    i > 12 ? 'bg-red-500/20' : (i > 9 ? 'bg-yellow-500/20' : 'bg-green-500/20'),
                                    playing && (Math.random() * 15 > i) ? (i > 12 ? 'bg-red-500' : (i > 9 ? 'bg-yellow-500' : 'bg-green-500')) : ''
                                 ]"></div>
                        </template>
                    </div>

                    <div class="text-[8px] font-bold mt-1 tracking-tighter" :class="track.name === 'MASTER' ? 'text-[#ff6600]' : 'text-gray-500'" x-text="track.name"></div>
                    
                    <div class="flex-grow flex items-center justify-center py-4 w-full px-2">
                        <div class="w-6 h-full flex flex-col items-center relative">
                            <div class="w-1.5 h-full bg-black/60 rounded-full border border-white/5 relative overflow-hidden cursor-pointer"
                                 @mousedown="isDraggingSlider = true; activeSliderTrack = track; updateVolume(track, $event)">
                                <div class="absolute bottom-0 left-0 right-0 bg-[#00ccff]/20 transition-all duration-200" :style="`height: ${track.volume * 100}%`"></div>
                            </div>
                            <div class="absolute w-8 h-4 bg-[#3d454c] border border-black/60 rounded-sm shadow-lg pointer-events-none flex flex-col items-center justify-center space-y-0.5 z-10"
                                 :style="`bottom: calc(${track.volume * 100}% - 8px)`">
                                <div class="w-5 h-[1px] bg-white/20"></div>
                                <div class="w-5 h-[1px] bg-[#00ccff]"></div>
                                <div class="w-5 h-[1px] bg-white/20"></div>
                            </div>
                        </div>
                    </div>

                    <div class="w-full flex justify-center space-x-1 pb-2">
                        <!-- Mute -->
                        <div class="w-4 h-4 rounded-full bg-black/40 border border-white/5 flex items-center justify-center cursor-pointer hover:border-[#00ff00]/50" 
                             @click="track.muted = !track.muted; if(track.index > 0) channels[track.index-1].muted = track.muted"
                             title="Mute">
                            <div class="w-1.5 h-1.5 rounded-full" :class="track.muted ? 'bg-gray-600' : 'bg-[#00ff00] shadow-[0_0_4px_rgba(0,255,0,0.8)]'"></div>
                        </div>
                        <!-- Solo -->
                        <div class="w-4 h-4 rounded-full bg-black/40 border border-white/5 flex items-center justify-center cursor-pointer hover:border-[#ff6600]/50" 
                             @click="if(track.index > 0) soloChannel(track.index-1)"
                             x-show="track.index > 0"
                             title="Solo">
                            <div class="w-1.5 h-1.5 rounded-full" :class="track.index > 0 && channels.every((c, i) => i === (track.index-1) || c.muted) && !channels[track.index-1].muted ? 'bg-[#ff6600] shadow-[0_0_4px_rgba(255,102,0,0.8)]' : 'bg-gray-600'"></div>
                        </div>
                    </div>

                    <div class="w-full bg-black/40 py-0.5 text-center border-t border-white/5">
                        <span class="text-[8px] font-bold text-gray-600" x-text="track.index === 0 ? 'M' : track.index"></span>
                    </div>
                </div>
            </template>
        </div>
    </div>
</div>
