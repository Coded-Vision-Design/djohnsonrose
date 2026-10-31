// assets/js/components/os/filesystem.js
// The mock Windows file system is data/filesystem.json, shared with v2, so that
// search, Explorer and the desktop cannot drift apart. See partials/shell.php.

// Visitors who have changed something keep a saved copy, which predates anything
// added to the shared file since. Each upgrade runs once, so an item a visitor
// then deletes stays deleted. saveFileSystem() records the version.
window.osFileSystemVersion = 3;

function addNewItems(saved, defaults) {
    const binned = (saved['C:\\Recycle Bin'] || []).map(item => item.name);
    Object.entries(defaults).forEach(([path, items]) => {
        const folder = saved[path] || (saved[path] = []);
        items.forEach(item => {
            if (binned.includes(item.name) || folder.some(existing => existing.name === item.name)) return;
            const bin = folder.findIndex(existing => existing.name === 'Recycle Bin');
            folder.splice(bin === -1 ? folder.length : bin, 0, item);
        });
    });
}

window.loadFileSystem = function () {
    const config = window.portfolioConfig;
    const defaults = OsWindowing.prepareFileSystem(config.fileSystem, {
        imgPath: config.imgPath,
        basePath: config.basePath,
        // The taskbar's build switch is hidden on phones, so the Desktop has it too.
        otherBuild: { name: 'React Build', url: '/v2/', icon: 'react.webp' }
    });

    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem('os.fileSystem'));
    } catch {
        return defaults;
    }
    if (!saved || typeof saved !== 'object') return defaults;

    const version = Number(localStorage.getItem('os.fileSystem.version')) || 1;
    if (version < window.osFileSystemVersion) addNewItems(saved, defaults);
    return saved;
};
