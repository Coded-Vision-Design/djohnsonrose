// assets/js/components/apps/dev.js
document.addEventListener('alpine:init', () => {
    // VS Code. Picking a project shows it; only Build switches to the terminal.
    // The terminal lines are shared with v2 in assets/js/windowing/devtools.js.
    Alpine.data('vscodeApp', (firstProject = '') => ({
        activeFile: firstProject,
        explorerOpen: true,
        activeTab: 'editor', // 'editor' or 'terminal'
        terminalOutput: [...OsWindowing.VSCODE_TERMINAL_START],
        isBuilding: false,
        _timer: null,

        runBuild() {
            if (this.isBuilding) return;
            this.isBuilding = true;
            this.activeTab = 'terminal';
            const steps = OsWindowing.vscodeBuildLog(this.activeFile);
            this._timer = setInterval(() => {
                this.terminalOutput.push(steps.shift());
                if (!steps.length) {
                    clearInterval(this._timer);
                    this.isBuilding = false;
                }
                this.$nextTick(() => {
                    const term = this.$root.querySelector('[data-vscode-terminal]');
                    if (term) term.scrollTop = term.scrollHeight;
                });
            }, 300);
        },

        selectFile(name) {
            this.activeFile = name;
            this.activeTab = 'editor';
        },

        destroy() {
            clearInterval(this._timer);
        }
    }));

    // SQL Server Management Studio over the CV. The server (api/cv_data.php)
    // only ever returns whole tables; the query is parsed and run in the
    // browser by assets/js/windowing/sql.js, shared with v2.
    Alpine.data('databaseApp', () => ({
        TABLES: OsWindowing.SQL_TABLES,
        EXAMPLES: OsWindowing.SQL_EXAMPLES,
        activeTable: 'experience',
        query: 'SELECT * FROM [Portfolio_DB].[dbo].[experience]',
        results: null,            // { rows, columns, elapsed }
        error: null,
        loading: false,
        helpOpen: false,
        resultsTab: 'results',
        // The Object Explorer folds away on phones, where it would crush the results.
        explorerOpen: window.matchMedia('(min-width: 768px)').matches,
        _cache: {},
        _queries: OsWindowing.latestQuery(),

        init() {
            this.runQuery();
        },

        async _loadTable(table) {
            const hit = this._cache[table];
            if (hit && Date.now() - hit.loadedAt < 60000) return hit.rows;
            const r = await fetch(window.portfolioConfig.basePath + 'api/cv_data.php?table=' + encodeURIComponent(table));
            if (!r.ok) throw new Error(`Failed to fetch table '${table}' (${r.status})`);
            const body = await r.json();
            if (body.error) throw new Error(body.error);
            this._cache[table] = { loadedAt: Date.now(), rows: body.data || [] };
            return body.data || [];
        },

        async runQuery(sql) {
            const ticket = this._queries.start();
            this.loading = true;
            this.error = null;
            const outcome = await OsWindowing.runSql(sql == null ? this.query : sql, (table) => this._loadTable(table));
            // A slower, older query must not replace the newest one's results.
            if (!this._queries.isLatest(ticket)) return;
            this.results = outcome.executed;
            this.error = outcome.error;
            if (outcome.table) this.activeTable = outcome.table;
            this.loading = false;
        },

        pickTable(t) {
            this.query = 'SELECT * FROM [Portfolio_DB].[dbo].[' + t + ']';
            this.activeTable = t;
            if (!window.matchMedia('(min-width: 768px)').matches) this.explorerOpen = false;
            this.runQuery();
        },

        runExample(sql) {
            this.query = sql;
            this.helpOpen = false;
            this.runQuery(sql);
        },

        get rowCount() { return this.results ? this.results.rows.length : 0; },
        get elapsedLabel() { return OsWindowing.sqlElapsedLabel(this.results?.elapsed); },
    }));

    // Docker Desktop. The containers, images and volumes come from
    // data/devtools.json, and start, stop and restart from
    // assets/js/windowing/devtools.js, both shared with v2.
    Alpine.data('dockerApp', (docker = {}) => ({
        engine: docker.engine ?? 'Docker Engine',
        images: docker.images ?? [],
        volumes: docker.volumes ?? [],
        containers: (docker.containers ?? []).map(c => ({ ...c })),
        activeView: 'containers',
        // The sidebar folds away on phones, where it would crush the table.
        navOpen: window.matchMedia('(min-width: 768px)').matches,
        searchQuery: '',
        selectedId: null,
        containerDetailTab: 'logs',
        lastCommand: '',
        cliOutput: [],

        get filteredContainers() {
            return OsWindowing.filterContainers(this.containers, this.searchQuery);
        },

        showView(view) {
            this.activeView = view;
            if (!window.matchMedia('(min-width: 768px)').matches) this.navOpen = false;
        },

        act(c, action) {
            const result = OsWindowing.containerAction(this.containers, c.id, action);
            this.containers = result.containers;
            this.lastCommand = result.command;
            this.cliOutput = result.error
                ? [{ text: result.error, type: 'error' }]
                : result.output.map(text => ({ text, type: 'info' }));
        },

        get selectedContainer() {
            return this.selectedId ? this.containers.find(c => c.id === this.selectedId) : null;
        },

        get containerLogs() {
            return this.selectedContainer?.logs ?? [];
        },

        get containerInspect() {
            return OsWindowing.inspectContainer(this.selectedContainer);
        },
    }));
});
