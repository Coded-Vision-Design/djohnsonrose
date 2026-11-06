document.addEventListener('alpine:init', () => {
    // `projects` comes from data/portfolio.json, written into the partial.
    Alpine.data('terminalApp', (projects = []) => ({
        projects,
        input: '',
        history: [],
        cmdHistory: [],
        historyIdx: -1,
        currentPath: OsWindowing.TERMINAL_HOME,
        
        init() {
            this.$nextTick(() => {
                const el = this.$refs.terminalInput;
                if (el) el.focus();
            });
        },

        handleKey(e) {
            if (e.key === 'ArrowUp') {
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
                projects: this.projects,
                email: os.settings.email,
                build: 'v1',
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
