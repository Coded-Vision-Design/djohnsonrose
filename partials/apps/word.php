<!-- partials/apps/word.php: the same markup as v2's Word.tsx, styled by assets/css/office.css. -->
<div class="office-app" data-office-app="word" x-data="wordApp()">
    <div class="office-titlebar">
        <div class="office-titlebar-name">
            <img :src="imgPath + 'word.webp'" alt="">
            <span>CV.docx - Word</span>
        </div>
        <div class="office-titlebar-side">
            <div class="office-qat">
                <button type="button" title="Save" aria-label="Save" disabled>
                    <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.save.d"/></svg>
                </button>
                <button type="button" title="Undo" aria-label="Undo" @mousedown.prevent @click="run('undo')">
                    <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.undo.d"/></svg>
                </button>
            </div>
            <span class="office-user office-optional">DeVanté Johnson-Rose</span>
        </div>
    </div>

    <div class="office-tabs">
        <template x-for="tab in TABS" :key="tab">
            <span class="office-tab" :data-active="tab === 'Home' ? '' : null" x-text="tab"></span>
        </template>
    </div>

    <div class="word-ribbon" role="toolbar" aria-label="Home">
        <div class="word-group" role="group" aria-label="Clipboard" data-word-group="Clipboard">
            <div class="word-group-body">
                <button type="button" class="word-btn word-btn-large" @mousedown.prevent @click="run('paste')">
                    <svg class="office-icon" data-stroke viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.paste.d"/></svg>
                    <span>Paste</span>
                </button>
                <div class="word-group-stack">
                    <button type="button" class="word-btn word-btn-small" @mousedown.prevent @click="run('cut')">
                        <svg class="office-icon" data-stroke viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.cut.d"/></svg>
                        <span>Cut</span>
                    </button>
                    <button type="button" class="word-btn word-btn-small" @mousedown.prevent @click="run('copy')">
                        <svg class="office-icon" data-stroke viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.copy.d"/></svg>
                        <span>Copy</span>
                    </button>
                </div>
            </div>
            <span class="word-group-label" aria-hidden="true">Clipboard</span>
        </div>

        <div class="word-group" role="group" aria-label="Font" data-word-group="Font">
            <div class="word-group-stack">
                <div class="word-group-row">
                    <select class="word-select word-select-font" aria-label="Font name" @change="fontName = $event.target.value; run('fontName', fontName)">
                        <template x-for="font in FONTS" :key="font">
                            <option :value="font" :selected="font === fontName" x-text="font"></option>
                        </template>
                    </select>
                    <select class="word-select word-select-size" aria-label="Font size" @change="fontSize = $event.target.value; run('fontSize', fontSize)">
                        <template x-for="size in SIZES" :key="size.value">
                            <option :value="size.value" :selected="size.value === fontSize" x-text="size.label"></option>
                        </template>
                    </select>
                </div>
                <div class="word-group-row">
                    <button type="button" class="word-btn word-btn-letter" style="font-weight: 700" title="Bold" aria-label="Bold" :aria-pressed="String(format.bold)" @mousedown.prevent @click="run('bold')">B</button>
                    <button type="button" class="word-btn word-btn-letter" style="font-style: italic" title="Italic" aria-label="Italic" :aria-pressed="String(format.italic)" @mousedown.prevent @click="run('italic')">I</button>
                    <button type="button" class="word-btn word-btn-letter" style="text-decoration: underline" title="Underline" aria-label="Underline" :aria-pressed="String(format.underline)" @mousedown.prevent @click="run('underline')">U</button>
                    <span class="word-divider" aria-hidden="true"></span>
                    <button type="button" class="word-btn word-btn-letter word-btn-colour" title="Font colour" aria-label="Font colour" @mousedown.prevent @click="run('foreColor', '#dc2626')">A</button>
                </div>
            </div>
            <span class="word-group-label" aria-hidden="true">Font</span>
        </div>

        <div class="word-group" role="group" aria-label="Paragraph" data-word-group="Paragraph">
            <div class="word-group-stack">
                <div class="word-group-row">
                    <button type="button" class="word-btn" title="Bullets" aria-label="Bullets" @mousedown.prevent @click="run('insertUnorderedList')">
                        <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.bullets.d"/></svg>
                    </button>
                    <button type="button" class="word-btn" title="Numbering" aria-label="Numbering" @mousedown.prevent @click="run('insertOrderedList')">
                        <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.numbering.d"/></svg>
                    </button>
                </div>
                <div class="word-group-row">
                    <button type="button" class="word-btn" title="Align left" aria-label="Align left" :aria-pressed="String(format.align === 'left')" @mousedown.prevent @click="run('justifyLeft')">
                        <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.alignLeft.d"/></svg>
                    </button>
                    <button type="button" class="word-btn" title="Centre" aria-label="Centre" :aria-pressed="String(format.align === 'center')" @mousedown.prevent @click="run('justifyCenter')">
                        <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.alignCenter.d"/></svg>
                    </button>
                    <button type="button" class="word-btn" title="Align right" aria-label="Align right" :aria-pressed="String(format.align === 'right')" @mousedown.prevent @click="run('justifyRight')">
                        <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.alignRight.d"/></svg>
                    </button>
                </div>
            </div>
            <span class="word-group-label" aria-hidden="true">Paragraph</span>
        </div>

        <div class="word-group" role="group" aria-label="Styles" data-word-group="Styles">
            <div class="word-group-body">
                <button type="button" class="word-style" data-current aria-label="Normal style" @mousedown.prevent @click="run('style', 'normal')">
                    <b>AaBbCc</b><small>Normal</small>
                </button>
                <button type="button" class="word-style word-style-title" aria-label="Title style" @mousedown.prevent @click="run('style', 'title')">
                    <b>AaBbCc</b><small>Title</small>
                </button>
            </div>
            <span class="word-group-label" aria-hidden="true">Styles</span>
        </div>

        <div class="word-group" role="group" aria-label="Editing" data-word-group="Editing">
            <div class="word-group-stack">
                <button type="button" class="word-btn word-btn-small" disabled>
                    <svg class="office-icon" data-stroke viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.find.d"/></svg>
                    <span>Find</span>
                </button>
                <button type="button" class="word-btn word-btn-small" disabled>
                    <svg class="office-icon" data-stroke viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.replace.d"/></svg>
                    <span>Replace</span>
                </button>
            </div>
            <span class="word-group-label" aria-hidden="true">Editing</span>
        </div>

        <div class="word-print">
            <button type="button" @click="print()">
                <svg class="office-icon" data-stroke viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.print.d"/></svg>
                <span>Print PDF</span>
            </button>
        </div>
    </div>

    <div class="word-area" data-word-area x-ref="area">
        <div class="word-page" data-word-page data-word-editor x-ref="editor" contenteditable="true" spellcheck="false"
             role="textbox" aria-multiline="true" aria-label="CV.docx" :style="`--office-zoom: ${zoom}`" @input="recount()"><?php include __DIR__ . '/../../data/cv.php'; ?></div>
    </div>

    <div class="office-status">
        <div class="office-status-group">
            <span class="office-optional">Page 1 of 1</span>
            <span data-word-count x-text="`${words} words`"></span>
            <span class="office-optional">English (United Kingdom)</span>
        </div>
        <div class="office-status-group">
            <span class="office-optional">Focus</span>
            <div class="word-zoom">
                <button type="button" title="Zoom out" aria-label="Zoom out" @click="zoomBy(-1)">
                    <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.zoomOut.d"/></svg>
                </button>
                <span class="word-zoom-track" :style="`--office-zoom-at: ${O.zoomSliderAt(zoom) * 100}%`" aria-hidden="true"></span>
                <button type="button" title="Zoom in" aria-label="Zoom in" @click="zoomBy(1)">
                    <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.zoomIn.d"/></svg>
                </button>
                <span class="word-zoom-value" data-word-zoom x-text="`${Math.round(zoom * 100)}%`"></span>
            </div>
        </div>
    </div>
</div>
