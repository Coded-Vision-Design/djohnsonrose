// assets/js/components/apps/admin.js
// 1:1 with v2/src/apps/admin/AdminConsole.tsx. Lazy-loads Chart.js + Google
// Identity Services on first open so v1 doesn't pay the cost on every page.
// Auth + stats endpoints are shared with v2.

const CHART_JS_SRC = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.6/dist/chart.umd.min.js';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

function loadScriptOnce(src) {
    if (document.querySelector(`script[src="${src}"]`)) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.defer = true;
        s.onload = resolve;
        s.onerror = () => reject(new Error('Failed to load ' + src));
        document.head.appendChild(s);
    });
}

const SOURCE_COLOURS = { php: '#0078d4', react: '#61dafb', unknown: '#888888' };

function classifyDevice(os) {
    if (!os) return 'Other';
    const v = String(os).toLowerCase();
    if (v.includes('ipad') || v.includes('tablet')) return 'Tablet';
    if (v.includes('android') || v.includes('iphone') || v.includes('ios') || v.includes('mobile')) return 'Mobile';
    if (v.includes('windows') || v.includes('mac') || v.includes('linux') || v.includes('chrome os')) return 'Desktop';
    return 'Other';
}

function toCountMap(rows, labelKey) {
    const labels = [], values = [];
    for (const r of rows || []) {
        labels.push(String(r[labelKey] ?? 'Unknown'));
        values.push(Number(r.total) || 0);
    }
    return { labels, values };
}

