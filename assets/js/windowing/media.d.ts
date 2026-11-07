export const DEFAULT_VIDEO: string
export const DEFAULT_PDF: string

export function formatMediaTime(seconds: number): string
export function seekTime(clientX: number, bar: { left: number; width: number }, duration: number): number
export function progressPercent(currentTime: number, duration: number): number
export function canShowPdf(nav: { pdfViewerEnabled?: boolean } | undefined): boolean
export function pdfOpenLabel(url: string): string
export function mediaName(url: string): string

export interface AlbumPicture {
  name: string
  type: string
  url?: string
}

export const DEFAULT_ALBUM: string
export function photoAlbum<T extends AlbumPicture>(
  fs: Record<string, T[]>,
  open?: { folderPath?: string; imageName?: string; imageUrl?: string },
): { path: string; images: (T | AlbumPicture)[]; index: number }
