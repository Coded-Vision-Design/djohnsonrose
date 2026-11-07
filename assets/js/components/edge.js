// assets/js/components/edge.js
// Chrome. What an address means and each tab's history are shared with v2 in
// assets/js/windowing/browser.js; the projects come from data/portfolio.json.
document.addEventListener('alpine:init', () => {
    Alpine.data('edgeApp', (projects = []) => ({
        tabs: [],
        activeTabId: null,
        // What is typed in the address bar. Only Enter loads it.
        draft: null,
        isRefreshing: false,
        projects: OsWindowing.featuredProjects(projects),
        homeUrl: OsWindowing.HOME_URL,

        init() {
            this.openAddress(this.win?.initialUrl);
            // A Visit Site file opened while Chrome is already open.
            this.$watch('win.urlRevision', () => this.openAddress(this.win?.initialUrl));
        },

        /** Starts again on `address`, and opens another site in a real tab as well. */
        openAddress(address) {
            const tab = OsWindowing.newTab(Date.now(), address || OsWindowing.HOME_URL);
            this.tabs = [tab];
            this.activeTabId = tab.id;
            this.draft = null;
            if (OsWindowing.isExternal(tab.url)) window.open(tab.url, '_blank', 'noopener,noreferrer');
        },

        activeTab() {
            return this.tabs.find(t => t.id === this.activeTabId) || this.tabs[0];
        },

        get address() {
            return this.draft ?? this.activeTab()?.url ?? '';
        },

        get external() {
            return OsWindowing.isExternal(this.activeTab()?.url ?? '');
        },

        updateTab(change) {
            const tab = this.activeTab();
            this.tabs = this.tabs.map(t => (t.id === tab.id ? change(t) : t));
            this.draft = null;
        },

        selectTab(id) {
            this.activeTabId = id;
            this.draft = null;
        },

        addTab() {
            const tab = OsWindowing.newTab(Date.now());
            this.tabs.push(tab);
            this.selectTab(tab.id);
        },

        closeTab(id) {
            const rest = this.tabs.filter(t => t.id !== id);
            if (rest.length === 0) {
                this.addTab();
                this.tabs = this.tabs.filter(t => t.id !== id);
                return;
            }
            this.tabs = rest;
            if (this.activeTabId === id) this.selectTab(rest[rest.length - 1].id);
        },

        go(address) {
            this.updateTab(tab => OsWindowing.navigateTab(tab, address));
        },

        goBack() {
            this.updateTab(OsWindowing.tabBack);
        },

        goForward() {
            this.updateTab(OsWindowing.tabForward);
        },

        refreshPage() {
            this.isRefreshing = true;
            setTimeout(() => { this.isRefreshing = false; }, 400);
        },

        flagUrl(project) {
            return `https://flagcdn.com/w20/${project.country_code.toLowerCase()}.png`;
        },

        tags(project) {
            return OsWindowing.projectTags(project);
        }
    }));
});
