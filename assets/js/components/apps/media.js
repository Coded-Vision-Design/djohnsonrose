// assets/js/components/apps/media.js
// The player's clock and seek bar, and the PDF check, are shared with v2 in
// assets/js/windowing/media.js.
document.addEventListener('alpine:init', () => {
    // Video App Logic
    Alpine.data('videoApp', () => ({
        playing: false,
        currentTime: 0,
        duration: 0,
        progress: 0,
        volume: 1,
        videoUrl: '',
        videoName: '',
        seeking: false,

        init() {
            this.updateFromStore();
            this.$watch('$store.os.windows', () => this.updateFromStore(), { deep: true });
        },

        updateFromStore() {
            const win = Alpine.store('os').windows.find(w => w.app === 'video');
            const url = win?.videoUrl || OsWindowing.DEFAULT_VIDEO;
            const src = /^(https?:)?\//.test(url) ? url : window.portfolioConfig.basePath + url;
            if (src !== this.videoUrl) this.videoUrl = src;
            this.videoName = win?.title || OsWindowing.mediaName(url);
        },

        togglePlay() {
            const player = this.$refs.videoPlayer;
            if (player.paused) player.play().catch(() => { this.playing = false; });
            else player.pause();
        },

        updateProgress() {
            const player = this.$refs.videoPlayer;
            this.currentTime = player.currentTime;
            this.progress = OsWindowing.progressPercent(player.currentTime, player.duration);
        },

        seek(e) {
            const player = this.$refs.videoPlayer;
            player.currentTime = OsWindowing.seekTime(e.clientX, e.currentTarget.getBoundingClientRect(), player.duration);
            this.updateProgress();
        },

        startSeek(e) {
            this.seeking = true;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            this.seek(e);
        },

        moveSeek(e) {
            if (this.seeking) this.seek(e);
        },

        endSeek() {
            this.seeking = false;
        },

        skip(seconds) {
            const player = this.$refs.videoPlayer;
            if (!Number.isFinite(player.duration)) return;
            player.currentTime = Math.min(player.duration, Math.max(0, player.currentTime + seconds));
            this.updateProgress();
        },

        formatTime(seconds) {
            return OsWindowing.formatMediaTime(seconds);
        },

        toggleFullscreen() {
            const player = this.$refs.videoPlayer;
            if (player.requestFullscreen) {
                player.requestFullscreen();
            }
        }
    }));

    // PDF Reader App Logic
    Alpine.data('pdfReaderApp', () => ({
        pdfUrl: '',
        fileName: '',
        // Phones often cannot show a PDF in a frame, so they get an open and download prompt.
        canShowPdf: OsWindowing.canShowPdf(navigator),

        init() {
            this.updateFromStore();
            this.$watch('$store.os.windows', () => this.updateFromStore(), { deep: true });
        },

        get openLabel() {
            return OsWindowing.pdfOpenLabel(this.pdfUrl);
        },

        updateFromStore() {
            const win = Alpine.store('os').windows.find(w => w.app === 'pdfreader');
            const url = win?.pdfUrl || OsWindowing.DEFAULT_PDF;
            this.pdfUrl = /^(https?:)?\//.test(url) ? url : window.portfolioConfig.basePath + url;
            this.fileName = win?.title || 'CV - DeVanté Johnson-Rose.pdf';
        }
    }));
});
