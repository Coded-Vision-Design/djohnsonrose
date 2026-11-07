// assets/js/components/os/filesystem.js
// The mock Windows file system is data/filesystem.json, shared with v2, so that
// search, Explorer and the desktop cannot drift apart. See partials/shell.php.
// What can be done to it is in assets/js/windowing/file-ops.js.

// Bump this when the shared file changes, so that saved copies pick it up.
window.osFileSystemVersion = 6;

window.loadFileSystem = function () {
    const config = window.portfolioConfig;
    const defaults = OsWindowing.prepareFileSystem(config.fileSystem, {
        imgPath: config.imgPath,
        basePath: config.basePath,
        // The taskbar's build switch is hidden on phones, so the Desktop has it too.
        otherBuild: { name: 'React Build', url: '/v2/', icon: 'react.webp' }
    });
    try {
        const version = localStorage.getItem('os.fileSystem.version');
        return OsWindowing.restoreFileSystem(localStorage.getItem('os.fileSystem'), version, defaults, window.osFileSystemVersion);
    } catch {
        return defaults;
    }
};
