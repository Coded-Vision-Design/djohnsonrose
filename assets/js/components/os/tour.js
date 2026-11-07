// assets/js/components/os/tour.js
// The guided tour's toast, drawn by partials/tour.php as v2's shell/Tour.tsx draws
// it. What it says, where it goes and when it moves on are in
// assets/js/windowing/tour.js, shared with v2.

document.addEventListener('alpine:init', () => {
    // Storage can be blocked, which throws. The tour is then never offered.
    const storage = (() => {
        try {
            return window.localStorage;
        } catch {
            return null;
        }
    })();
    const tour = OsWindowing.createTour({ storage });

    Alpine.store('tour', {
        state: tour.getState(),
        // Set when the visitor starts the tour, so that its first button takes focus.
        focusNext: false,

        // From Start and from the offer: the desktop is cleared, as the tour points at it.
        begin() {
            const os = Alpine.store('os');
            os.minimizeAll();
            this.focusNext = true;
            tour.start(OsWindowing.tourSteps(os.windowMode));
        },
        next() { tour.next(); },
        skip() { tour.skip(); },
        hold(reason, held) { tour.hold(reason, held); },
        block(blocked) { tour.block(blocked); },
        signedIn() { tour.signedIn(); },
        reset() { tour.reset(); }
    });
    tour.subscribe((state) => { Alpine.store('tour').state = state; });

    // Stops keeping the toast in place. Kept out of Alpine's reactive data.
    let stopFollowing = () => {};

    Alpine.data('tourToast', () => ({
        get state() { return Alpine.store('tour').state; },
        get offering() { return this.state.status === 'offer'; },
        get title() { return this.offering ? OsWindowing.TOUR_OFFER.title : this.state.step?.title ?? ''; },
        get text() { return this.offering ? OsWindowing.TOUR_OFFER.text : this.state.step?.text ?? ''; },
        // Start, Quick Settings and Widgets cover the toast, and the tour waits behind them.
        get covered() { return this.startMenuOpen || this.quickSettingsOpen || this.widgetsOpen; },
        offer: OsWindowing.TOUR_OFFER,

        init() {
            // A sign-in in this page offers the tour, and signing out ends it.
            this.$watch('loggedIn', (signedIn) => {
                if (signedIn) Alpine.store('tour').signedIn();
                else Alpine.store('tour').reset();
            });
            // Alpine runs a watcher after the page has updated, so the toast can be measured.
            this.$watch('$store.tour.state', () => this.shown());
            this.$watch('$store.os.windowMode', () => this.follow());
            this.$watch('covered', (covered) => Alpine.store('tour').hold('popup', covered));
        },

        // The cookie question is asked first, and the offer waits for it.
        watchConsent() {
            Alpine.store('tour').block(!!Alpine.store('os').showCookieNotification);
        },

        shown() {
            const store = Alpine.store('tour');
            this.follow();
            if (store.focusNext && this.state.status === 'running') {
                store.focusNext = false;
                this.$refs.toast.querySelector('[data-tour-next]')?.focus({ preventScroll: true });
            }
            if (this.covered) store.hold('popup', true);
        },

        // Keeps the toast and ring by what the step points at, until the next change.
        follow() {
            stopFollowing();
            stopFollowing = () => {};
            if (this.state.status === 'idle') {
                this.$refs.ring.hidden = true;
                return;
            }
            stopFollowing = OsWindowing.followTour(this.$refs.toast, this.$refs.ring, this.state.step, Alpine.store('os').windowMode);
        },

        // A button press that may end the tour hands focus to Start if it was in the toast.
        act(action) {
            const inside = this.$refs.toast.contains(document.activeElement);
            action();
            if (inside && this.state.status === 'idle') {
                document.querySelector('[data-start-button]')?.focus({ preventScroll: true });
            }
        },

        // Esc closes Start, Quick Settings, Widgets or a menu first, then skips the tour.
        onEscape() {
            if (this.state.status !== 'running') return;
            if (this.startMenuOpen || this.quickSettingsOpen || this.widgetsOpen || this.contextMenu.open) return;
            this.act(() => Alpine.store('tour').skip());
        },

        hover(e, held) {
            if (e.pointerType === 'mouse') Alpine.store('tour').hold('hover', held);
        },

        // Only keyboard focus holds the tour, so that a click does not stop it moving on.
        focusIn(e) {
            if (e.target.matches(':focus-visible')) Alpine.store('tour').hold('focus', true);
        },

        focusOut(e) {
            if (!this.$refs.toast.contains(e.relatedTarget)) Alpine.store('tour').hold('focus', false);
        }
    }));
});
