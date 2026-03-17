// assets/js/components/edge.js
document.addEventListener('alpine:init', () => {
    Alpine.data('edgeApp', () => ({
        activeTabId: 1,
        tabs: [
            { id: 1, title: 'Projects', url: 'portfolio://projects' }
        ],
        isRefreshing: false,
        
        activeTab() {
            return this.tabs.find(t => t.id === this.activeTabId) || this.tabs[0];
        },
        
        addTab() {
            const id = Date.now();
            this.tabs.push({ id, title: 'New Tab', url: 'https://bing.com' });
            this.activeTabId = id;
        },
        
        closeTab(id) {
            if (this.tabs.length === 1) return;
            this.tabs = this.tabs.filter(t => t.id !== id);
            if (this.activeTabId === id) {
                this.activeTabId = this.tabs[this.tabs.length - 1].id;
            }
        },
        
        loadUrl() {
            const tab = this.activeTab();
            if (!tab.url.startsWith('http') && !tab.url.startsWith('portfolio')) {
                tab.url = 'https://' + tab.url;
            }
            tab.title = tab.url.split('//')[1] || tab.url;
        },

        focusUrl(e) {
            const input = e.target;
            setTimeout(() => {
                input.select();
            }, 40);
        },

        refreshPage() {
            this.isRefreshing = true;
            setTimeout(() => {
                this.isRefreshing = false;
                this.loadUrl();
            }, 400);
        }
    }));
});
