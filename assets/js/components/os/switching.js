// assets/js/components/os/switching.js
// Task View and the Alt+Q switcher, the same as v2's TaskView.tsx and
// WindowSwitcher.tsx. The order, the selection maths and the keys come from
// assets/js/windowing/switcher.js. Both sit inside the shell's scope, so they
// read appIcon and close Start, Quick Settings and Widgets through it.

document.addEventListener('alpine:init', () => {
    const store = () => Alpine.store('os');

    // Task View. It is open while the store's taskSwitcherOpen is set, which the
    // taskbar's Task View button and the phones' Open apps button both toggle.
    Alpine.data('taskView', () => ({
        opener: null,

        get cards() { return OsWindowing.recentWindows(store().windows); },

        dialog() { return document.querySelector('[data-task-view]'); },

        // As it appears: remember where focus was, close the shell's panels and
        // put focus on the most recent window's card.
        opened() {
            this.opener = document.activeElement;
            this.startMenuOpen = false;
            this.startMenuView = 'pinned';
            this.quickSettingsOpen = false;
            this.widgetsOpen = false;
            this.$nextTick(() => {
                const dialog = this.dialog();
                (dialog?.querySelector('.os-task-view-open') ?? dialog)?.focus();
            });
        },

        close() { store().taskSwitcherOpen = false; },

        // Esc, Done, the shortcut or the space around the cards: focus goes back.
        cancel() {
            this.close();
            OsWindowing.restoreFocus(this.opener);
        },

        choose(id) {
            this.close();
            if (OsWindowing.activateWindow(store(), id)) OsWindowing.focusWindowElement(id);
        },

        // Focus moves to the next card first, so it never falls to a window behind.
        closeCard(id) {
            const next = OsWindowing.neighbourAfterClose(this.cards, id);
            const dialog = this.dialog();
            const target = next === null ? dialog : dialog?.querySelector(`[data-task-card="${next}"] .os-task-view-open`);
            target?.focus();
            store().closeWindow(id);
        },

        // Keys inside Task View stay there, so the window behind never sees them.
        // Combinations such as Alt+Q go on to the shell.
        onKey(e) {
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            e.stopPropagation();
            if (e.key === 'Escape') {
                e.preventDefault();
                this.cancel();
                return;
            }
            const dialog = this.dialog();
            if (!dialog || OsWindowing.keepFocusInside(e, dialog)) return;
            const cards = [...dialog.querySelectorAll('.os-task-view-card')];
            const index = cards.findIndex(card => card.contains(document.activeElement));
            if (e.key === 'Delete') {
                if (index === -1) return;
                e.preventDefault();
                this.closeCard(Number(cards[index].dataset.taskCard));
                return;
            }
            const next = OsWindowing.gridIndex(index, e.key, cards.length, OsWindowing.gridColumns(cards.map(card => card.offsetTop)));
            if (next === null) return;
            e.preventDefault();
            cards[next].querySelector('.os-task-view-open').focus();
        },

        // Alt+Shift+T, or Win+Tab where the system lets it through.
        onShortcut(e) {
            if (OsWindowing.switcherKeyFromEvent(e) !== 'taskView') return;
            e.preventDefault();
            if (e.repeat) return;
            if (store().taskSwitcherOpen) this.cancel();
            else store().taskSwitcherOpen = true;
        },

        // A press anywhere else, such as on the taskbar, closes it, as in Windows.
        onPointerDown(e) {
            if (!store().taskSwitcherOpen || e.target.closest?.('[data-task-view], [data-task-view-toggle]')) return;
            this.close();
        }
    }));

    // Alt+Q: hold Alt and press Q to step through the windows, Shift+Q to step
    // back, and let go of Alt to switch. Esc cancels.
    Alpine.data('windowSwitcher', () => ({
        switching: false,
        selectedIndex: -1,

        get switchCards() { return OsWindowing.recentWindows(store().windows); },
        // A window can close while the strip is up, which shortens the list.
        get shownIndex() { return Math.min(this.selectedIndex, this.switchCards.length - 1); },
        get selectedTitle() { return this.switching ? this.switchCards[this.shownIndex]?.title ?? '' : ''; },

        onKeyDown(e) {
            if (this.switching && e.key === 'Escape') {
                e.preventDefault();
                this.switching = false;
                return;
            }
            const key = OsWindowing.switcherKeyFromEvent(e);
            if (key !== 'next' && key !== 'previous') return;
            e.preventDefault();
            const cards = this.switchCards;
            if (this.switching) {
                this.selectedIndex = OsWindowing.stepIndex(this.selectedIndex, cards.length, key === 'next' ? 1 : -1);
                return;
            }
            if (cards.length === 0) return;
            store().taskSwitcherOpen = false;
            this.selectedIndex = OsWindowing.switcherStart(cards, store().focusedWindowId, key === 'previous');
            this.switching = true;
        },

        onKeyUp(e) {
            if (!this.switching || !OsWindowing.isSwitchRelease(e)) return;
            e.preventDefault();
            const win = this.switchCards[this.shownIndex];
            this.switching = false;
            if (win) this.switchTo(win.id);
        },

        switchTo(id) {
            this.switching = false;
            this.startMenuOpen = false;
            this.startMenuView = 'pinned';
            this.quickSettingsOpen = false;
            this.widgetsOpen = false;
            store().taskSwitcherOpen = false;
            if (OsWindowing.activateWindow(store(), id)) OsWindowing.focusWindowElement(id);
        },

        // The system took Alt+Tab, or the page lost focus: the key-up never comes.
        cancelSwitch() { this.switching = false; }
    }));
});
