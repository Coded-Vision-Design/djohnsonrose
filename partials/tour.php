<!-- partials/tour.php: the guided tour's toast, the same markup as v2/src/shell/Tour.tsx.
     Its steps, place and timing come from assets/js/windowing/tour.js. -->
<div x-data="tourToast"
     x-effect="watchConsent()"
     :data-tour-covered="covered"
     @keydown.escape.window.capture="onEscape()">
    <div x-ref="ring" data-tour-ring class="os-tour-ring" aria-hidden="true" hidden></div>
    <section x-ref="toast"
             hidden
             :hidden="state.status === 'idle'"
             data-tour-toast
             :data-tour-step="offering ? 'offer' : state.step?.id"
             role="dialog"
             aria-modal="false"
             aria-labelledby="os-tour-title os-tour-count"
             aria-describedby="os-tour-text"
             class="os-tour-toast"
             @pointermove="hover($event, true)"
             @pointerleave="hover($event, false)"
             @focusin="focusIn($event)"
             @focusout="focusOut($event)"
             @contextmenu.prevent.stop>
        <div class="os-tour-head">
            <img src="<?php echo IMG_PATH; ?>startmenu.webp" alt="" class="os-tour-logo">
            <span class="os-tour-app">Tour</span>
            <span id="os-tour-count" class="os-tour-count" data-tour-count x-text="state.count"></span>
        </div>
        <p id="os-tour-title" class="os-tour-title" x-text="title"></p>
        <p id="os-tour-text" class="os-tour-text" x-text="text"></p>
        <div class="os-tour-actions">
            <template x-if="offering">
                <div class="os-tour-buttons">
                    <button type="button" data-tour-dismiss class="os-tour-button" @click="act(() => $store.tour.skip())" x-text="offer.dismiss"></button>
                    <button type="button" data-tour-start class="os-tour-button os-tour-primary" @click="$store.tour.begin()" x-text="offer.start"></button>
                </div>
            </template>
            <template x-if="!offering">
                <div class="os-tour-buttons">
                    <button type="button" data-tour-skip class="os-tour-button" :hidden="state.last" @click="act(() => $store.tour.skip())">Skip tour</button>
                    <button type="button" data-tour-next class="os-tour-button os-tour-primary" @click="act(() => $store.tour.next())" x-text="state.last ? 'Done' : 'Next'"></button>
                </div>
            </template>
        </div>
    </section>
    <div data-tour-live class="sr-only" aria-live="polite" aria-atomic="true" x-text="state.announcement"></div>
</div>
