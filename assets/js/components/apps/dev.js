// assets/js/components/apps/dev.js
document.addEventListener('alpine:init', () => {
    // VS Code App Logic
    Alpine.data('vscodeApp', () => ({
        activeFile: 'English Open BJJ',
        explorerOpen: true,
        activeTab: 'editor', // 'editor' or 'terminal'
        terminalOutput: [],
        isBuilding: false,
        
        init() {
            this.terminalOutput = [
                { type: 'info', text: 'Microsoft (R) Build Engine version 17.0.0' },
                { type: 'info', text: 'Copyright (C) Microsoft Corporation. All rights reserved.' },
                { type: 'command', text: 'PS C:\\Users\\DeVante> git status' },
                { type: 'info', text: 'On branch main' },
                { type: 'info', text: 'Your branch is up to date with \'origin/main\'.' },
                { type: 'info', text: 'nothing to commit, working tree clean' }
            ];
        },

        runBuild() {
            if (this.isBuilding) return;
            this.isBuilding = true;
            this.activeTab = 'terminal';
            
            const steps = [
                { type: 'command', text: `PS C:\\Users\\DeVante> npm run build --project "${this.activeFile}"` },
                { type: 'info', text: '> vite build' },
                { type: 'info', text: 'transforming...' },
                { type: 'info', text: '✓ 142 modules transformed.' },
                { type: 'info', text: 'rendering chunks...' },
                { type: 'success', text: 'dist/assets/index.js   42.12 kB │ gzip: 12.01 kB' },
                { type: 'success', text: 'dist/assets/index.css   18.45 kB │ gzip: 5.12 kB' },
                { type: 'success', text: '✓ built in 1.24s' }
            ];

            let i = 0;
            const interval = setInterval(() => {
                this.terminalOutput.push(steps[i]);
                i++;
                if (i >= steps.length) {
                    clearInterval(interval);
                    this.isBuilding = false;
                }
                // Scroll to bottom of terminal
                this.$nextTick(() => {
                    const term = document.querySelector('#vscode-terminal');
                    if (term) term.scrollTop = term.scrollHeight;
                });
            }, 300);
        },

        selectFile(name) {
            this.activeFile = name;
            this.runBuild();
        }
    }));

    // Database Explorer Logic
    Alpine.data('databaseApp', () => ({
        activeTable: 'projects',
        data: null,
        loading: true,
        results: null,
        error: null,
        
        async init() {
            try {
                const response = await fetch(window.portfolioConfig.basePath + 'data/portfolio.json');
                this.data = await response.json();
                this.loading = false;
            } catch (e) {
                console.error('Failed to load database:', e);
            }
        },

        async executeQuery() {
            const editor = document.querySelector('[contenteditable="true"]');
            if (!editor) return;
            
            this.loading = true;
            this.error = null;
            this.results = null;

            const query = editor.innerText;

            try {
                const response = await fetch(window.portfolioConfig.basePath + 'api/database_query.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query })
                });
                
                const result = await response.json();
                
                if (result.error) {
                    this.error = result.error;
                } else {
                    this.results = result;
                }
            } catch (e) {
                this.error = 'Failed to execute query';
            } finally {
                this.loading = false;
            }
        },

        get tableData() {
            if (this.results) return this.results.data;
            if (!this.data || !this.activeTable) return [];
            return this.data[this.activeTable] || [];
        },

        get columns() {
            if (this.results) return this.results.columns;
            if (!this.data || !this.data.schema) return [];
            return this.data.schema[this.activeTable] || [];
        }
    }));

    // Docker Desktop App – realistic containers (Node.js, Nextcloud, Postgres), start/stop, CLI output
    Alpine.data('dockerApp', () => {
        const makeContainers = () => [
            { id: 'a1b2c3d4e5f6', name: 'node-app', image: 'node:20-alpine', status: 'running', statusLabel: 'Up 2 hours', ports: '0.0.0.0:3000->3000/tcp', created: '2 days ago' },
            { id: 'b2c3d4e5f6a7', name: 'nextcloud', image: 'nextcloud:apache', status: 'running', statusLabel: 'Up 5 hours', ports: '0.0.0.0:8080->80/tcp', created: '1 week ago' },
            { id: 'c3d4e5f6a7b8', name: 'postgres-db', image: 'postgres:16-alpine', status: 'exited', statusLabel: 'Exited (0) 3 days ago', ports: '0.0.0.0:5432->5432/tcp', created: '2 weeks ago' },
        ];
        return {
            activeView: 'containers',
            searchQuery: '',
            selectedId: null,
            containerDetailTab: 'logs',
            containers: makeContainers(),
            lastCommand: '',
            cliOutput: [],

            get filteredContainers() {
                const q = (this.searchQuery || '').toLowerCase().trim();
                if (!q) return this.containers;
                return this.containers.filter(c =>
                    c.name.toLowerCase().includes(q) ||
                    c.image.toLowerCase().includes(q) ||
                    c.id.toLowerCase().includes(q)
                );
            },

            runDockerCommand(cmd, lines) {
                this.lastCommand = cmd;
                this.cliOutput = (lines || []).map(t => (typeof t === 'string' ? { text: t, type: 'out' } : t));
            },

            startContainer(c) {
                if (c.status === 'running') return;
                c.status = 'running';
                c.statusLabel = 'Up 2 seconds';
                this.runDockerCommand(`docker start ${c.id}`, [c.id]);
            },

            stopContainer(c) {
                if (c.status !== 'running') return;
                c.status = 'exited';
                c.statusLabel = 'Exited (0) just now';
                this.runDockerCommand(`docker stop ${c.id}`, [c.id]);
            },

            restartContainer(c) {
                if (c.status !== 'running') return;
                c.statusLabel = 'Restarting...';
                this.runDockerCommand(`docker restart ${c.id}`, [c.id]);
                setTimeout(() => {
                    c.statusLabel = 'Up 1 second';
                }, 600);
            },

            get selectedContainer() {
                return this.selectedId ? this.containers.find(c => c.id === this.selectedId) : null;
            },

            get containerLogs() {
                const c = this.selectedContainer;
                if (!c) return [];
                if (c.name === 'node-app') return ['Server listening on port 3000', 'GET / 200', 'GET /api/health 200'];
                if (c.name === 'nextcloud') return ['apache2 -D FOREGROUND', 'AH00558: apache2: Could not reliably determine...', '[Tue Feb 02 10:00:00.000000 2026] [mpm_prefork:notice]'];
                if (c.name === 'postgres-db') return ['database system is ready to accept connections', 'LOG:  checkpoint starting'];
                return ['(no logs)'];
            },

            get containerInspect() {
                const c = this.selectedContainer;
                if (!c) return '{}';
                return JSON.stringify({
                    Id: c.id,
                    Name: '/' + c.name,
                    State: { Status: c.status, Running: c.status === 'running' },
                    Config: { Image: c.image },
                    NetworkSettings: { Ports: c.ports || {} },
                }, null, 2);
            },
        };
    });
});
