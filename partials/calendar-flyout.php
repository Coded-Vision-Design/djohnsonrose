<!-- partials/calendar-flyout.php: the clock's notifications and calendar, the same
     as v2's CalendarFlyout.tsx. Its rules are in assets/js/windowing/calendar.js,
     its state in assets/js/components/os/calendar.js and its looks in windowing.css.
     Like v2, it is only in the page while open. Touches and right-clicks stay
     inside it, so that neither opens the desktop's menu. -->
<div x-data="calendarFlyout" class="contents" @keydown.escape.window="dismiss()">
    <template x-if="calendarOpen">
        <div data-calendar-flyout
             role="dialog"
             aria-label="Notifications and calendar"
             class="os-calendar-flyout"
             @click.outside="clickAway($event)"
             @touchstart.stop
             @touchmove.stop
             @contextmenu.prevent.stop>

            <section data-notification-centre class="os-calendar-panel os-notify-panel" aria-labelledby="os-notifications-heading">
                <div class="os-notify-head">
                    <h2 id="os-notifications-heading">Notifications</h2>
                    <template x-if="notes.length">
                        <button type="button" class="os-calendar-text-button" data-notifications-clear @click="clearAll()">Clear all</button>
                    </template>
                </div>
                <template x-if="notes.length">
                    <ul class="os-notify-list">
                        <template x-for="note in notes" :key="note.id">
                            <li data-notification class="os-notify-item">
                                <p x-text="note.message"></p>
                                <time :datetime="noteTime(note)" x-text="noteTime(note)"></time>
                            </li>
                        </template>
                    </ul>
                </template>
                <template x-if="!notes.length">
                    <p class="os-notify-empty">No new notifications</p>
                </template>
            </section>

            <section data-calendar-panel class="os-calendar-panel" aria-labelledby="os-calendar-today">
                <div class="os-calendar-head">
                    <h2 id="os-calendar-today" data-calendar-date x-text="todayLabel"></h2>
                </div>
                <div class="os-calendar-body">
                    <div class="os-calendar-nav">
                        <p id="os-calendar-month" data-calendar-title aria-live="polite" x-text="grid.title"></p>
                        <button type="button" class="os-calendar-text-button" data-calendar-today @click="goToday()">Today</button>
                        <button type="button" class="os-calendar-step" aria-label="Previous month" title="Previous month" @click="step(-1)">
                            <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 4.3 2.3 10l1 1L8 6.3l4.7 4.7 1-1z"/></svg>
                        </button>
                        <button type="button" class="os-calendar-step" aria-label="Next month" title="Next month" @click="step(1)">
                            <svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 11.7 2.3 6l1-1L8 9.7 12.7 5l1 1z"/></svg>
                        </button>
                    </div>
                    <table role="grid" class="os-calendar-grid" aria-labelledby="os-calendar-month" @keydown="onGridKey($event)">
                        <thead role="rowgroup">
                            <tr role="row">
                                <template x-for="name in days" :key="name.long">
                                    <th role="columnheader" scope="col" :aria-label="name.long" x-text="name.short"></th>
                                </template>
                            </tr>
                        </thead>
                        <tbody role="rowgroup">
                            <template x-for="(week, row) in grid.weeks" :key="row">
                                <tr role="row">
                                    <template x-for="cell in week" :key="cell.iso">
                                        <td role="gridcell"
                                            class="os-calendar-day"
                                            :data-calendar-day="cell.iso"
                                            :data-outside="cell.inMonth ? null : ''"
                                            :aria-label="cell.label"
                                            :aria-selected="cell.selected ? 'true' : 'false'"
                                            :aria-current="cell.today ? 'date' : null"
                                            :tabindex="cell.selected ? 0 : -1"
                                            @click="select(cell.iso, true)"><span x-text="cell.day"></span></td>
                                    </template>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    </template>
</div>
