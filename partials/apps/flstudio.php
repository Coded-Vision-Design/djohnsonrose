<!-- partials/apps/flstudio.php: the same markup as v2's FLStudio.tsx, styled by assets/css/flstudio.css. -->
<div class="fl-app" x-data="flstudioApp" :data-fl-tab="tab" @pointerdown="unlock()" @contextmenu.prevent>
    <div class="fl-menubar">
        <span class="fl-logo">FL</span>
        <nav class="fl-menus" aria-label="FL Studio menu">
            <template x-for="item in MENUS" :key="item.id">
                <div class="fl-menu">
                    <button type="button" class="fl-menu-button" :data-fl-menu="item.label" aria-haspopup="menu"
                            :aria-expanded="menu === item.id" @click="menu = menu === item.id ? null : item.id" x-text="item.label"></button>
                    <template x-if="menu === item.id">
                        <div class="fl-menu-shield" @pointerdown="menu = null"></div>
                    </template>
                    <template x-if="menu === item.id">
                        <div class="fl-menu-list" role="menu">
                            <template x-for="(entry, index) in item.items" :key="entry.id ?? index">
                                <div style="display: contents">
                                    <template x-if="entry.separator">
                                        <div class="fl-menu-sep" role="separator"></div>
                                    </template>
                                    <template x-if="!entry.separator">
                                        <button type="button" class="fl-menu-item" :data-fl-command="entry.id"
                                                :role="menuState(entry.id).checked === undefined ? 'menuitem' : 'menuitemcheckbox'"
                                                x-effect="menuState(entry.id).checked === undefined ? $el.removeAttribute('aria-checked') : $el.setAttribute('aria-checked', String(menuState(entry.id).checked))"
                                                :disabled="Boolean(menuState(entry.id).disabled)" @click="run(entry.id)">
                                            <span x-text="menuState(entry.id).checked ? '✓' : ''"></span>
                                            <span x-text="entry.label"></span>
                                            <span class="fl-menu-key" x-text="entry.shortcut ?? ''"></span>
                                        </button>
                                    </template>
                                </div>
                            </template>
                        </div>
                    </template>
                </div>
            </template>
        </nav>
        <input class="fl-project-name" aria-label="Project name" :value="project.name"
               @blur="change((p) => FL.renameProject(p, $event.target.value))" @keydown.enter="$event.target.blur()">
        <span class="fl-hint" role="status" x-text="hint"></span>
    </div>

    <div class="fl-toolbar">
        <div class="fl-group">
            <button type="button" class="fl-tool fl-play" data-fl-play :aria-pressed="playing" :aria-label="playing ? 'Pause' : 'Play'"
                    title="Play or pause (Space)" @click="toggle()">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill-rule="evenodd"><path :d="playing ? ICONS.pause : ICONS.play"></path></svg>
            </button>
            <button type="button" class="fl-tool" data-fl-stop aria-label="Stop" title="Stop" @click="stop()">
                <svg viewBox="0 0 24 24" aria-hidden="true" fill-rule="evenodd"><path :d="ICONS.stop"></path></svg>
            </button>
        </div>
        <div class="fl-group" role="group" aria-label="Play mode">
            <template x-for="value in ['pattern', 'song']" :key="value">
                <button type="button" class="fl-tool" :data-fl-mode="value" :aria-pressed="mode === value" @click="setMode(value)"
                        x-text="value === 'pattern' ? 'PAT' : 'SONG'"></button>
            </template>
        </div>
        <div class="fl-group fl-tempo">
            <button type="button" class="fl-tool" aria-label="Slower" @click="change((p) => FL.setTempo(p, p.bpm - 1), false)">−</button>
            <input type="number" :min="MIN_BPM" :max="MAX_BPM" :value="project.bpm" aria-label="Tempo in beats per minute" data-fl-bpm
                   @blur="change((p) => FL.setTempo(p, $event.target.value), false)" @keydown.enter="$event.target.blur()">
            <button type="button" class="fl-tool" aria-label="Faster" @click="change((p) => FL.setTempo(p, p.bpm + 1), false)">+</button>
        </div>
        <output class="fl-lcd" data-fl-position aria-label="Song position">1:1:1</output>
        <label class="fl-group">
            <span class="fl-label">Master</span>
            <input type="range" class="fl-range" min="0" max="1" step="0.01" :value="project.masterVolume" aria-label="Master volume"
                   @input="change((p) => FL.setMasterVolume(p, $event.target.value), false)">
        </label>
        <div class="fl-group">
            <select class="fl-select" aria-label="Pattern" data-fl-pattern @change="patternId = $event.target.value">
                <template x-for="item in project.patterns" :key="item.id">
                    <option :value="item.id" :selected="item.id === pattern.id" x-text="item.name"></option>
                </template>
            </select>
            <button type="button" class="fl-tool" aria-label="New pattern" title="New pattern (F4)" @click="run('newPattern')">+</button>
        </div>
        <div class="fl-group fl-views" role="group" aria-label="Windows">
            <template x-for="panel in PANELS" :key="panel">
                <button type="button" class="fl-tool" :data-fl-view="panel" :aria-pressed="views[panel]" :aria-label="PANEL_LABELS[panel]"
                        :title="PANEL_LABELS[panel]" @click="run('view:' + panel)">
                    <svg viewBox="0 0 24 24" aria-hidden="true" fill-rule="evenodd"><path :d="ICONS[panel]"></path></svg>
                </button>
            </template>
        </div>
    </div>

    <div class="fl-tabs" role="tablist" aria-label="Windows">
        <template x-for="panel in PANELS" :key="panel">
            <button type="button" role="tab" class="fl-tab" :data-fl-tab-button="panel" :aria-selected="tab === panel"
                    @click="tab = panel" x-text="PANEL_LABELS[panel]"></button>
        </template>
    </div>

    <div class="fl-body">
        <aside class="fl-panel fl-browser" data-fl-panel="browser" :data-open="String(views.browser)" aria-label="Browser">
            <div class="fl-panel-head">Browser</div>
            <div class="fl-browser-list">
                <p class="fl-browser-group">Instruments</p>
                <template x-for="instrument in INSTRUMENTS" :key="instrument.id">
                    <div class="fl-browser-item">
                        <button type="button" class="fl-browser-preview" :data-fl-instrument="instrument.id" :title="'Hear ' + instrument.name"
                                @click="browse(instrument)">
                            <span class="fl-swatch" :style="'--c: ' + instrument.colour"></span><span x-text="instrument.name"></span>
                        </button>
                        <button type="button" class="fl-browser-add" :data-fl-add="instrument.id" :aria-label="'Add ' + instrument.name + ' to the channel rack'"
                                @click="run('add:' + instrument.id)">+</button>
                    </div>
                </template>
                <p class="fl-browser-group">Projects</p>
                <button type="button" class="fl-browser-file" @click="run('openDemo')">Demo</button>
                <template x-for="entry in savedFiles" :key="entry.name">
                    <button type="button" class="fl-browser-file" :data-fl-file="entry.name" @click="openFile(entry)" x-text="entry.name"></button>
                </template>
            </div>
        </aside>

        <div class="fl-workspace">
            <section class="fl-panel fl-rack" data-fl-panel="rack" :data-open="String(views.rack)" aria-label="Channel rack">
                <div class="fl-panel-head">
                    <span>Channel rack</span>
                    <input class="fl-select" aria-label="Pattern name" :value="pattern.name"
                           @blur="change((p) => FL.renamePattern(p, pattern.id, $event.target.value))" @keydown.enter="$event.target.blur()">
                    <select class="fl-select fl-push" aria-label="Pattern length" data-fl-bars @change="run('bars:' + $event.target.value)">
                        <template x-for="bars in [1, 2, 4]" :key="bars">
                            <option :value="bars" :selected="pattern.bars === bars" x-text="bars + ' bar' + (bars > 1 ? 's' : '')"></option>
                        </template>
                    </select>
                </div>
                <div class="fl-rack-body">
                    <template x-for="item in project.channels" :key="item.id">
                        <div class="fl-row" :data-fl-channel="item.id" :data-selected="String(item.id === channel.id)">
                            <div class="fl-row-head">
                                <button type="button" class="fl-led" :aria-pressed="!item.mute" :aria-label="item.name + ' on'" title="Mute"
                                        @click="change((p) => FL.updateChannel(p, item.id, { mute: !item.mute }))"></button>
                                <input type="range" class="fl-knob" min="0" max="1" step="0.01" :value="item.volume" :aria-label="item.name + ' volume'"
                                       @input="change((p) => FL.updateChannel(p, item.id, { volume: Number($event.target.value) }), false)">
                                <button type="button" class="fl-channel-name" :style="'--c: ' + FL.instrumentFor(item).colour" :data-fl-channel-name="item.id"
                                        title="Open in the piano roll" @click="openPiano(item.id)" x-text="item.name"></button>
                            </div>
                            <div class="fl-steps">
                                <template x-for="index in steps" :key="index">
                                    <button type="button" class="fl-step" :data-fl-step="index" :data-fl-col="mode === 'pattern' ? index : null"
                                            :data-beat="Math.floor(index / 4) % 2" :aria-pressed="stepOn(item.id, index)"
                                            :aria-label="item.name + ' step ' + (index + 1)" @click="toggleStep(item.id, index)"></button>
                                </template>
                            </div>
                        </div>
                    </template>
                </div>
                <div class="fl-panel-foot">
                    <select class="fl-select" aria-label="Add a channel" @change="$event.target.value && run('add:' + $event.target.value); $event.target.value = ''">
                        <option value="">Add a channel...</option>
                        <template x-for="instrument in INSTRUMENTS" :key="instrument.id">
                            <option :value="instrument.id" x-text="instrument.name"></option>
                        </template>
                    </select>
                    <button type="button" class="fl-button" :disabled="project.channels.length <= 1"
                            @click="change((p) => FL.removeChannel(p, channel.id))" x-text="'Remove ' + channel.name"></button>
                    <span class="fl-count" x-text="project.channels.length + ' channels'"></span>
                </div>
            </section>

            <section class="fl-panel fl-piano" data-fl-panel="piano" :data-open="String(views.piano)" aria-label="Piano roll">
                <div class="fl-panel-head">
                    <span>Piano roll</span>
                    <span class="fl-label">Channel</span>
                    <select class="fl-select" aria-label="Piano roll channel" @change="channelId = $event.target.value">
                        <template x-for="item in project.channels" :key="item.id">
                            <option :value="item.id" :selected="item.id === channel.id" x-text="item.name"></option>
                        </template>
                    </select>
                    <span class="fl-label">Sound</span>
                    <select class="fl-select" aria-label="Instrument" @change="change((p) => FL.updateChannel(p, channel.id, { instrument: $event.target.value }))">
                        <template x-for="instrument in INSTRUMENTS" :key="instrument.id">
                            <option :value="instrument.id" :selected="instrument.id === channel.instrument" x-text="instrument.name"></option>
                        </template>
                    </select>
                    <span class="fl-panel-sub fl-push" x-text="pattern.name"></span>
                </div>
                <div class="fl-piano-body" x-ref="pianoBody">
                    <div class="fl-keys">
                        <template x-for="pitch in PITCHES" :key="pitch">
                            <button type="button" class="fl-key" :data-black="String(FL.isBlackKey(pitch))" :aria-label="FL.noteName(pitch)"
                                    @pointerdown="preview(channel.id, pitch)" x-text="pitch % 12 === 0 ? FL.noteName(pitch) : ''"></button>
                        </template>
                    </div>
                    <div class="fl-grid" data-fl-grid x-ref="grid" :style="'--steps: ' + steps.length + '; --rows: ' + PITCHES.length"
                         @pointerdown="pianoDown($event)">
                        <div class="fl-playhead"></div>
                        <template x-for="note in pianoNotes" :key="note.step + ':' + note.pitch">
                            <div class="fl-note" :data-fl-note="note.step + ':' + note.pitch"
                                 :style="'--s: ' + note.step + '; --l: ' + note.length + '; --r: ' + (TOP_PITCH - note.pitch)">
                                <span x-text="FL.noteName(note.pitch)"></span><span class="fl-note-edge" data-fl-edge></span>
                            </div>
                        </template>
                    </div>
                </div>
            </section>

            <section class="fl-panel fl-playlist" data-fl-panel="playlist" :data-open="String(views.playlist)" aria-label="Playlist">
                <div class="fl-panel-head">
                    <span>Playlist</span>
                    <span class="fl-panel-sub" x-text="'Click a bar to place ' + pattern.name"></span>
                </div>
                <div class="fl-playlist-body">
                    <div class="fl-corner"></div>
                    <div class="fl-ruler">
                        <template x-for="bar in BARS" :key="bar">
                            <button type="button" class="fl-bar-number" :aria-label="'Play the song from bar ' + (bar + 1)" @click="seekBar(bar)"
                                    x-text="bar + 1"></button>
                        </template>
                    </div>
                    <div class="fl-tracks">
                        <template x-for="track in TRACKS" :key="track">
                            <div class="fl-track-name" x-text="'Track ' + (track + 1)"></div>
                        </template>
                    </div>
                    <div class="fl-lanes" data-fl-lanes x-ref="lanes" :style="'--bars: ' + SONG_BARS + '; --tracks: ' + TRACK_COUNT"
                         @pointerdown="playlistDown($event)">
                        <div class="fl-playhead"></div>
                        <template x-for="clip in project.playlist.filter((item) => clipPattern(item))" :key="clip.id">
                            <div class="fl-clip" :data-fl-clip="clip.id" :title="clipPattern(clip).name + ': drag to move, click to remove'"
                                 :style="'--t: ' + clip.track + '; --b: ' + clip.bar + '; --w: ' + clipPattern(clip).bars + '; --c: ' + clipPattern(clip).colour"
                                 x-text="clipPattern(clip).name"></div>
                        </template>
                    </div>
                </div>
            </section>
        </div>
    </div>

    <section class="fl-panel fl-mixer" data-fl-panel="mixer" :data-open="String(views.mixer)" aria-label="Mixer">
        <div class="fl-panel-head">Mixer</div>
        <div class="fl-mixer-body">
            <div class="fl-strip fl-strip-master">
                <span class="fl-strip-name">Master</span>
                <input type="range" class="fl-fader" min="0" max="1" step="0.01" :value="project.masterVolume" aria-label="Master fader"
                       @input="change((p) => FL.setMasterVolume(p, $event.target.value), false)">
                <div class="fl-meter" data-fl-meter="master"></div>
            </div>
            <template x-for="item in project.channels" :key="item.id">
                <div class="fl-strip" :data-fl-strip="item.id">
                    <span class="fl-strip-name" :style="'--c: ' + FL.instrumentFor(item).colour" x-text="item.name"></span>
                    <input type="range" class="fl-fader" min="0" max="1" step="0.01" :value="item.volume" :aria-label="item.name + ' fader'"
                           @input="change((p) => FL.updateChannel(p, item.id, { volume: Number($event.target.value) }), false)">
                    <div class="fl-meter" :data-fl-meter="item.id"></div>
                    <input type="range" class="fl-pan" min="-1" max="1" step="0.05" :value="item.pan" :aria-label="item.name + ' pan'"
                           @input="change((p) => FL.updateChannel(p, item.id, { pan: Number($event.target.value) }), false)">
                    <div class="fl-strip-buttons">
                        <button type="button" class="fl-mute" :aria-pressed="item.mute" :aria-label="'Mute ' + item.name"
                                @click="change((p) => FL.updateChannel(p, item.id, { mute: !item.mute }))">M</button>
                        <button type="button" class="fl-solo" :aria-pressed="item.solo" :aria-label="'Solo ' + item.name"
                                @click="change((p) => FL.soloChannel(p, item.id))">S</button>
                    </div>
                </div>
            </template>
        </div>
    </section>

    <template x-if="dialog">
        <div class="fl-dialog-backdrop" @pointerdown.self="dialog = null">
            <div style="display: contents">
                <template x-if="dialog === 'help'">
                    <div class="fl-dialog" role="dialog" aria-label="Keyboard shortcuts">
                        <h2>Using FL Studio</h2>
                        <ul>
                            <template x-for="line in HELP" :key="line"><li x-text="line"></li></template>
                        </ul>
                        <div class="fl-dialog-actions">
                            <button type="button" class="fl-button" @click="dialog = null">Close</button>
                        </div>
                    </div>
                </template>
                <template x-if="dialog === 'open'">
                    <div class="fl-dialog" role="dialog" aria-label="Open project">
                        <h2>Open a project from Documents\FL Studio</h2>
                        <template x-for="entry in savedFiles" :key="entry.name">
                            <button type="button" class="fl-browser-file" :data-fl-file="entry.name" @click="openFile(entry)" x-text="entry.name"></button>
                        </template>
                        <template x-if="!savedFiles.length">
                            <p class="fl-empty">Nothing saved yet. Use File, Save to keep a project here.</p>
                        </template>
                        <div class="fl-dialog-actions">
                            <button type="button" class="fl-button" @click="dialog = null">Cancel</button>
                        </div>
                    </div>
                </template>
                <template x-if="dialog === 'saveAs'">
                    <form class="fl-dialog" role="dialog" aria-label="Save project as" @submit.prevent="saveAs()">
                        <h2 x-text="'Save as, in ' + FOLDER"></h2>
                        <input aria-label="File name" x-model="saveName" x-init="$nextTick(() => $el.focus())">
                        <div class="fl-dialog-actions">
                            <button type="button" class="fl-button" @click="dialog = null">Cancel</button>
                            <button type="submit" class="fl-button">Save</button>
                        </div>
                    </form>
                </template>
            </div>
        </div>
    </template>
</div>
