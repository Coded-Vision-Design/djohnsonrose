// assets/js/components/os/calendar.js
// The clock's flyout (partials/calendar-flyout.php), the same as v2's
// CalendarFlyout.tsx. The dates and keys are worked out in calendar.js, shared
// with v2. calendarOpen lives in the shell, beside Start, Quick Settings and Widgets.
document.addEventListener('alpine:init', () => {
    Alpine.data('calendarFlyout', () => ({
        days: OsWindowing.CALENDAR_DAYS,
        // The day the grid's one tab stop is on. Its month is the month shown.
        selected: OsWindowing.todayIso(),

        init() {
            // Each opening starts on today, with focus on it.
            this.$watch('calendarOpen', (open) => {
                if (!open) return;
                this.selected = this.today;
                this.$nextTick(() => this.focusSelected());
            });
            // One panel at a time: Start, Quick Settings and Widgets close it as they open.
            this.$watch('startMenuOpen || quickSettingsOpen || widgetsOpen', (other) => {
                if (other) this.calendarOpen = false;
            });
        },

        // Reading the clock moves the flyout on to the new day at midnight.
        get today() { return this.clock.date && OsWindowing.todayIso(); },
        get todayLabel() { return OsWindowing.longDate(this.today); },
        get grid() { return OsWindowing.monthGrid(this.selected, this.today); },
        get notes() { return Alpine.store('os').notifications; },
        noteTime(note) { return OsWindowing.notificationTime(note.time); },

        select(iso, focus = false) {
            this.selected = iso;
            if (focus) this.$nextTick(() => this.focusSelected());
        },
        step(months) { this.selected = OsWindowing.shiftMonth(this.selected, months); },
        goToday() { this.selected = this.today; },

        onGridKey(e) {
            const target = OsWindowing.calendarKeyTarget(this.selected, e);
            if (!target) return;
            e.preventDefault();
            this.select(target, true);
        },

        // x-show reveals the flyout a frame after it opens, so focus waits for it.
        focusSelected(frames = 3) {
            if (!this.$root.getClientRects().length && frames > 0) {
                requestAnimationFrame(() => this.focusSelected(frames - 1));
                return;
            }
            this.$root.querySelector('[data-calendar-day][tabindex="0"]')?.focus({ preventScroll: true });
        },

        // The clock toggles the flyout itself, so a click on it is not a click away.
        clickAway(e) {
            if (!e.target.closest('[data-tray-item="clock"]')) this.calendarOpen = false;
        },

        // Esc closes it and gives focus back to the clock.
        dismiss() {
            if (!this.calendarOpen) return;
            this.calendarOpen = false;
            document.querySelector('[data-tray-item="clock"]')?.focus();
        }
    }));
});
