// assets/js/components/flstudio.js
document.addEventListener('alpine:init', () => {
     Alpine.data('flstudioApp', () => ({
        playing: false,
        mode: 'pattern', // 'pattern' or 'song'
        bpm: 128,
        currentStep: 0,
        songStep: 0,
        timer: null,
        audioContext: null,
        masterGain: null,
        recorderNode: null,
        masterVolume: 0.8,
        showChannelRack: true,
        showMixer: true,
        showPlaylist: true,
        showBrowser: true,
        showPianoRoll: false,
        pianoRollChannel: null,
        hintText: 'Hint: Click steps to toggle sounds',
        playlistClips: [
            { id: 1, name: 'Pattern 1', track: 1, startStep: 0, length: 32, type: 'pattern', color: '#ff6600' },
            { id: 2, name: 'Impact_FX_01.wav', track: 5, startStep: 16, length: 48, type: 'audio', color: '#00ccff' }
        ],
        isRecording: false,
        mediaRecorder: null,
        recordedChunks: [],
        audioBuffers: {}, 
        isDraggingSlider: false,
        activeSliderTrack: null,
        isDraggingClip: false,
        activeDraggedClip: null,
        clipDragOffsetX: 0,
        clipDragOffsetY: 0,
        
        channels: [
            { name: 'Kick', type: 'drum', note: 40, color: '#ff6600', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], volume: 0.8, muted: false, panned: 0, sampleUrl: null },
            { name: 'Clap', type: 'drum', note: 60, color: '#00ccff', steps: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0], volume: 0.7, muted: false, panned: 0, sampleUrl: null },
            { name: 'Hat', type: 'drum', note: 1000, color: '#ffff00', steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], volume: 0.5, muted: false, panned: 0, sampleUrl: null },
            { name: 'Snare', type: 'drum', note: 200, color: '#ff00ff', steps: [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0], volume: 0.6, muted: false, panned: 0, sampleUrl: null },
            { name: 'Piano', type: 'synth', note: 261.63, color: '#ffffff', steps: [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], volume: 0.5, muted: false, panned: 0, sampleUrl: null },
            { name: 'Guitar', type: 'synth', note: 196.00, color: '#00ff00', steps: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0], volume: 0.4, muted: false, panned: 0, sampleUrl: null },
            { name: 'Sub Bass', type: 'bass', note: 55, color: '#ff0000', steps: [1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0], volume: 0.8, muted: false, panned: 0, sampleUrl: null },
        ],

        async loadSample(url, name) {
            if (this.audioBuffers[url]) return this.audioBuffers[url];
            this.setupAudio();
            try {
                const response = await fetch(url);
                const arrayBuffer = await response.arrayBuffer();
                const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
                this.audioBuffers[url] = audioBuffer;
                this.hintText = `Loaded sample: ${name}`;
                return audioBuffer;
            } catch (e) {
                console.error('Failed to load sample:', e);
                return null;
            }
        },

        showFLContextMenu(e, type, data) {
            e.preventDefault();
            let items = [];
            if (type === 'channel') {
                items = [
                    { label: 'Piano Roll', icon: '🎹', action: () => { this.pianoRollChannel = data; this.showPianoRoll = true; this.hintText = 'Opening Piano Roll for ' + data.name; } },
                    { label: 'Rename', icon: '✏️', action: () => { const n = prompt('Name:', data.name); if(n) data.name = n; } },
                    { label: 'Change Colour', icon: '🎨', action: () => { data.color = '#' + Math.floor(Math.random()*16777215).toString(16); } },
                    { separator: true },
                    { label: 'Clone', icon: '👯', action: () => { this.channels.push({...JSON.parse(JSON.stringify(data)), id: Date.now()}); } },
                    { label: 'Delete', icon: '🗑️', action: () => { this.removeChannel(this.channels.indexOf(data)); } }
                ];
            } else if (type === 'mixer') {
                items = [
                    { label: 'Reset Fader', icon: '🔄', action: () => { data.volume = 0.8; if(data.name === 'MASTER') this.masterVolume = 0.8; } },
                    { label: 'Create automation clip', icon: '📈', action: () => { 
                        this.playlistClips.push({ 
                            id: Date.now(), 
                            name: data.name + ' Volume Automation', 
                            track: this.playlistClips.length + 1, 
                            startStep: 0, 
                            length: 64, 
                            type: 'automation', 
                            color: '#ffff00' 
                        });
                        this.hintText = 'Automation clip created for ' + data.name;
                    } },
                    { label: 'Link to Controller', icon: '🔗', action: () => { this.hintText = 'Waiting for MIDI input...'; } },
                    { separator: true },
                    { label: 'Enable Effects', icon: '✨', action: () => { this.hintText = 'FX Slot enabled for ' + data.name; } }
                ];
            } else if (type === 'clip') {
                items = [
                    { label: 'Rename Clip', icon: '✏️', action: () => { const n = prompt('Name:', data.name); if(n) data.name = n; } },
                    { label: 'Change Colour', icon: '🎨', action: () => { data.color = '#' + Math.floor(Math.random()*16777215).toString(16); } },
                    { separator: true },
                    { label: 'Delete Clip', icon: '🗑️', action: () => { this.playlistClips = this.playlistClips.filter(c => c.id !== data.id); } }
                ];
            } else {
                items = [
                    { label: 'Undo', icon: '↩️', action: () => {} },
                    { label: 'Redo', icon: '↪️', action: () => {} },
                    { separator: true },
                    { label: 'Help', icon: '❓', action: () => { window.open('https://www.image-line.com/fl-studio-learning/', '_blank'); } }
                ];
            }

            Alpine.store('os').contextMenu = {
                open: true,
                x: e.clientX,
                y: e.clientY,
                items: items
            };
        },

        setupAudio() {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                this.masterGain = this.audioContext.createGain();
                this.masterGain.gain.setValueAtTime(this.masterVolume, this.audioContext.currentTime);
                this.masterGain.connect(this.audioContext.destination);
                
                this.recorderNode = this.audioContext.createMediaStreamDestination();
                this.masterGain.connect(this.recorderNode);
            }
        },

        addChannel() {
            const colors = ['#ff6600', '#00ccff', '#ffff00', '#ff00ff', '#00ff00', '#ff0000', '#ffffff', '#888888'];
            this.channels.push({
                name: 'Sampler ' + (this.channels.length + 1),
                type: 'synth',
                note: 440,
                color: colors[this.channels.length % colors.length],
                steps: new Array(16).fill(0),
                volume: 0.5,
                muted: false,
                panned: 0
            });
            this.hintText = 'Added new channel: Sampler ' + this.channels.length;
        },

        removeChannel(index) {
            if (this.channels.length > 1) {
                const name = this.channels[index].name;
                this.channels.splice(index, 1);
                // Also remove related mixer tracks if any (they are derived, so just updating channels is enough)
                this.hintText = 'Removed channel: ' + name;
            }
        },

        soloChannel(index) {
            const channel = this.channels[index];
            const alreadySoloed = this.channels.every((c, i) => i === index || c.muted);
            
            if (alreadySoloed) {
                // Unmute all
                this.channels.forEach(c => c.muted = false);
                this.hintText = 'Unmuted all channels';
            } else {
                // Mute all except this one
                this.channels.forEach((c, i) => {
                    c.muted = (i !== index);
                });
                this.hintText = 'Soloed channel: ' + channel.name;
            }
        },

        init() {
            // Listen for app closure to kill audio
            window.addEventListener('app-closed', (e) => {
                if (e.detail.app === 'flstudio') {
                    this.playing = false;
                    this.stopPlayback();
                    if (this.audioContext) {
                        this.audioContext.close();
                        this.audioContext = null;
                    }
                }
            });

            this.$watch('playing', (val) => {
                if (val) {
                    this.setupAudio();
                    this.startPlayback();
                } else {
                    this.stopPlayback();
                }
            });

            this.$watch('bpm', (val) => {
                if (this.playing) {
                    this.stopPlayback();
                    this.startPlayback();
                }
            });
        },

        toggleStep(channelIndex, stepIndex) {
            this.channels[channelIndex].steps[stepIndex] = this.channels[channelIndex].steps[stepIndex] === 1 ? 0 : 1;
            if (this.channels[channelIndex].steps[stepIndex] === 1 && !this.playing) {
                this.setupAudio();
                this.playChannelSound(this.channels[channelIndex]);
            }
            this.hintText = `Step ${stepIndex + 1} ${this.channels[channelIndex].steps[stepIndex] ? 'On' : 'Off'} - ${this.channels[channelIndex].name}`;
        },

        startPlayback() {
            let nextStepTime = this.audioContext.currentTime;

            const scheduler = () => {
                const stepDuration = 60 / this.bpm / 4; // 16th notes
                while (nextStepTime < this.audioContext.currentTime + 0.1) {
                    this.scheduleStep(this.mode === 'pattern' ? this.currentStep : this.songStep % 16, nextStepTime);
                    nextStepTime += stepDuration;
                    
                    if (this.mode === 'pattern') {
                        this.currentStep = (this.currentStep + 1) % 16;
                    } else {
                        this.songStep = (this.songStep + 1) % 512;
                        this.currentStep = this.songStep % 16;
                    }
                }
                this.timer = requestAnimationFrame(scheduler);
            };

            this.timer = requestAnimationFrame(scheduler);
        },

        stopPlayback() {
            cancelAnimationFrame(this.timer);
            this.currentStep = 0;
            this.songStep = 0;
        },

        scheduleStep(step, time) {
            this.channels.forEach(channel => {
                if (channel.steps[step] === 1 && !channel.muted) {
                    this.playChannelSound(channel, time);
                }
            });
        },

        playChannelSound(channel, time = null) {
            this.setupAudio();
            const ctx = this.audioContext;
            const startTime = time || ctx.currentTime;
            
            const gain = ctx.createGain();
            const vol = channel.volume; 
            gain.connect(this.masterGain);
            
            // Priority: Real Audio Samples
            if (channel.sampleUrl && this.audioBuffers[channel.sampleUrl]) {
                const source = ctx.createBufferSource();
                source.buffer = this.audioBuffers[channel.sampleUrl];
                source.connect(gain);
                gain.gain.setValueAtTime(vol, startTime);
                source.start(startTime);
                return;
            }

            if (channel.type === 'drum') {
                const name = channel.name.toLowerCase();
                if (name.includes('kick')) {
                    const osc = ctx.createOscillator();
                    osc.connect(gain);
                    osc.frequency.setValueAtTime(150, startTime);
                    osc.frequency.exponentialRampToValueAtTime(0.01, startTime + 0.1);
                    gain.gain.setValueAtTime(vol, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
                    osc.start(startTime);
                    osc.stop(startTime + 0.1);
                } else if (name.includes('hat')) {
                    const noise = ctx.createBufferSource();
                    const bufferSize = ctx.sampleRate * 0.05;
                    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                    const data = buffer.getChannelData(0);
                    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
                    noise.buffer = buffer;
                    const filter = ctx.createBiquadFilter();
                    filter.type = 'highpass';
                    filter.frequency.value = 7000;
                    noise.connect(filter);
                    filter.connect(gain);
                    gain.gain.setValueAtTime(vol, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
                    noise.start(startTime);
                    noise.stop(startTime + 0.05);
                } else {
                    const osc = ctx.createOscillator();
                    osc.type = 'triangle';
                    osc.connect(gain);
                    osc.frequency.setValueAtTime(name.includes('clap') ? 200 : 150, startTime);
                    gain.gain.setValueAtTime(vol, startTime);
                    gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.1);
                    osc.start(startTime);
                    osc.stop(startTime + 0.1);
                }
            } else if (channel.name.toLowerCase().includes('piano')) {
                const osc1 = ctx.createOscillator();
                const osc2 = ctx.createOscillator();
                osc1.type = 'triangle';
                osc2.type = 'sine';
                osc1.frequency.setValueAtTime(channel.note, startTime);
                osc2.frequency.setValueAtTime(channel.note * 2, startTime);
                osc1.connect(gain);
                osc2.connect(gain);
                gain.gain.setValueAtTime(vol * 0.4, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);
                osc1.start(startTime);
                osc2.start(startTime);
                osc1.stop(startTime + 0.5);
                osc2.stop(startTime + 0.5);
            } else if (channel.name.toLowerCase().includes('guitar')) {
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(channel.note, startTime);
                const filter = ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.setValueAtTime(2000, startTime);
                filter.frequency.exponentialRampToValueAtTime(400, startTime + 0.3);
                osc.connect(filter);
                filter.connect(gain);
                gain.gain.setValueAtTime(vol * 0.3, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.4);
                osc.start(startTime);
                osc.stop(startTime + 0.4);
            } else {
                const osc = ctx.createOscillator();
                osc.connect(gain);
                osc.type = channel.type === 'synth' ? 'sawtooth' : 'sine';
                osc.frequency.setValueAtTime(channel.note || (channel.type === 'bass' ? 55 : 440), startTime);
                gain.gain.setValueAtTime(vol * (channel.type === 'bass' ? 0.6 : 0.3), startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.2);
                osc.start(startTime);
                osc.stop(startTime + 0.2);
            }
        },

        // Clip Dragging logic
        startClipDrag(event, clip) {
            this.activeDraggedClip = clip;
            this.isDraggingClip = true;
            const grid = document.querySelector('.playlist-grid');
            if (!grid) return;
            const rect = grid.getBoundingClientRect();
            const container = document.querySelector('.playlist-grid-container');
            const scrollLeft = container?.scrollLeft || 0;
            const scrollTop = container?.scrollTop || 0;
            
            // Calculate where we grabbed the clip relative to its top-left corner
            this.clipDragOffsetX = event.clientX - (rect.left + (clip.startStep * 12) - scrollLeft);
            this.clipDragOffsetY = event.clientY - (rect.top + ((clip.track-1) * 32) - scrollTop);
            
            this.hintText = 'Dragging: ' + clip.name;
        },
        handleGlobalMouseMove(event) {
            if (this.isDraggingSlider) {
                this.updateVolume(this.activeSliderTrack, event);
            }
            if (this.isDraggingClip && this.activeDraggedClip) {
                const grid = document.querySelector('.playlist-grid');
                if (!grid) return;
                const rect = grid.getBoundingClientRect();
                const container = document.querySelector('.playlist-grid-container');
                const scrollLeft = container?.scrollLeft || 0;
                const scrollTop = container?.scrollTop || 0;
                
                // Horizontal Snapping (12px = 1 step)
                const x = event.clientX - rect.left + scrollLeft - this.clipDragOffsetX;
                this.activeDraggedClip.startStep = Math.max(0, Math.round(x / 12));
                
                // Vertical Snapping (32px = 1 track)
                const y = event.clientY - rect.top + scrollTop - this.clipDragOffsetY;
                this.activeDraggedClip.track = Math.max(1, Math.min(20, Math.round(y / 32) + 1));
                
                this.hintText = `Moving ${this.activeDraggedClip.name} to Track ${this.activeDraggedClip.track}, Step ${this.activeDraggedClip.startStep}`;
            }
        },
        endClipDrag() {
            this.isDraggingClip = false;
            this.activeDraggedClip = null;
        },

        // Export Functionality
        async exportProject() {
            this.setupAudio();
            this.recordedChunks = [];
            this.mediaRecorder = new MediaRecorder(this.recorderNode.stream);
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) this.recordedChunks.push(e.data);
            };

            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.recordedChunks, { type: 'audio/wav' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'My_FL_Project.wav';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                this.hintText = 'Export complete! Project saved as WAV.';
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.playing = true;
            this.mode = 'song';
            this.hintText = 'Exporting project... please wait';

            setTimeout(() => {
                if (this.isRecording) {
                    this.mediaRecorder.stop();
                    this.isRecording = false;
                    this.playing = false;
                }
            }, (60 / this.bpm) * 32 * 1000); 
        },

        updateVolume(track, event) {
            const rect = event.currentTarget.getBoundingClientRect();
            const val = Math.max(0, Math.min(1, 1 - (event.clientY - rect.top) / rect.height));
            track.volume = val;
            if (track.name === 'MASTER') {
                this.masterVolume = val;
                if (this.masterGain) this.masterGain.gain.setValueAtTime(val, this.audioContext.currentTime);
            } else {
                const chan = this.channels[track.index - 1];
                if (chan) chan.volume = val;
            }
            this.hintText = `${track.name} Volume: ${Math.round(val * 100)}%`;
        },

        handleDragStart(event, sampleName) {
            event.dataTransfer.setData('text/plain', sampleName);
            this.hintText = 'Dragging: ' + sampleName;
        },

        handleDrop(event, channelIndex) {
            event.preventDefault();
            const jsonData = event.dataTransfer.getData('application/json');
            const sampleName = event.dataTransfer.getData('text/plain');
            
            if (jsonData) {
                const sample = JSON.parse(jsonData);
                const chan = this.channels[channelIndex];
                chan.name = sample.name;
                chan.sampleUrl = sample.url;
                this.loadSample(sample.url, sample.name);
                this.hintText = `Loaded high-quality sample: ${sample.name}`;
            } else if (sampleName) {
                const chan = this.channels[channelIndex];
                chan.name = sampleName;
                chan.sampleUrl = null; // Use synth engine
                const lower = sampleName.toLowerCase();
                if (lower.includes('kick') || lower.includes('snare') || lower.includes('hat') || lower.includes('clap') || lower.includes('perc')) {
                    chan.type = 'drum';
                } else if (lower.includes('bass') || lower.includes('sub')) {
                    chan.type = 'bass';
                } else if (lower.includes('piano')) {
                    chan.type = 'synth';
                    chan.note = 261.63; 
                } else if (lower.includes('guitar')) {
                    chan.type = 'synth';
                    chan.note = 196.00;
                } else {
                    chan.type = 'synth';
                }
                this.setupAudio();
                this.playChannelSound(chan);
                this.hintText = `Loaded ${sampleName} into channel ${channelIndex + 1}`;
            }
        },

        get mixerTracks() {
            return [
                { name: 'MASTER', volume: this.masterVolume, muted: false, panned: 0, index: 0 },
                ...this.channels.map((c, i) => ({ name: c.name, volume: c.volume, muted: c.muted, panned: c.panned, index: i + 1 }))
            ];
        }
    }));
});
