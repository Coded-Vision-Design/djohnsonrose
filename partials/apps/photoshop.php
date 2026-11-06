<!-- partials/apps/photoshop.php: the same markup as v2's Photoshop.tsx, styled by assets/css/drawing.css. -->
<div class="ps-app" x-data="photoshopApp" :data-tool="s.tool">
    <div class="ps-titlebar">
        <img class="ps-logo" :src="window.portfolioConfig.imgPath + 'photoshop.webp'" alt="">
        <span class="ps-title" x-text="'Adobe Photoshop 2025 · untitled-1.psd @ ' + s.zoom + '% (' + layerName() + ', RGB/8)'"></span>
    </div>

    <nav class="ps-menubar" aria-label="Photoshop menu">
        <template x-for="menu in MENUS" :key="menu.id">
            <div class="ps-menu">
                <button type="button" class="ps-menu-button" :data-ps-menu="menu.label" aria-haspopup="menu" :aria-expanded="s.menu === menu.id"
                        @click="call('toggleMenu', menu.id)" x-text="menu.label"></button>
                <template x-if="s.menu === menu.id">
                    <div class="ps-menu-shield" @pointerdown="call('closeMenu')"></div>
                </template>
                <template x-if="s.menu === menu.id">
                    <div class="ps-menu-list" role="menu">
                        <template x-for="(item, index) in menu.items" :key="item.id ?? index">
                            <div style="display: contents">
                                <template x-if="item.separator">
                                    <div class="ps-menu-sep" role="separator"></div>
                                </template>
                                <template x-if="!item.separator">
                                    <button type="button" role="menuitem" class="ps-menu-item" :data-ps-command="item.id" :disabled="off(item.id)" @click="run(item.id)">
                                        <span x-text="item.label"></span>
                                        <span class="ps-menu-key" x-text="item.shortcut ?? ''"></span>
                                    </button>
                                </template>
                            </div>
                        </template>
                    </div>
                </template>
            </div>
        </template>
    </nav>

    <div class="ps-options">
        <span class="ps-dim">Tool:</span>
        <span class="ps-strong" data-ps-tool-name x-text="toolLabel()"></span>
        <span class="ps-sep"></span>
        <label class="ps-field">
            <span class="ps-dim">Size:</span>
            <input type="range" :min="MIN_SIZE" :max="MAX_SIZE" :value="s.size" data-ps-size @input="call('setSize', $event.target.value)">
            <span class="ps-value" x-text="s.size + 'px'"></span>
        </label>
        <span class="ps-sep"></span>
        <label class="ps-field">
            <span class="ps-dim">Zoom:</span>
            <input type="range" min="0" :max="ZOOM_LEVELS.length - 1" :value="zoomIndex()" :aria-valuetext="s.zoom + '%'" data-ps-zoom
                   @input="call('setZoom', ZOOM_LEVELS[Number($event.target.value)])">
            <span class="ps-value" data-ps-zoom-value x-text="s.zoom + '%'"></span>
        </label>
        <button type="button" class="ps-export" data-ps-command="save" @click="run('save')">Export PNG</button>
    </div>

    <div class="ps-main">
        <div class="ps-rail" role="toolbar" aria-label="Tools">
            <template x-for="item in TOOLS" :key="item.id">
                <button type="button" class="ps-tool" :data-ps-tool="item.id" :aria-label="item.label" :title="item.label + ' (' + item.key + ')'"
                        :aria-pressed="s.tool === item.id" @click="call('setTool', item.id)">
                    <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS[TOOL_ICONS[item.id]]"></path></svg>
                </button>
            </template>
            <div class="ps-wells" aria-hidden="true">
                <span class="ps-well ps-well-front" :style="'--c: ' + s.colour"></span>
                <span class="ps-well ps-well-back"></span>
            </div>
        </div>

        <div class="ps-viewport" data-ps-viewport>
            <div class="ps-frame" data-ps-frame>
                <div class="ps-stack" data-ps-stack role="img" aria-label="Canvas"></div>
                <textarea class="ps-textbox" data-ps-text aria-label="Text" rows="1" hidden></textarea>
            </div>
        </div>

        <div class="ps-panels">
            <section aria-label="Swatches">
                <div class="ps-panel-head">Swatches</div>
                <div class="ps-swatches">
                    <template x-for="swatch in SWATCHES" :key="swatch.hex">
                        <button type="button" class="ps-swatch" :data-ps-colour="swatch.hex" :aria-label="swatch.name" :title="swatch.name"
                                :aria-pressed="s.colour === swatch.hex" :style="'--c: ' + swatch.hex" @click="call('setColour', swatch.hex)"></button>
                    </template>
                </div>
                <div class="ps-custom">
                    <input type="color" :value="s.colour" aria-label="Colour" data-ps-custom @input="call('setColour', $event.target.value)">
                    <span class="ps-hex" x-text="s.colour.toUpperCase()"></span>
                </div>
            </section>

            <section class="ps-layers" aria-label="Layers">
                <div class="ps-panel-head">
                    <span>Layers</span>
                    <span class="ps-head-buttons">
                        <button type="button" class="ps-head-button" data-ps-command="newLayer" aria-label="New layer" title="New layer"
                                :disabled="off('newLayer')" @click="run('newLayer')">
                            <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.plus"></path></svg>
                        </button>
                        <button type="button" class="ps-head-button" data-ps-command="deleteLayer" aria-label="Delete layer" title="Delete layer"
                                :disabled="off('deleteLayer')" @click="run('deleteLayer')">
                            <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.clear"></path></svg>
                        </button>
                    </span>
                </div>
                <template x-for="item in s.layers.slice().reverse()" :key="item.id">
                    <div class="ps-layer-row" :data-ps-layer-row="item.id" :data-active="String(s.active === item.id)">
                        <div class="ps-layer-top">
                            <button type="button" class="ps-eye" :data-ps-eye="item.id" :aria-label="'Show ' + item.name" :aria-pressed="item.visible"
                                    :title="item.visible ? 'Hide layer' : 'Show layer'" @click="call('toggleLayer', item.id)">
                                <template x-if="item.visible">
                                    <svg class="dr-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.eye"></path></svg>
                                </template>
                            </button>
                            <button type="button" class="ps-layer-pick" :data-ps-select="item.id" :aria-pressed="s.active === item.id" @click="call('selectLayer', item.id)">
                                <canvas class="ps-thumb" :data-ps-thumb="item.id" width="36" height="24" aria-hidden="true"></canvas>
                                <span class="ps-layer-name" x-text="item.name"></span>
                            </button>
                        </div>
                        <label class="ps-opacity">
                            <span>Opacity</span>
                            <input type="range" min="0" max="100" :value="item.opacity" :aria-label="item.name + ' opacity'" :data-ps-opacity="item.id"
                                   @input="call('setOpacity', item.id, $event.target.value)">
                            <span x-text="item.opacity + '%'"></span>
                        </label>
                    </div>
                </template>
            </section>
        </div>
    </div>

    <div class="ps-status">
        <span x-text="SIZE.width + ' × ' + SIZE.height + ' · 72 ppi · sRGB'"></span>
        <span>RGB/8</span>
    </div>
</div>
