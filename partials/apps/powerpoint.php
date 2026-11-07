<!-- partials/apps/powerpoint.php: the same markup as v2's PowerPoint.tsx, styled by assets/css/office.css. -->
<div class="office-app" data-office-app="powerpoint" x-data="powerpointApp()">
    <div class="office-titlebar">
        <div class="office-titlebar-name">
            <img :src="imgPath + 'powerpoint.webp'" alt="">
            <span data-deck-title x-text="deck ? `${deck.title} case study - PowerPoint` : 'Case studies - PowerPoint'"></span>
        </div>
        <span class="office-user office-optional">DeVanté Johnson-Rose</span>
    </div>

    <div class="office-tabs">
        <template x-for="tab in TABS" :key="tab">
            <span class="office-tab" :data-active="tab === 'Home' ? '' : null" x-text="tab"></span>
        </template>
    </div>

    <div class="ppt-body">
        <nav class="ppt-thumbs" aria-label="Case studies">
            <template x-for="(item, index) in decks" :key="item.id">
                <button type="button" class="ppt-thumb" :data-deck="item.id" :aria-current="index === deckAt ? 'true' : null" @click="pick(index)">
                    <template x-if="item.cover">
                        <img :src="item.cover" alt="" loading="lazy">
                    </template>
                    <span x-text="item.title"></span>
                </button>
            </template>
        </nav>

        <div class="ppt-main">
            <div class="ppt-stage" data-slide-stage x-ref="stage">
                <template x-if="slide && deck">
                    <?php $slideFit = 'fit'; include __DIR__ . '/../powerpoint-slide.php'; ?>
                </template>
                <template x-if="!(slide && deck)">
                    <div class="ppt-message" x-text="state === 'error' ? 'The case studies could not be loaded.' : 'Loading case studies…'"></div>
                </template>
            </div>

            <div class="ppt-toolbar" role="group" aria-label="Slides">
                <div class="ppt-nav">
                    <button type="button" title="Previous slide" aria-label="Previous slide" :disabled="active === 0" @click="step(-1)">
                        <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.previous.d"/></svg>
                    </button>
                    <span class="ppt-counter" data-slide-counter aria-live="polite" x-text="`${slides.length ? active + 1 : 0} / ${slides.length}`"></span>
                    <button type="button" title="Next slide" aria-label="Next slide" :disabled="active >= slides.length - 1" @click="step(1)">
                        <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.next.d"/></svg>
                    </button>
                </div>
                <button type="button" class="ppt-present" x-ref="present" :disabled="!slide" @click="present()">
                    <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.present.d"/></svg>
                    <span>Present</span>
                </button>
            </div>
        </div>
    </div>

    <div class="office-status">
        <div class="office-status-group">
            <span data-slide-status x-text="`Slide ${slides.length ? active + 1 : 0} of ${slides.length}`"></span>
            <span class="office-optional">English (United Kingdom)</span>
        </div>
        <div class="office-status-group">
            <span class="office-optional">Arrow keys change slide</span>
        </div>
    </div>

    <dialog class="ppt-show" data-present :aria-label="deck ? `${deck.title} case study, slide show` : 'Slide show'" tabindex="-1" x-ref="show" @cancel.prevent="endShow()" @close="presenting = false">
        <div class="ppt-show-stage" x-ref="showStage">
            <template x-if="presenting && slide && deck">
                <?php $slideFit = 'showFit'; include __DIR__ . '/../powerpoint-slide.php'; ?>
            </template>
        </div>
        <div class="ppt-show-bar">
            <div class="ppt-nav">
                <button type="button" title="Previous slide" aria-label="Previous slide" :disabled="active === 0" @click="step(-1)">
                    <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.previous.d"/></svg>
                </button>
                <span class="ppt-counter" data-show-counter x-text="`${slides.length ? active + 1 : 0} / ${slides.length}`"></span>
                <button type="button" title="Next slide" aria-label="Next slide" :disabled="active >= slides.length - 1" @click="step(1)">
                    <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.next.d"/></svg>
                </button>
            </div>
            <button type="button" class="ppt-end-show" title="End show (Esc)" @click="endShow()">
                <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.endShow.d"/></svg>
                <span>End show</span>
            </button>
        </div>
    </dialog>
</div>
