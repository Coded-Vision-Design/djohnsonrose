document.addEventListener('alpine:init', () => {
    // `shared` holds the projects, profile and portfolio from data/, written into the partial.
    Alpine.data('terminalApp', (shared = {}) => ({
        shared,
        input: '',
        history: [],
        cmdHistory: [],
        historyIdx: -1,
        currentPath: OsWindowing.TERMINAL_HOME,
        // Where Tab completion is up to, so the next Tab moves to the next match.
        completion: null,
        
        init() {
            this.$nextTick(() => {
                const el = this.$refs.terminalInput;
                if (el) el.focus();
            });
        },

        handleKey(e) {
            const tab = OsWindowing.completionKey(e, this.input);
            if (tab) {
                e.preventDefault();
                const next = OsWindowing.completeTerminalLine(this.input, {
                    cwd: this.currentPath,
                    fileSystem: Alpine.store('os').fileSystem,
                    apps: Object.keys(window.portfolioConfig.apps),
                }, this.completion, tab === 'back');
                this.completion = next.session;
                this.input = next.line;
            } else if (e.key === 'Escape' && this.input) {
                // As in PowerShell, Esc clears the line.
                this.input = '';
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.cmdHistory.length > 0) {
                    this.historyIdx = Math.min(this.historyIdx + 1, this.cmdHistory.length - 1);
                    this.input = this.cmdHistory[this.cmdHistory.length - 1 - this.historyIdx];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIdx > 0) {
                    this.historyIdx--;
                    this.input = this.cmdHistory[this.cmdHistory.length - 1 - this.historyIdx];
                } else {
                    this.historyIdx = -1;
                    this.input = '';
                }
            }
        },

        async handlePaste(e) {
            // Standard paste handles itself, but we can intercept for custom logic if needed
        },

        handleContextMenu(e) {
            e.preventDefault();
            navigator.clipboard.readText().then(text => {
                this.input += text;
            });
        },

        execute() {
            const rawCmd = this.input;
            const cmd = this.input.trim();
            this.historyIdx = -1;
            
            if (!cmd) {
                this.history.push({ cmd: '', path: this.currentPath, res: '' });
                this.input = '';
                return;
            }

            this.cmdHistory.push(cmd);
            if (this.cmdHistory.length > 50) this.cmdHistory.shift();
            
            // Send telemetry for terminal command
            Alpine.store('os').sendTelemetry('Terminal Command', { command: cmd, path: this.currentPath });

            // The commands are shared with v2, in assets/js/windowing/terminal.js.
            const os = Alpine.store('os');
            const result = OsWindowing.runTerminalCommand(cmd, {
                cwd: this.currentPath,
                fileSystem: os.fileSystem,
                projects: this.shared.projects ?? [],
                email: os.settings.email,
                build: 'v1',
                profile: this.shared.profile,
                portfolio: this.shared.portfolio,
            });
            if (result.clear) {
                this.history = [];
                this.input = '';
                return;
            }
            if (result.exit) {
                if (this.win) os.closeWindow(this.win.id);
                return;
            }
            if (result.open) os.openApp(result.open);
            const res = result.res ?? '';
            const path = this.currentPath;
            if (result.cwd) this.currentPath = result.cwd;

            this.history.push({ cmd: rawCmd, path, res });
            this.input = '';
            
            this.$nextTick(() => {
                const output = this.$refs.terminalOutput;
                if (output) output.scrollTop = output.scrollHeight;
            });
        }
    }));
});
