<!-- partials/apps/powerpoint.php: the same markup as v2's PowerPoint.tsx, styled by assets/css/office.css. -->
<div class="office-app" data-office-app="powerpoint" x-data="powerpointApp()">
    <div class="office-titlebar">
        <div class="office-titlebar-name">
            <img :src="imgPath + 'powerpoint.webp'" alt="">
            <span>Portfolio.pptx - PowerPoint</span>
        </div>
        <span class="office-user office-optional">DeVanté Johnson-Rose</span>
    </div>

    <div class="office-tabs">
        <template x-for="tab in TABS" :key="tab">
            <span class="office-tab" :data-active="tab === 'Home' ? '' : null" x-text="tab"></span>
        </template>
    </div>

    <div class="ppt-body">
        <div class="ppt-thumbs" role="group" aria-label="Slides">
            <template x-for="(slide, index) in slides" :key="slide.id">
                <button type="button" class="ppt-thumb" data-slide-thumb :aria-current="index === active ? 'true' : null" @click="active = index">
                    <img :src="slide.image" alt="" loading="lazy">
                    <span x-text="`${index + 1}. ${slide.title}`"></span>
                </button>
            </template>
        </div>

        <div class="ppt-stage" data-slide-stage x-ref="stage">
            <template x-if="slides[active]">
                <div class="ppt-slide" data-slide :style="`--office-zoom: ${fit}`">
                    <img :src="slides[active].image" :alt="`The ${slides[active].title} website`">
                    <div class="ppt-slide-body">
                        <div class="ppt-slide-count" x-text="`Slide ${active + 1} / ${slides.length}`"></div>
                        <h2 class="ppt-slide-title" data-slide-title x-text="slides[active].title"></h2>
                        <p class="ppt-slide-text" x-text="slides[active].description"></p>
                        <div class="ppt-tags">
                            <template x-for="tag in slides[active].tags" :key="tag">
                                <span class="ppt-tag" x-text="tag"></span>
                            </template>
                        </div>
                    </div>
                </div>
            </template>
            <template x-if="!slides[active]">
                <div class="ppt-message" x-text="state === 'error' ? 'The slides could not be loaded.' : 'Loading slides…'"></div>
            </template>
        </div>
    </div>

    <div class="office-status">
        <div class="office-status-group">
            <span data-slide-status x-text="`Slide ${slides.length ? active + 1 : 0} of ${slides.length}`"></span>
            <span class="office-optional">English (United Kingdom)</span>
        </div>
        <div class="office-status-group">
            <span class="office-optional">Arrow keys change slide</span>
            <button type="button" title="Previous slide" aria-label="Previous slide" :disabled="active === 0" @click="active = Math.max(0, active - 1)">
                <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.previous.d"/></svg>
            </button>
            <button type="button" title="Next slide" aria-label="Next slide" :disabled="active >= slides.length - 1" @click="active = Math.min(slides.length - 1, active + 1)">
                <svg class="office-icon" viewBox="0 0 24 24" aria-hidden="true"><path :d="ICONS.next.d"/></svg>
            </button>
        </div>
    </div>
</div>
