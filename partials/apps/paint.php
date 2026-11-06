<!-- partials/apps/paint.php: the same markup as v2's Paint.tsx, styled by assets/css/drawing.css. -->
<div class="pt-app" x-data="paintApp" :data-tool="s.tool">
    <div class="pt-tabs" role="tablist" aria-label="Paint">
        <template x-for="tab in TABS" :key="tab.id">
            <button type="button" role="tab" class="pt-tab" :data-paint-tab="tab.id" :aria-selected="s.tab === tab.id"
                    @click="call('setTab', tab.id)" x-text="tab.label"></button>
        </template>
    </div>

    <div class="pt-ribbon" role="tabpanel" aria-label="File" :hidden="s.tab !== 'file'">
        <div class="pt-group">
            <div class="pt-group-body">
                <button type="button" class="pt-button pt-big" data-paint-command="new" @click="run('new')">
                    <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.new"></path></svg>
                    <span>New</span>
                </button>
                <button type="button" class="pt-button pt-big" data-paint-command="save" @click="run('save')">
                    <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.save"></path></svg>
                    <span>Save as PNG</span>
                </button>
            </div>
            <span class="pt-group-label">File</span>
        </div>
    </div>

    <div class="pt-ribbon" role="tabpanel" aria-label="Home" :hidden="s.tab !== 'home'">
        <div class="pt-group">
            <div class="pt-group-body pt-stack">
                <button type="button" class="pt-button" data-paint-command="undo" aria-label="Undo" title="Undo (Ctrl+Z)" :disabled="off('undo')" @click="run('undo')">
                    <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.undo"></path></svg>
                </button>
                <button type="button" class="pt-button" data-paint-command="redo" aria-label="Redo" title="Redo (Ctrl+Y)" :disabled="off('redo')" @click="run('redo')">
                    <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.redo"></path></svg>
                </button>
            </div>
            <span class="pt-group-label">History</span>
        </div>

        <div class="pt-group">
            <div class="pt-group-body">
                <div class="pt-grid" role="group" aria-label="Tools">
                    <template x-for="tool in TOOLS" :key="tool.id">
                        <button type="button" class="pt-button" :data-paint-tool="tool.id" :aria-label="tool.label" :title="tool.label"
                                :aria-pressed="s.tool === tool.id" @click="call('setTool', tool.id)">
                            <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS[tool.id]"></path></svg>
                        </button>
                    </template>
                </div>
            </div>
            <span class="pt-group-label">Tools</span>
        </div>

        <div class="pt-group">
            <div class="pt-group-body">
                <button type="button" class="pt-button pt-big" data-paint-tool="brush" :aria-pressed="s.tool === 'brush'" @click="call('setTool', 'brush')">
                    <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.brush"></path></svg>
                    <span>Brush</span>
                </button>
            </div>
            <span class="pt-group-label">Brushes</span>
        </div>

        <div class="pt-group">
            <div class="pt-group-body">
                <div class="pt-grid" role="group" aria-label="Shapes">
                    <template x-for="shape in SHAPES" :key="shape.id">
                        <button type="button" class="pt-button" :data-paint-shape="shape.id" :aria-label="shape.label" :title="shape.label"
                                :aria-pressed="s.tool === 'shape' && s.shape === shape.id" @click="call('setShape', shape.id)">
                            <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS[shape.id]"></path></svg>
                        </button>
                    </template>
                </div>
            </div>
            <span class="pt-group-label">Shapes</span>
        </div>

        <div class="pt-group">
            <div class="pt-group-body pt-size">
                <span class="pt-size-row">
                    <span class="pt-size-preview" aria-hidden="true">
                        <span class="pt-size-dot" :style="'--s: ' + s.size + 'px'"></span>
                    </span>
                    <span class="pt-size-value" x-text="s.size + 'px'"></span>
                </span>
                <input type="range" :min="MIN_SIZE" :max="MAX_SIZE" :value="s.size" aria-label="Size" data-paint-size
                       @input="call('setSize', $event.target.value)">
            </div>
            <span class="pt-group-label">Size</span>
        </div>

        <div class="pt-group">
            <div class="pt-group-body pt-colours">
                <div class="pt-wells">
                    <template x-for="slot in [0, 1]" :key="slot">
                        <button type="button" class="pt-well" :data-paint-slot="slot" :aria-label="'Colour ' + (slot + 1)" :title="'Colour ' + (slot + 1)"
                                :aria-pressed="s.slot === slot" @click="call('setSlot', slot)">
                            <span class="pt-well-swatch" :style="'--c: ' + s.colours[slot]"></span>
                        </button>
                    </template>
                </div>
                <div class="pt-palette" role="group" aria-label="Palette">
                    <template x-for="swatch in PALETTE" :key="swatch.hex">
                        <button type="button" class="pt-swatch" :data-paint-colour="swatch.hex" :aria-label="swatch.name" :title="swatch.name"
                                :style="'--c: ' + swatch.hex" @click="call('setColour', swatch.hex)"></button>
                    </template>
                </div>
                <label class="pt-edit" title="Edit colours">
                    <span class="pt-well-swatch" style="--c: conic-gradient(red, yellow, lime, aqua, blue, magenta, red)"></span>
                    <span>Edit colours</span>
                    <input type="color" :value="s.colours[s.slot]" aria-label="Edit colours" data-paint-custom
                           @input="call('setColour', $event.target.value)">
                </label>
            </div>
            <span class="pt-group-label">Colours</span>
        </div>

        <div class="pt-actions">
            <button type="button" class="pt-action" data-paint-command="clear" @click="run('clear')">
                <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.clear"></path></svg>
                Clear
            </button>
            <button type="button" class="pt-action pt-action-primary" data-paint-command="save" @click="run('save')">
                <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.save"></path></svg>
                Save PNG
            </button>
        </div>
    </div>

    <div class="pt-ribbon" role="tabpanel" aria-label="View" :hidden="s.tab !== 'view'">
        <div class="pt-group">
            <div class="pt-group-body">
                <button type="button" class="pt-button pt-big" data-paint-command="zoomIn" :disabled="off('zoomIn')" @click="run('zoomIn')">
                    <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.zoomIn"></path></svg>
                    <span>Zoom in</span>
                </button>
                <button type="button" class="pt-button pt-big" data-paint-command="zoomOut" :disabled="off('zoomOut')" @click="run('zoomOut')">
                    <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.zoomOut"></path></svg>
                    <span>Zoom out</span>
                </button>
                <button type="button" class="pt-button pt-big" data-paint-command="zoomReset" :disabled="off('zoomReset')" @click="run('zoomReset')">
                    <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.actual"></path></svg>
                    <span>100%</span>
                </button>
            </div>
            <span class="pt-group-label">Zoom</span>
        </div>
    </div>

    <div class="pt-viewport" data-paint-viewport>
        <div class="pt-frame" data-paint-frame>
            <div class="pt-sheet">
                <canvas class="pt-canvas" data-paint-canvas aria-label="Canvas"></canvas>
            </div>
            <textarea class="pt-textbox" data-paint-text aria-label="Text" rows="1" hidden></textarea>
            <span class="pt-handle" data-paint-resize="x" aria-hidden="true"></span>
            <span class="pt-handle" data-paint-resize="y" aria-hidden="true"></span>
            <span class="pt-handle" data-paint-resize="xy" aria-hidden="true"></span>
        </div>
    </div>

    <div class="pt-status">
        <span class="pt-status-item">
            <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.pointer"></path></svg>
            <span class="pt-pointer" data-paint-pointer></span>
        </span>
        <span class="pt-status-item pt-status-size">
            <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.size"></path></svg>
            <span data-paint-dimensions x-text="s.width + ' × ' + s.height + 'px'"></span>
        </span>
        <span class="pt-zoom">
            <span class="pt-zoom-value" data-paint-zoom x-text="s.zoom + '%'"></span>
            <button type="button" class="pt-button" aria-label="Zoom out" :disabled="off('zoomOut')" @click="run('zoomOut')">
                <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.minus"></path></svg>
            </button>
            <input type="range" min="0" :max="ZOOM_LEVELS.length - 1" :value="zoomIndex()" aria-label="Zoom" :aria-valuetext="s.zoom + '%'"
                   @input="call('setZoom', ZOOM_LEVELS[Number($event.target.value)])">
            <button type="button" class="pt-button" aria-label="Zoom in" :disabled="off('zoomIn')" @click="run('zoomIn')">
                <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.plus"></path></svg>
            </button>
        </span>
    </div>
</div>
