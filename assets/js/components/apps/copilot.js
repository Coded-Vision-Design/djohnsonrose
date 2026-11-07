// Copilot: questions about DeVanté answered from the site's own data, and a
// job description matched against his CV. The same as
// v2/src/apps/copilot/Copilot.tsx; what the two share is in
// assets/js/windowing/copilot.js, and the server is api/copilot.php.
document.addEventListener('alpine:init', () => {
    Alpine.data('copilotApp', () => ({
        status: 'checking', // checking | on | off | unknown
        tab: 'chat',
        messages: [],
        nextId: 1,
        question: '',
        asking: false,
        job: '',
        matching: false,
        matchError: '',
        match: null,
        cvHtml: '',
        notice: '',
        stopFrame: null,
        suggestions: OsWindowing.SUGGESTED_QUESTIONS,
        questionMax: OsWindowing.QUESTION_MAX,
        jobMax: OsWindowing.JOB_MAX,

        // Alpine calls this once by itself; the partial must not call it again.
        async init() {
            const status = await OsWindowing.copilotStatus({ basePath: this.basePath });
            // A question may already have found it switched off.
            if (this.status === 'checking') this.status = status;
        },

        destroy() {
            this.stopFrame?.();
        },

        get basePath() {
            return window.portfolioConfig.basePath;
        },

        get asked() {
            return this.messages.some((m) => m.role === 'user');
        },

        say(role, text, extra = {}) {
            this.messages.push({ id: this.nextId++, role, text, ...extra });
            this.$nextTick(() => {
                const log = this.$refs.log;
                if (log) log.scrollTop = log.scrollHeight;
            });
        },

        async ask(text = this.question) {
            if (this.asking || OsWindowing.questionProblem(text)) return;
            const body = OsWindowing.chatBody(text, this.messages);
            this.say('user', body.question);
            this.question = '';
            this.notice = '';
            this.asking = true;
            try {
                const reply = await OsWindowing.askCopilot(body, { basePath: this.basePath });
                this.say('assistant', reply.answer, { citations: reply.citations, covered: reply.covered, grounded: reply.grounded });
            } catch (error) {
                if (error.code === 'off') this.status = 'off';
                this.say('error', error.message);
            } finally {
                this.asking = false;
            }
        },

        async runMatch() {
            if (this.matching) return;
            this.matchError = OsWindowing.jobProblem(this.job);
            if (this.matchError) return;
            this.matching = true;
            this.notice = '';
            try {
                const reply = await OsWindowing.askCopilot(OsWindowing.matchBody(this.job), { basePath: this.basePath });
                this.match = reply;
                this.cvHtml = OsWindowing.tailoredCvHtml(reply.cv);
                // Screen readers and the eye both land on the results.
                this.$nextTick(() => this.$refs.results?.focus());
            } catch (error) {
                if (error.code === 'off') this.status = 'off';
                this.matchError = error.message;
            } finally {
                this.matching = false;
            }
        },

        watchFrame(frame) {
            this.stopFrame?.();
            this.stopFrame = OsWindowing.watchCvFrame(frame);
        },

        printCv() {
            if (!OsWindowing.printTailoredCv(this.$refs.cvFrame)) this.notice = 'The tailored CV is not ready to print yet.';
        },

        downloadCv() {
            if (this.match) this.notice = `Saved ${OsWindowing.saveTailoredCv(this.match.cv)}.`;
        },

        // A file opens through the shell's own openFile, as it does from the desktop.
        openCitation(citation) {
            const os = Alpine.store('os');
            const opened = OsWindowing.openCitation(citation, {
                fileSystem: os.fileSystem,
                openEntry: (entry, path) => this.openFile(entry, path),
                openApp: (app) => os.openApp(app),
                openUrl: (href) => window.open(href, '_blank', 'noopener'),
                basePath: this.basePath,
            });
            this.notice = opened ? '' : OsWindowing.MISSING_SOURCE;
        },

        tabKey(event) {
            const next = OsWindowing.tabAfterKey(this.tab, event.key);
            if (!next) return;
            event.preventDefault();
            event.stopPropagation();
            this.tab = next;
            this.$nextTick(() => this.$root.querySelector(`[data-copilot-tab="${next}"]`)?.focus());
        },
    }));
});
