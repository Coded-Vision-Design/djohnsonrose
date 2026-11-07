<?php
// partials/powerpoint-slide.php: one PowerPoint slide, the same markup as
// SlideView in v2's PowerPoint.tsx. partials/apps/powerpoint.php includes it
// twice, for the window and for the slide show, with $slideFit naming the zoom
// that fits it to each.
$slideFit ??= 'fit';
?>
<div class="ppt-slide" data-slide :data-slide-kind="slide.kind" :style="`--office-zoom: ${<?php echo $slideFit; ?>}`">
    <template x-if="slide.kind === 'title' && slide.image">
        <img :src="slide.image" :alt="slide.alt">
    </template>
    <div class="ppt-slide-body">
        <div class="ppt-slide-count" x-text="`Slide ${active + 1} / ${slides.length}`"></div>
        <h2 class="ppt-slide-title" data-slide-title x-text="slide.heading"></h2>
        <template x-if="slide.kind === 'title' && slide.text">
            <p class="ppt-slide-text" x-text="slide.text"></p>
        </template>
        <template x-if="slide.kind === 'title' && slide.tags.length">
            <div class="ppt-tags">
                <template x-for="(tag, i) in slide.tags" :key="i">
                    <span class="ppt-tag" x-text="tag"></span>
                </template>
            </div>
        </template>
        <template x-if="slide.kind === 'title' && slide.url">
            <a class="ppt-slide-link" :href="slide.url" target="_blank" rel="noopener noreferrer" x-text="slide.link"></a>
        </template>
        <template x-if="slide.kind === 'points' && !slide.ordered">
            <ul class="ppt-points">
                <template x-for="(item, i) in slide.items" :key="i">
                    <li x-text="item"></li>
                </template>
            </ul>
        </template>
        <template x-if="slide.kind === 'points' && slide.ordered">
            <ol class="ppt-points">
                <template x-for="(item, i) in slide.items" :key="i">
                    <li x-text="item"></li>
                </template>
            </ol>
        </template>
        <template x-if="slide.kind === 'metrics'">
            <ul class="ppt-metrics">
                <template x-for="(metric, i) in slide.metrics" :key="i">
                    <li class="ppt-metric">
                        <!-- The result says the figure again, so a screen reader hears it once. -->
                        <strong class="ppt-metric-figure" aria-hidden="true" x-text="metric.figure"></strong>
                        <span class="ppt-metric-text" x-text="metric.text"></span>
                    </li>
                </template>
            </ul>
        </template>
        <template x-if="slide.kind === 'shots'">
            <div class="ppt-shots">
                <template x-for="shot in slide.shots" :key="shot.url">
                    <figure class="ppt-shot">
                        <img :src="shot.url" :alt="shot.alt">
                        <figcaption x-text="shot.name"></figcaption>
                    </figure>
                </template>
            </div>
        </template>
        <template x-if="slide.kind !== 'title'">
            <div class="ppt-slide-footer" x-text="deck.title"></div>
        </template>
    </div>
</div>
