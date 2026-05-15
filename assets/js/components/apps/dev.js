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

    // SSMS-styled SQL viewer over the CV (1:1 with v2/src/apps/database/).
    // The server endpoint (/api/cv_data.php) only ever returns whole tables;
    // every WHERE / ORDER BY / LIMIT is parsed and applied client-side by
    // window.PortfolioSQL (assets/js/components/apps/database-sql.js).
    Alpine.data('databaseApp', () => ({
        TABLES: [
            { id: 'experience',     label: 'dbo.Experience' },
            { id: 'projects',       label: 'dbo.Projects' },
            { id: 'certifications', label: 'dbo.Certifications' },
            { id: 'education',      label: 'dbo.Education' },
            { id: 'skills',         label: 'dbo.Skills' },
            { id: 'achievements',   label: 'dbo.Achievements' },
            { id: 'interests',      label: 'dbo.Interests' },
        ],
        COLUMNS_BY_TABLE: {
            experience:     ['id', 'role', 'company', 'period', 'location', 'highlights'],
            projects:       ['id', 'title', 'description', 'tags', 'url', 'location', 'country'],
            certifications: ['id', 'name', 'issuer', 'year'],
            education:      ['id', 'title', 'issuer'],
            skills:         ['id', 'category', 'name'],
            achievements:   ['id', 'title', 'result', 'category', 'date'],
            interests:      ['id', 'name'],
        },
        activeTable: 'experience',
        query: 'SELECT * FROM [Portfolio_DB].[dbo].[experience]',
        results: null,            // { rows, columns, elapsed }
        error: null,
        loading: false,
        helpOpen: false,
        resultsTab: 'results',
        EXAMPLES: window.PortfolioSQL ? window.PortfolioSQL.EXAMPLES : [],
        _cache: {},

        async init() {
            this.runQuery();
        },

        async _loadTable(table) {
            const hit = this._cache[table];
            if (hit && Date.now() - hit.loadedAt < 60000) return hit.rows;
            const r = await fetch(window.portfolioConfig.basePath + 'api/cv_data.php?table=' + encodeURIComponent(table));
            if (!r.ok) throw new Error('Failed to fetch table \'' + table + '\' (' + r.status + ')');
            const body = await r.json();
            if (body.error) throw new Error(body.error);
            this._cache[table] = { loadedAt: Date.now(), rows: body.data || [] };
            return body.data || [];
        },

        async runQuery(sql) {
            const text = (sql == null ? this.query : sql);
            this.loading = true; this.error = null;
            const started = performance.now();
            try {
                const ast = window.PortfolioSQL.parse(text);
                if (!this.TABLES.some((t) => t.id === ast.table)) {
                    throw new Error("Unknown table '" + ast.table + "'.");
                }
                const rows = await this._loadTable(ast.table);
                const out = window.PortfolioSQL.execute(ast, rows);
                const columns = ast.columns.indexOf('*') !== -1
                    ? this.COLUMNS_BY_TABLE[ast.table]
                    : ast.columns;
                this.results = { rows: out, columns, elapsed: performance.now() - started };
                this.activeTable = ast.table;
            } catch (e) {
                this.results = null;
                this.error = e.message;
            } finally {
                this.loading = false;
            }
        },

        pickTable(t) {
            this.query = 'SELECT * FROM [Portfolio_DB].[dbo].[' + t + ']';
            this.activeTable = t;
            this.runQuery();
        },

        runExample(sql) {
            this.query = sql;
            this.helpOpen = false;
            this.runQuery(sql);
        },

        get rowCount() { return this.results ? this.results.rows.length : 0; },
        get elapsedLabel() {
            if (!this.results) return '00:00:00';
            const ms = this.results.elapsed;
            if (ms < 1000) return '00:00:' + (ms / 1000).toFixed(3).padStart(6, '0');
            return '00:00:' + String(Math.floor(ms / 1000)).padStart(2, '0');
        },
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
