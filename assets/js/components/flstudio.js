// assets/js/components/flstudio.js
// FL Studio. Everything it does lives in assets/js/windowing/fl-studio.js,
// which v2 shares, so this file only keeps Alpine's state and plugs it in.
document.addEventListener('alpine:init', () => {
    Alpine.data('flstudioApp', () => {
        const FL = window.FlStudio;
        const TOP_PITCH = 96;
        const BOTTOM_PITCH = 24;
        // Kept outside Alpine's reactivity: the audio engine and its helpers.
        let engine = null;
        let commands = null;
        let stopPainting = () => {};
        let onKey = null;

        const readSaved = () => {
            try {
                return localStorage.getItem(FL.FL_PROJECT_KEY);
            } catch {
                return null;
            }
        };

        return {
            FL,
            INSTRUMENTS: FL.INSTRUMENTS,
            MENUS: FL.FL_MENUS,
            PANELS: FL.FL_PANELS,
            PANEL_LABELS: FL.FL_PANEL_LABELS,
            ICONS: FL.FL_ICONS,
            HELP: FL.FL_HELP,
            FOLDER: FL.FL_FOLDER,
            MIN_BPM: FL.MIN_BPM,
            MAX_BPM: FL.MAX_BPM,
            TOP_PITCH,
            PITCHES: Array.from({ length: TOP_PITCH - BOTTOM_PITCH + 1 }, (_, i) => TOP_PITCH - i),
            BARS: Array.from({ length: FL.SONG_BARS }, (_, i) => i),
            TRACKS: Array.from({ length: FL.TRACKS }, (_, i) => i),
            SONG_BARS: FL.SONG_BARS,
            TRACK_COUNT: FL.TRACKS,

            project: null,
            history: { past: [], future: [] },
            mode: 'pattern',
            patternId: null,
            channelId: null,
            views: { ...FL.FL_START_VIEWS },
            tab: 'rack',
            menu: null,
            hint: 'Press Space to play. Click the steps to change the beat.',
            playing: false,
            dialog: null,
            saveName: '',
            fileName: null,
            noteLength: 2,
            loadedRevision: null,
            saveTimer: 0,

            get win() {
                return Alpine.store('os').windows.find((w) => w.app === 'flstudio');
            },
            get pattern() {
                return this.project.patterns.find((item) => item.id === this.patternId) ?? this.project.patterns[0];
            },
            get channel() {
                return this.project.channels.find((item) => item.id === this.channelId) ?? this.project.channels[0];
            },
            get steps() {
                return Array.from({ length: FL.patternSteps(this.pattern) }, (_, i) => i);
            },
            get savedFiles() {
                return FL.projectFiles(Alpine.store('os').fileSystem);
            },
            get pianoNotes() {
                return (this.pattern.notes[this.channel.id] ?? []).filter((note) => note.pitch >= BOTTOM_PITCH && note.pitch <= TOP_PITCH);
            },

            /** What the engine, the gestures and the commands read. */
            live() {
                return {
                    project: Alpine.raw(this.project),
                    mode: this.mode,
                    patternId: this.patternId,
                    channelId: this.channelId,
                    history: Alpine.raw(this.history),
                    views: { ...this.views },
                    fileName: this.fileName,
                    noteLength: this.noteLength,
                };
            },

            init() {
                const opened = this.win;
                this.loadedRevision = opened?.fileRevision ?? 0;
                this.project = FL.startingProject(opened?.fileContent ?? null, readSaved());
                this.fileName = opened?.fileContent ? opened.title : null;
                this.patternId = this.project.patterns[0].id;
                this.channelId = this.project.channels[0].id;

                engine = FL.createEngine(() => this.live(), { onChange: (state) => { this.playing = state.playing; } });
                commands = FL.flCommands({
                    read: () => this.live(),
                    commit: (next, record) => this.commit(next, record),
                    load: (next, name) => {
                        this.project = next;
                        this.history = { past: [], future: [] };
                        this.patternId = next.patterns[0].id;
                        this.channelId = next.channels[0].id;
                        this.fileName = name;
                    },
                    restore: (next, history) => {
                        this.project = next;
                        this.history = history;
                    },
                    selectPattern: (id) => { this.patternId = id; },
                    selectChannel: (id) => { this.channelId = id; },
                    setViews: (views) => { this.views = views; },
                    setTab: (panel) => { this.tab = panel; },
                    dialog: (name) => {
                        if (name === 'saveAs') this.saveName = this.project.name;
                        this.dialog = name;
                    },
                    hint: (text) => { this.hint = text; },
                    setFileName: (name) => { this.fileName = name; },
                    changeFiles: (change) => Alpine.store('os').changeFiles(change),
                    icons: { folder: `${window.portfolioConfig.imgPath}win11/folder.webp`, file: `${window.portfolioConfig.imgPath}fl%20studio.webp` },
                    engine,
                });
                this.$nextTick(() => { stopPainting = FL.startPainter(this.$el, engine); });

                // Keeps working through a reload.
                this.$watch('project', (project) => {
                    clearTimeout(this.saveTimer);
                    this.saveTimer = setTimeout(() => {
                        try {
                            localStorage.setItem(FL.FL_PROJECT_KEY, FL.serialiseProject(Alpine.raw(project)));
                        } catch {
                            // Private windows can refuse storage, which only loses the autosave.
                        }
                    }, 400);
                });

                // A project opened from Explorer while FL Studio is already open.
                this.$watch('$store.os.windows', () => {
                    const win = this.win;
                    if (!win || (win.fileRevision ?? 0) === this.loadedRevision) return;
                    this.loadedRevision = win.fileRevision ?? 0;
                    commands.openFile({ name: win.title, content: win.fileContent });
                });

                // The piano roll opens at the channel's own pitch.
                this.$watch('channelId', () => this.$nextTick(() => this.scrollPiano()));

                // FL Studio's shortcuts and typing keyboard, while its window has focus.
                onKey = (event) => {
                    if (this.win?.id !== Alpine.store('os').focusedWindowId) return;
                    if (event.target.closest?.('input, select, textarea')) return;
                    const command = FL.flShortcut(event);
                    if (command) {
                        event.preventDefault();
                        this.run(command);
                        return;
                    }
                    if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
                    const pitch = FL.typingKeyPitch(event.key, 5);
                    if (pitch !== null) engine.preview(this.channelId, pitch);
                };
                window.addEventListener('keydown', onKey);
            },

            destroy() {
                stopPainting();
                engine?.dispose();
                window.removeEventListener('keydown', onKey);
                clearTimeout(this.saveTimer);
            },

            commit(next, record = true) {
                const current = Alpine.raw(this.project);
                if (next === current) return;
                if (record) this.history = FL.recordEdit(Alpine.raw(this.history), current);
                this.project = next;
            },

            run(id) {
                this.menu = null;
                commands?.[id]?.();
            },

            menuState(id) {
                return FL.menuItemState(id, { project: this.project, patternId: this.pattern.id, history: this.history, views: this.views });
            },

            unlock() { engine?.unlock(); },
            toggle() { engine?.toggle(); },
            stop() { engine?.stop(); },
            preview(channelId, pitch) { engine?.preview(channelId, pitch); },

            setMode(value) {
                this.mode = value;
                engine?.seek(0);
            },

            seekBar(bar) {
                this.mode = 'song';
                engine?.seek(bar * 16);
            },

            openFile(entry) {
                this.dialog = null;
                commands?.openFile(entry);
            },

            saveAs() {
                this.dialog = null;
                this.commit(FL.renameProject(Alpine.raw(this.project), this.saveName));
                commands?.saveNamed(this.saveName);
            },

            browse(instrument) {
                const existing = this.project.channels.find((item) => item.instrument === instrument.id);
                if (existing) engine?.preview(existing.id);
                else this.hint = `Press + to add ${instrument.name} to the channel rack`;
            },

            openPiano(id) {
                this.channelId = id;
                this.views = { ...this.views, piano: true };
                this.tab = 'piano';
                engine?.preview(id);
                this.$nextTick(() => this.scrollPiano());
            },

            scrollPiano() {
                const body = this.$refs.pianoBody;
                if (!body) return;
                const row = parseFloat(getComputedStyle(body).getPropertyValue('--fl-row-h')) || 14;
                body.scrollTop = (TOP_PITCH - FL.instrumentFor(this.channel).root) * row - body.clientHeight / 2;
            },

            toggleStep(channelId, index) {
                const next = FL.toggleStep(Alpine.raw(this.project), this.pattern.id, channelId, index);
                this.commit(next);
                const pattern = next.patterns.find((item) => item.id === this.pattern.id);
                if (!this.playing && FL.stepOn(pattern, channelId, index)) engine?.preview(channelId);
            },

            stepOn(channelId, index) {
                return FL.stepOn(this.pattern, channelId, index);
            },

            change(edit, record = true) {
                this.commit(edit(Alpine.raw(this.project)), record);
            },

            pianoDown(event) {
                FL.beginPianoGesture(event, this.$refs.grid, {
                    read: () => ({ project: Alpine.raw(this.project), patternId: this.pattern.id, channelId: this.channel.id }),
                    write: (next, record) => this.commit(next, record),
                    top: TOP_PITCH,
                    length: () => this.noteLength,
                    setLength: (length) => { this.noteLength = length; },
                    preview: (pitch) => engine?.preview(this.channel.id, pitch),
                });
            },

            playlistDown(event) {
                FL.beginPlaylistGesture(event, this.$refs.lanes, {
                    read: () => ({ project: Alpine.raw(this.project), patternId: this.pattern.id }),
                    write: (next, record) => this.commit(next, record),
                });
            },

            clipPattern(clip) {
                return this.project.patterns.find((item) => item.id === clip.patternId);
            },
        };
    });
});
