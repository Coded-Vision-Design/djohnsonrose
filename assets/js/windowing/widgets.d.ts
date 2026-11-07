/** One recent change, as api/activity.php sends it. */
export interface RecentChange {
  /** The commit message's first line. */
  message: string
  /** The first seven characters of the commit's SHA. */
  sha: string
  /** When it landed, as ISO 8601 in UTC. */
  date: string
}

/** One testimonial, as data/testimonials.json holds it (see lib/testimonials.php). */
export interface Testimonial {
  quote: string
  name: string
  /** Their job title, or ''. */
  role: string
  /** Where they work, or ''. */
  company: string
  /** An https address for them, when there is one. */
  link?: string
}

export const ACTIVITY_SHOWN: number

export function timeAgo(date: string | null | undefined, now?: number): string
export function fullDate(date: string | null | undefined): string

/** Where loading the recent changes has got to. */
export type ActivityStatus = 'idle' | 'loading' | 'ready' | 'error'

export function activityNeedsLoading(status: ActivityStatus | null | undefined): boolean
export function activityFromApi(data: unknown): RecentChange[] | null
/** The commits in an api/activity.php reply. Always reads the body, and throws when there is nothing to show. */
export function activityFromResponse(res: Response): Promise<RecentChange[]>

export function testimonialsFromApi(data: unknown): Testimonial[]
/** The testimonials in an api/testimonials.php reply, or none for any failure. */
export function testimonialsFromResponse(res: Response): Promise<Testimonial[]>

export function stepTestimonial(index: number, by: number, count: number): number
export function testimonialByline(testimonial: Pick<Testimonial, 'role' | 'company'> | null | undefined): string
