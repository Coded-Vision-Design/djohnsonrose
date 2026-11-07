// Recent changes to this site and Testimonials in Widgets (partials/widgets.php).
// What they show is worked out in assets/js/windowing/widgets.js, shared with
// v2's Widgets.tsx, and they load the same way there: when Widgets opens, the
// recent changes until they have loaded, and the testimonials once.
document.addEventListener('alpine:init', () => {
    Alpine.data('widgetFeeds', () => ({
        activity: [],
        activityStatus: 'idle',
        testimonials: [],
        testimonialsAsked: false,
        testimonialIndex: 0,
        // When Widgets last opened, so "2 hours ago" is right each time it opens.
        now: Date.now(),

        init() {
            this.$watch('widgetsOpen', (open) => { if (open) this.refresh(); });
        },

        get testimonial() { return this.testimonials[this.testimonialIndex] ?? null; },

        refresh() {
            this.now = Date.now();
            const base = window.portfolioConfig.basePath;
            if (OsWindowing.activityNeedsLoading(this.activityStatus)) this.loadActivity(base);
            if (!this.testimonialsAsked) this.loadTestimonials(base);
        },

        async loadActivity(base) {
            this.activityStatus = 'loading';
            try {
                this.activity = await OsWindowing.activityFromResponse(await fetch(`${base}api/activity.php`));
                this.activityStatus = 'ready';
            } catch (e) {
                this.activityStatus = 'error';
            }
        },

        async loadTestimonials(base) {
            this.testimonialsAsked = true;
            try {
                this.testimonials = await OsWindowing.testimonialsFromResponse(await fetch(`${base}api/testimonials.php`));
            } catch (e) {
                // None shown, which hides the widget.
                this.testimonials = [];
            }
            this.testimonialIndex = 0;
        },

        stepTestimonial(by) {
            this.testimonialIndex = OsWindowing.stepTestimonial(this.testimonialIndex, by, this.testimonials.length);
        },
    }));
});
