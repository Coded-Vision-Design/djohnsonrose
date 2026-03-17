// assets/js/components/apps/media.js
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

        init() {
            this.updateFromStore();
            this.$watch('$store.os.windows', () => this.updateFromStore(), { deep: true });

            this.$nextTick(() => {
                const player = this.$refs.videoPlayer;
                if (player) {
                    player.load(); // Ensure video is loaded
                    player.onloadedmetadata = () => {
                        this.duration = player.duration;
                    };
                }
            });
        },

        updateFromStore() {
            const win = Alpine.store('os').windows.find(w => w.app === 'video' && (w.focused || !this.videoUrl));
            if (win) {
                this.videoUrl = win.videoUrl;
                this.videoName = win.title;
            }
        },

        togglePlay() {
            const player = this.$refs.videoPlayer;
            if (player.paused) {
                player.play();
                this.playing = true;
            } else {
                player.pause();
                this.playing = false;
            }
        },

        updateProgress() {
            const player = this.$refs.videoPlayer;
            this.currentTime = player.currentTime;
            this.progress = (this.currentTime / this.duration) * 100;
        },

        seek(e) {
            const player = this.$refs.videoPlayer;
            const rect = e.target.closest('.relative.h-1').getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            player.currentTime = pos * this.duration;
        },

        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        init() {
            // Force immediate check
            this.updateFromStore();
            
            // Watch for focus changes or property updates on windows
            this.$watch('$store.os.windows', () => {
                this.updateFromStore();
            }, { deep: true });
        },
        updateFromStore() {
            // Find the active pdfreader window
            const win = Alpine.store('os').windows.find(w => w.app === 'pdfreader' && (w.focused || !this.pdfUrl));
            if (win) {
                // Priority: window data > fallback
                this.pdfUrl = win.pdfUrl || (window.portfolioConfig.basePath + 'data/cv.pdf');
                this.fileName = win.title;
            } else if (!this.pdfUrl) {
                // Hard fallback for initialization
                this.pdfUrl = window.portfolioConfig.basePath + 'data/cv.pdf';
                this.fileName = 'CV - DeVanté Johnson-Rose.pdf';
            }
        }
    }));
});
