import { create } from 'zustand'
import {
  activityFromResponse,
  activityNeedsLoading,
  stepTestimonial,
  testimonialsFromResponse,
  type ActivityStatus,
  type RecentChange,
  type Testimonial,
} from '../../../assets/js/windowing/widgets.js'

// Recent changes to this site and Testimonials in Widgets.tsx. What they show
// is worked out in assets/js/windowing/widgets.js, shared with v1's
// assets/js/components/widgets.js, and they load the same way there: when
// Widgets opens, the recent changes until they have loaded, and the
// testimonials once. Kept outside the panel, which unmounts when it closes.

interface WidgetFeeds {
  activity: RecentChange[]
  activityStatus: ActivityStatus
  testimonials: Testimonial[]
  testimonialsAsked: boolean
  testimonialIndex: number
  /** When Widgets last opened, so "2 hours ago" is right each time it opens. */
  now: number
  refresh: () => void
  stepTestimonial: (by: number) => void
}

export const useWidgetFeeds = create<WidgetFeeds>()((set, get) => ({
  activity: [],
  activityStatus: 'idle',
  testimonials: [],
  testimonialsAsked: false,
  testimonialIndex: 0,
  now: Date.now(),

  refresh: () => {
    set({ now: Date.now() })
    if (activityNeedsLoading(get().activityStatus)) {
      set({ activityStatus: 'loading' })
      fetch('/api/activity.php')
        .then(activityFromResponse)
        .then(
          (activity) => set({ activity, activityStatus: 'ready' }),
          () => set({ activityStatus: 'error' }),
        )
    }
    if (!get().testimonialsAsked) {
      set({ testimonialsAsked: true })
      fetch('/api/testimonials.php')
        .then(testimonialsFromResponse)
        // None shown, which hides the widget.
        .catch((): Testimonial[] => [])
        .then((testimonials) => set({ testimonials, testimonialIndex: 0 }))
    }
  },

  stepTestimonial: (by) =>
    set((s) => ({ testimonialIndex: stepTestimonial(s.testimonialIndex, by, s.testimonials.length) })),
}))