document.addEventListener('alpine:init', () => {
    Alpine.data('adminApp', () => ({
        me: null,
        stats: null,
        authError: null,
        busy: false,
        tab: 'dashboard',
        selectedEnquiry: null,
        _charts: {},
        _gisReady: false,
        _buttonRendered: false,

        async init() {
            // Don't block the partial render — fire and forget.
            this.refreshMe();
            // Eagerly load Chart.js + GIS in parallel; both are needed.
            this._libsReady = Promise.all([
                loadScriptOnce(CHART_JS_SRC),
                loadScriptOnce(GIS_SRC),
            ]).catch((e) => { this.authError = e.message; });
        },

        async refreshMe() {
            try {
                const r = await fetch(window.portfolioConfig.basePath + 'api/admin_me.php', { credentials: 'same-origin' });
                this.me = await r.json();
            } catch (e) {
                this.me = { authenticated: false };
            }
            await this.$nextTick();
            if (this.me && this.me.authenticated) {
                this.loadStats();
            } else {
                this._renderGoogleButton();
            }
        },

        async _renderGoogleButton() {
            if (this._buttonRendered || !this.me || !this.me.client_id) return;
            await this._libsReady;
            if (!window.google || !this.$refs.gisButton) return;
            try {
                window.google.accounts.id.initialize({
                    client_id: this.me.client_id,
                    callback: (res) => this._handleCredential(res.credential),
                    ux_mode: 'popup',
                });
                window.google.accounts.id.renderButton(this.$refs.gisButton, {
                    theme: 'filled_blue', size: 'large', shape: 'pill',
                    text: 'signin_with', width: 280,
                });
                this._buttonRendered = true;
            } catch (e) {
                this.authError = e.message;
            }
        },

        async _handleCredential(credential) {
            this.authError = null;
            this.busy = true;
            try {
                const r = await fetch(window.portfolioConfig.basePath + 'api/admin_auth.php', {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id_token: credential }),
                });
                const body = await r.json();
                if (!r.ok || !body.ok) {
                    this.authError = body.error || 'Sign-in failed';
                    return;
                }
                await this.refreshMe();
            } catch (e) {
                this.authError = e.message;
            } finally {
                this.busy = false;
            }
        },

        async loadStats() {
            this.busy = true;
            try {
                const r = await fetch(window.portfolioConfig.basePath + 'api/stats.php', { credentials: 'same-origin' });
                if (r.status === 401) {
                    this.me = { authenticated: false };
                    this.stats = null;
                    return;
                }
                if (!r.ok) throw new Error(`Stats request failed (${r.status})`);
                this.stats = await r.json();
                await this._libsReady;
                this.$nextTick(() => this._renderCharts());
            } catch (e) {
                this.authError = e.message;
            } finally {
                this.busy = false;
            }
        },

        async logout() {
            try { window.google?.accounts.id.disableAutoSelect(); } catch (_) {}
            await fetch(window.portfolioConfig.basePath + 'api/admin_logout.php', {
                method: 'POST', credentials: 'same-origin',
            });
            this._destroyCharts();
            this.stats = null;
            this._buttonRendered = false;
            this.refreshMe();
        },

        kpi(source) {
            if (!this.stats) return '0';
            const r = (this.stats.source.lifetime || []).find((x) => x.source === source);
            return r ? Number(r.total).toLocaleString() : '0';
        },

        _destroyCharts() {
            for (const k of Object.keys(this._charts)) {
                try { this._charts[k].destroy(); } catch (_) {}
            }
            this._charts = {};
        },

        _renderCharts() {
            if (!window.Chart || !this.stats) return;
            this._destroyCharts();
            const Chart = window.Chart;

            // 1. Lifetime source doughnut
            const src = toCountMap(this.stats.source.lifetime, 'source');
            if (this.$refs.sourceChart && src.values.length) {
                this._charts.source = new Chart(this.$refs.sourceChart, {
                    type: 'doughnut',
                    data: {
                        labels: src.labels.map((l) => l.toUpperCase()),
                        datasets: [{
                            data: src.values,
                            backgroundColor: src.labels.map((l) => SOURCE_COLOURS[l] || '#aaa'),
                            borderWidth: 0,
                        }],
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
                });
            }

            // 2. Daily sessions line (stacked v1/v2)
            const byDay = {};
            for (const r of this.stats.per_day || []) {
                byDay[r.day] = byDay[r.day] || { php: 0, react: 0 };
                const s = Number(r.sessions) || 0;
                if (r.source === 'php') byDay[r.day].php = s;
                else if (r.source === 'react') byDay[r.day].react = s;
            }
            const days = Object.keys(byDay).sort();
            if (this.$refs.dailyChart && days.length) {
                this._charts.daily = new Chart(this.$refs.dailyChart, {
                    type: 'line',
                    data: {
                        labels: days,
                        datasets: [
                            { label: 'v1 PHP',   data: days.map((d) => byDay[d].php),   borderColor: SOURCE_COLOURS.php,   backgroundColor: 'rgba(0,120,212,0.2)',  fill: true, tension: 0.35 },
                            { label: 'v2 React', data: days.map((d) => byDay[d].react), borderColor: SOURCE_COLOURS.react, backgroundColor: 'rgba(97,218,251,0.25)', fill: true, tension: 0.35 },
                        ],
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        interaction: { mode: 'index', intersect: false },
                        plugins: { legend: { position: 'bottom' } },
                        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                    },
                });
            }

            // 3. Per-app bar (horizontal)
            const perApp = toCountMap(this.stats.per_app, 'app');
            if (this.$refs.perAppChart && perApp.values.length) {
                this._charts.perApp = new Chart(this.$refs.perAppChart, {
                    type: 'bar',
                    data: {
                        labels: perApp.labels,
                        datasets: [{ label: 'Events', data: perApp.values, backgroundColor: '#0078d4', borderRadius: 6 }],
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                        plugins: { legend: { display: false } },
                        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
                    },
                });
            }

            // 4. Device type doughnut
            const buckets = { Desktop: 0, Mobile: 0, Tablet: 0, Other: 0 };
            for (const r of this.stats.os || []) {
                buckets[classifyDevice(r.os)] += Number(r.total) || 0;
            }
            const devValues = Object.values(buckets);
            if (this.$refs.deviceChart && devValues.some((v) => v > 0)) {
                this._charts.device = new Chart(this.$refs.deviceChart, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(buckets),
                        datasets: [{ data: devValues, backgroundColor: ['#0078d4', '#10b981', '#f59e0b', '#94a3b8'], borderWidth: 0 }],
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } },
                });
            }

            // 5. Browser bar (vertical)
            const browser = toCountMap(this.stats.browser, 'browser');
            if (this.$refs.browserChart && browser.values.length) {
                this._charts.browser = new Chart(this.$refs.browserChart, {
                    type: 'bar',
                    data: {
                        labels: browser.labels,
                        datasets: [{ label: 'Events', data: browser.values, backgroundColor: '#10b981', borderRadius: 6 }],
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
                    },
                });
            }

            // 6. Country bar (horizontal)
            const country = toCountMap(this.stats.country, 'country');
            if (this.$refs.countryChart && country.values.length) {
                this._charts.country = new Chart(this.$refs.countryChart, {
                    type: 'bar',
                    data: {
                        labels: country.labels,
                        datasets: [{ label: 'Events', data: country.values, backgroundColor: '#8b5cf6', borderRadius: 6 }],
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
                        plugins: { legend: { display: false } },
                        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
                    },
                });
            }
        },
    }));
});
