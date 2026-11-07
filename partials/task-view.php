<!-- partials/task-view.php: Task View, the same as v2's TaskView.tsx. Every open
     window as a card, most recently used first, over a dimmed, blurred desktop.
     The taskbar's Task View button, Alt+Shift+T and the phones' Open apps button
     open it. Logic in assets/js/components/os/switching.js, styles in windowing.css. -->
<div class="os-switching" x-data="taskView"
     @keydown.window="onShortcut($event)"
     @pointerdown.window.capture="onPointerDown($event)">
    <template x-if="$store.os.taskSwitcherOpen">
        <div class="os-task-view" data-task-view role="dialog" aria-modal="true" aria-label="Task view" tabindex="-1"
             x-init="opened()"
             @keydown="onKey($event)"
             @click.self="cancel()"
             @contextmenu.prevent.stop>
            <div class="os-task-view-head">
                <h2>Task view</h2>
                <button type="button" class="os-task-view-done" @click="cancel()">Done</button>
            </div>
            <template x-if="cards.length === 0">
                <p class="os-task-view-empty">No apps are open.</p>
            </template>
            <template x-if="cards.length > 0">
                <ul class="os-task-view-grid" @click.self="cancel()">
                    <template x-for="win in cards" :key="win.id">
                        <li class="os-task-view-card" :data-task-card="win.id">
                            <button type="button" class="os-task-view-open" @click="choose(win.id)">
                                <span class="os-switch-label"><img :src="appIcon(win.app)" alt=""><span x-text="win.title"></span></span>
                                <span class="os-switch-thumb"><img :src="appIcon(win.app)" alt=""></span>
                            </button>
                            <button type="button" class="os-task-view-close" title="Close" :aria-label="`Close ${win.title}`" @click="closeCard(win.id)">
                                <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M10,1.4L8.6,0L5,3.6L1.4,0L0,1.4L3.6,5L0,8.6L1.4,10L5,6.4l3.6,3.6l1.4-1.4L6.4,5L10,1.4z"/></svg>
                            </button>
                        </li>
                    </template>
                </ul>
            </template>
        </div>
    </template>
</div>
