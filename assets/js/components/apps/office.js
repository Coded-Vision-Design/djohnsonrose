// assets/js/components/apps/office.js
// Word, Excel, PowerPoint and PuTTY. What they show and do lives in
// assets/js/windowing/office.js, which v2 shares, so these only keep Alpine's
// state and plug it in. Outlook is further down.
document.addEventListener('alpine:init', () => {
    const O = window.OfficeApps;
    const imgPath = window.portfolioConfig.imgPath;
    const dataUrl = (file) => window.portfolioConfig.basePath + 'data/' + file;
    const windowOf = (app) => Alpine.store('os').windows.find((w) => w.app === app);

    Alpine.data('wordApp', () => {
        // Kept outside Alpine's reactivity: the editor's ribbon link and the fit watcher.
        let editor = null;
        let stopFit = () => {};

        return {
            O,
            imgPath,
            ICONS: O.OFFICE_ICONS,
            TABS: O.WORD_TABS,
            FONTS: O.WORD_FONTS,
            SIZES: O.WORD_SIZES,
            words: 0,
            fit: 1,
            userZoom: null,
            fontName: 'Calibri',
            fontSize: '3',
            format: { bold: false, italic: false, underline: false, align: 'left' },

            get zoom() {
                return this.userZoom ?? this.fit;
            },

            init() {
                // Refs exist once the children have initialised.
                this.$nextTick(() => {
                    editor = O.wordEditor(this.$refs.editor, { onFormat: (format) => (this.format = format) });
                    stopFit = O.watchFit(this.$refs.area, { width: O.WORD_PAGE_WIDTH }, (scale) => (this.fit = scale));
                    this.recount();
                });
            },

            destroy() {
                editor?.stop();
                stopFit();
            },

            recount() {
                this.words = O.countWords(O.documentText(this.$refs.editor));
            },

            run(command, value) {
                return editor?.run(command, value);
            },

            zoomBy(direction) {
                this.userZoom = O.stepPageZoom(this.zoom, direction);
            },

            print() {
                O.printDocument({ title: 'CV - DeVanté Johnson-Rose', html: this.$refs.editor.innerHTML, styles: O.pageStyles() });
            },
        };
    });

    Alpine.data('excelApp', () => ({
        O,
        imgPath,
        TABS: O.EXCEL_TABS,
        sheet: O.portfolioSheet(null),
        active: 'A1',
        state: 'loading',

        async init() {
            try {
                this.sheet = O.portfolioSheet(await O.loadChecked(dataUrl('portfolio.json')));
                this.state = 'ready';
            } catch {
                this.state = 'error';
            }
        },
    }));

    // A case study for each project, built from data/portfolio.json and the
    // project's own folder in the shared file system.
    Alpine.data('powerpointApp', () => {
        // Kept outside Alpine's reactivity: what stops the fit and swipe watchers.
        let stops = [];
        let keys = null;
        let host = null;

        return {
            O,
            imgPath,
            ICONS: O.OFFICE_ICONS,
            TABS: O.POWERPOINT_TABS,
            decks: [],
            deckAt: 0,
            active: 0,
            fit: 1,
            showFit: 1,
            presenting: false,
            state: 'loading',

            get deck() {
                return this.decks[this.deckAt] ?? null;
            },

            get slides() {
                return this.deck?.slides ?? [];
            },

            get slide() {
                return this.slides[this.active] ?? null;
            },

            async init() {
                this.$nextTick(() => {
                    // A finger swiped across the slide, in the window or in the show.
                    const step = (by) => this.step(by);
                    stops = [
                        O.watchFit(this.$refs.stage, O.SLIDE_SIZE, (scale) => (this.fit = scale)),
                        O.watchFit(this.$refs.showStage, O.SLIDE_SIZE, (scale) => (this.showFit = scale), { max: O.SHOW_MAX_ZOOM }),
                        O.watchSwipe(this.$refs.stage, step),
                        O.watchSwipe(this.$refs.show, step),
                    ];
                });
                // Only while PowerPoint's own window has focus: the keys go to its window.
                host = this.$root.closest('.os-window');
                keys = (event) => this.onKey(event);
                host?.addEventListener('keydown', keys);
                // A case study file opened while PowerPoint is already open.
                this.$watch('win.deckRevision', () => this.openDeck(this.win?.deck));
                try {
                    const portfolio = await O.loadChecked(dataUrl('portfolio.json'));
                    this.decks = O.caseStudyDecks(portfolio, window.portfolioConfig.fileSystem, window.portfolioConfig.basePath);
                    this.openDeck(this.win?.deck);
                    this.state = 'ready';
                } catch {
                    this.state = 'error';
                }
            },

            destroy() {
                stops.forEach((stop) => stop());
                host?.removeEventListener('keydown', keys);
            },

            openDeck(key) {
                this.deckAt = O.deckIndex(this.decks, key);
                this.active = 0;
            },

            pick(index) {
                this.deckAt = index;
                this.active = 0;
            },

            step(by) {
                this.active = O.stepSlide(this.active, by, this.slides.length);
            },

            // The show sits inside the window, so it has the keys to itself while it runs.
            onKey(event) {
                if (this.presenting) {
                    event.stopPropagation();
                    const next = O.showKey(event, this.active, this.slides.length);
                    if (next === null) return;
                    event.preventDefault();
                    if (next === 'end') this.endShow();
                    else this.active = next;
                    return;
                }
                const next = O.slideForKey(event, this.active, this.slides.length);
                if (next === null) return;
                event.preventDefault();
                this.active = next;
            },

            // The show is a modal <dialog>, so it covers the whole screen, above
            // the taskbar, and keeps focus inside it until it ends.
            present() {
                const show = this.$refs.show;
                if (!show || !this.slide) return;
                if (!show.open) show.showModal();
                show.focus();
                this.presenting = true;
            },

            endShow() {
                const show = this.$refs.show;
                if (show?.open) show.close();
                this.presenting = false;
                this.$refs.present?.focus({ preventScroll: true });
            },
        };
    });

    Alpine.data('puttyApp', () => ({
        O,
        imgPath,
        SESSIONS: O.PUTTY_SESSIONS,
        CATEGORIES: O.PUTTY_CATEGORIES,
        TYPES: O.PUTTY_CONNECTION_TYPES,
        host: '',
        port: 22,
        connection: 'SSH',
        selected: 'Default Settings',
        session: null,
        lines: [],
        command: '',

        pick(saved) {
            if (!saved) return;
            this.selected = saved.name;
            this.host = saved.host;
        },

        open() {
            const host = this.host.trim();
            if (!host) return;
            this.session = { host, port: this.port };
            this.lines = O.puttyBanner({ host, port: this.port });
            this.command = '';
            this.$nextTick(() => this.$refs.command?.focus());
        },

        submit() {
            const reply = O.puttyReply(this.command, { host: this.session.host });
            const echoed = [...this.lines, `${O.puttyPrompt(this.session.host)} ${this.command}`];
            this.lines = reply.clear ? [] : [...echoed, ...reply.lines];
            this.command = '';
            if (reply.exit) {
                this.session = null;
                return;
            }
            this.$nextTick(() => {
                const terminal = this.$refs.terminal;
                if (terminal) terminal.scrollTop = terminal.scrollHeight;
            });
        },

        cancel() {
            const win = windowOf('putty');
            if (win) Alpine.store('os').closeWindow(win.id);
        },
    }));

    // Outlook App Logic
    Alpine.data('outlookApp', () => ({
        recipient: 'devante@johnson-rose.co.uk',
        replyTo: '',
        subject: 'Project Enquiry - Portfolio OS',
        body: 'Hi,\n\nI was browsing your portfolio and would like to get in touch regarding...',
        isSending: false,
        status: 'idle', // idle | sending | sent | error
        statusMsg: '',
        attachments: [],
        honeypot: '', // Honeypot field
        
        async send() {
            if (this.isSending) return;
            if (!this.replyTo.trim()) {
                this.setStatus('error', 'Please enter your email address so I can reply.');
                return;
            }
            if (!this.subject.trim() || !this.body.trim()) {
                this.setStatus('error', 'Subject and message are required.');
                return;
            }
            
            this.isSending = true;
            this.setStatus('sending', 'Sending…');

            try {
                const formData = new FormData();
                formData.append('reply_to', this.replyTo);
                formData.append('subject', this.subject);
                formData.append('body', this.body);
                formData.append('website_hp', this.honeypot);
                
                this.attachments.forEach((file, index) => {
                    formData.append(`attachment_${index}`, file);
                });

                const response = await fetch(window.portfolioConfig.basePath + 'api/send_email.php', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json().catch(() => ({}));

                if (result.success) {
                    Alpine.store('os').logEvent('Outlook', 'Information', `Email sent via no-reply to ${this.recipient}`);
                    this.setStatus('sent', result.message || 'Message sent.');
                    this.resetDraft();
                } else {
                    this.setStatus('error', result.error || 'Send failed. Please try again.');
                }
            } catch (e) {
                this.setStatus('error', 'Network error. Check your connection and try again.');
            } finally {
                this.isSending = false;
            }
        },

        setStatus(status, message) {
            this.status = status;
            this.statusMsg = message;
        },

        resetDraft() {
            this.subject = 'Project Enquiry - Portfolio OS';
            this.body = 'Hi,\n\nI was browsing your portfolio and would like to get in touch regarding...';
            this.attachments = [];
        },

        discard() {
            this.resetDraft();
            this.setStatus('idle', '');
        },

        sendViaPersonalMail() {
            const mailto = `mailto:${this.recipient}?subject=${encodeURIComponent(this.subject)}&body=${encodeURIComponent(this.body)}`;
            window.location.href = mailto;
            Alpine.store('os').logEvent('Outlook', 'Information', `External mail client opened for ${this.recipient}`);
        },

        triggerAttach() {
            this.$refs.fileInput.click();
        },

        handleFileSelect(e) {
            const files = Array.from(e.target.files);
            this.attachments.push(...files);
        },

        removeAttachment(index) {
            this.attachments.splice(index, 1);
        }
    }));
});
