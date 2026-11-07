<!-- partials/apps/vscode.php -->
<?php
// VS Code: a read-only viewer of the site's own source, the same as v2's
// v2/src/apps/vscode/VSCode.tsx. The files, tree, tabs and colouring are in
// assets/js/windowing/source-viewer.js, and the styles in assets/css/windowing.css.
$vscodeIcons = [
    'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.8L19.2 7.5 12 11.1 4.8 7.5 12 4.8zm-7.2 5.1l6.2 3.1v6.2l-6.2-3.1v-6.2zm8.2 9.3v-6.2l6.2-3.1v6.2l-6.2 3.1z',
    'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z',
];
?>
<div class="vsc" x-data="vscodeApp()" data-vscode>
    <div class="vsc-activity" aria-hidden="true">
        <?php foreach ($vscodeIcons as $d): ?>
            <span><svg fill="currentColor" viewBox="0 0 24 24"><path d="<?php echo $d; ?>"></path></svg></span>
        <?php endforeach; ?>
    </div>

    <nav class="vsc-explorer" aria-label="Explorer">
        <h2 class="vsc-explorer-title">Explorer</h2>
        <ul class="vsc-tree" data-vscode-tree>
            <template x-for="row in rows" :key="row.path">
                <li>
                    <template x-if="row.kind === 'folder'">
                        <button type="button" class="vsc-tree-row" :data-depth="row.depth" :data-source-folder="row.path"
                                :aria-expanded="row.open" @click="toggle(row.path)">
                            <span class="vsc-chevron" aria-hidden="true"><svg fill="currentColor" viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"></path></svg></span>
                            <span class="vsc-name" x-text="row.name"></span>
                        </button>
                    </template>
                    <template x-if="row.kind === 'file'">
                        <button type="button" class="vsc-tree-row" :data-depth="row.depth" :data-source-file="row.path"
                                :aria-current="row.path === tabs.active ? 'true' : null" @click="open(row.path)">
                            <span class="vsc-chevron" aria-hidden="true"></span>
                            <span class="vsc-badge" :data-lang="language(row.path)" aria-hidden="true" x-text="badge(row.path)"></span>
                            <span class="vsc-name" x-text="row.name"></span>
                        </button>
                    </template>
                </li>
            </template>
        </ul>
    </nav>

    <div class="vsc-main">
        <label class="vsc-picker">
            <span>File</span>
            <select aria-label="File" @change="$event.target.value && open($event.target.value)">
                <option value="" disabled :selected="!tabs.active">Choose a file</option>
                <template x-for="group in groups" :key="group.folder">
                    <optgroup :label="group.folder">
                        <template x-for="file in group.files" :key="file.path">
                            <option :value="file.path" :selected="file.path === tabs.active" x-text="file.name"></option>
                        </template>
                    </optgroup>
                </template>
            </select>
        </label>

        <div class="vsc-tabs" data-vscode-tabs>
            <template x-for="path in tabs.tabs" :key="path">
                <div class="vsc-tab" :data-active="path === tabs.active ? 'true' : null" :data-source-tab="path">
                    <button type="button" class="vsc-tab-open" :aria-current="path === tabs.active ? 'true' : null" :title="path" @click="open(path)">
                        <span class="vsc-badge" :data-lang="language(path)" aria-hidden="true" x-text="badge(path)"></span>
                        <span class="vsc-name" x-text="fileName(path)"></span>
                    </button>
                    <button type="button" class="vsc-tab-close" :aria-label="'Close ' + fileName(path)" @click="close(path)">
                        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"></path></svg>
                    </button>
                </div>
            </template>
        </div>

        <template x-if="tabs.active">
            <p class="vsc-crumbs" x-text="tabs.active.split('/').join(' › ')"></p>
        </template>

        <template x-if="view && view.status === 'ready'">
            <div class="vsc-editor" tabindex="0" role="region" :aria-label="fileName(tabs.active) + ', read-only'" data-vscode-editor>
                <pre class="vsc-code"><code x-html="view.html"></code></pre>
            </div>
        </template>
        <template x-if="!view || view.status !== 'ready'">
            <div class="vsc-message" data-vscode-message>
                <template x-if="!tabs.active"><p>Choose a file to read the source of this site.</p></template>
                <template x-if="tabs.active && !view"><p x-text="'Loading ' + fileName(tabs.active) + '...'"></p></template>
                <template x-if="tabs.active && view && view.status === 'error'">
                    <p x-text="'Could not load ' + fileName(tabs.active) + '.'"></p>
                </template>
                <template x-if="tabs.active && view && view.status === 'error'">
                    <button type="button" @click="retry()">Try again</button>
                </template>
            </div>
        </template>

        <div class="vsc-status" data-vscode-status>
            <div><span>Read-only</span></div>
            <template x-if="view && view.status === 'ready'">
                <div>
                    <span x-text="view.lines + ' lines'"></span>
                    <span>UTF-8</span>
                    <span x-text="view.languageName"></span>
                </div>
            </template>
        </div>
    </div>
</div>
