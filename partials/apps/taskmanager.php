<!-- partials/apps/taskmanager.php: the same markup as v2's TaskManager.tsx, styled by
     assets/css/taskmanager.css. Every figure comes from the page or from build.json,
     through assets/js/windowing/metrics.js (taskManagerApp in components/apps/system.js). -->
<div class="tm" data-task-manager x-data="taskManagerApp()">
    <div class="tm-head">
        <img src="<?php echo IMG_PATH; ?>taskmanager.webp" alt="" class="tm-head-icon">
        <h1 class="tm-title">Task Manager</h1>
    </div>

    <div class="tm-tabs" role="tablist" aria-label="Task Manager views">
        <template x-for="(item, index) in tabs" :key="item.id">
            <button type="button" role="tab" class="tm-tab" :id="uid + '-tab-' + item.id" :aria-controls="uid + '-' + item.id"
                    :aria-selected="String(tab === item.id)" :tabindex="tab === item.id ? 0 : -1" :data-tm-tab="item.id"
                    @click="select(item.id)" @keydown="onTabKey($event, index)" x-text="item.label"></button>
        </template>
    </div>

    <div class="tm-body">
        <section class="tm-panel" role="tabpanel" :id="uid + '-processes'" :aria-labelledby="uid + '-tab-processes'"
                 data-tm-panel="processes" tabindex="0" :hidden="tab !== 'processes'">
            <table class="tm-table tm-processes" role="table">
                <caption class="tm-sr-only">Open windows</caption>
                <thead role="rowgroup">
                    <tr role="row">
                        <th role="columnheader" scope="col">Name</th>
                        <th role="columnheader" scope="col" class="tm-col-status">Status</th>
                        <th role="columnheader" scope="col" class="tm-col-files">Own files</th>
                        <th role="columnheader" scope="col" class="tm-col-actions"><span class="tm-sr-only">Actions</span></th>
                    </tr>
                </thead>
                <tbody role="rowgroup">
                    <template x-for="row in rows" :key="row.id">
                        <tr role="row" class="tm-row" :data-tm-process="row.id">
                            <td role="cell" class="tm-cell-name">
                                <span class="tm-name">
                                    <img :src="iconFor(row.app)" alt="" class="tm-icon">
                                    <span class="tm-name-text" data-tm-name x-text="row.title"></span>
                                </span>
                            </td>
                            <td role="cell" class="tm-cell-status" data-tm-status x-text="row.status"></td>
                            <td role="cell" class="tm-cell-files" data-tm-files x-text="row.files"></td>
                            <td role="cell" class="tm-cell-actions">
                                <button type="button" class="tm-end" :aria-label="'End task: ' + row.title" @click="endTask(row.id)">End task</button>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
            <template x-if="heap">
                <div class="tm-heap" data-tm-heap>
                    <h2 class="tm-heading">Page JS heap</h2>
                    <p class="tm-heap-value" data-tm-heap-value x-text="heap.text"></p>
                    <p class="tm-note">This page's JavaScript memory as Chromium reports it, rounded by the browser.</p>
                </div>
            </template>
            <p class="tm-note">Own files are the downloads named for an app, such as its code or its page. Shared code and pictures are not counted.</p>
        </section>

        <section class="tm-panel" role="tabpanel" :id="uid + '-performance'" :aria-labelledby="uid + '-tab-performance'"
                 data-tm-panel="performance" tabindex="0" :hidden="tab !== 'performance'">
            <h2 class="tm-heading">Web Vitals for this page load</h2>
            <ul class="tm-vitals">
                <template x-for="card in vitals" :key="card.id">
                    <li class="tm-vital" :data-tm-vital="card.id" :data-state="card.state">
                        <span class="tm-vital-name" x-text="card.name + ' (' + card.id + ')'"></span>
                        <span class="tm-vital-row">
                            <span class="tm-vital-value" data-tm-value x-text="card.value"></span>
                            <template x-if="card.colour">
                                <span class="tm-badge" :data-tm-rating="card.rating" :style="{ '--tm-badge': card.colour }" x-text="card.ratingLabel"></span>
                            </template>
                        </span>
                        <span class="tm-vital-scale" data-tm-scale x-text="card.scale"></span>
                        <span class="tm-vital-note" x-text="card.note"></span>
                    </li>
                </template>
            </ul>

            <h2 class="tm-heading">What this page downloaded</h2>
            <table class="tm-table tm-downloads">
                <caption class="tm-sr-only">Downloads by type</caption>
                <thead>
                    <tr>
                        <th scope="col">Type</th>
                        <th scope="col" class="tm-num">Requests</th>
                        <th scope="col" class="tm-num">Transferred</th>
                        <th scope="col" class="tm-num">Size</th>
                    </tr>
                </thead>
                <tbody>
                    <template x-for="group in downloads.groups" :key="group.id">
                        <tr :data-tm-group="group.id">
                            <th scope="row" x-text="group.label"></th>
                            <td class="tm-num" data-tm-requests x-text="group.requests"></td>
                            <td class="tm-num" data-tm-transferred x-text="group.transferredText"></td>
                            <td class="tm-num" data-tm-size x-text="group.sizeText"></td>
                        </tr>
                    </template>
                </tbody>
                <tfoot>
                    <tr data-tm-group="total">
                        <th scope="row">Total</th>
                        <td class="tm-num" data-tm-requests x-text="downloads.total.requests"></td>
                        <td class="tm-num" data-tm-transferred x-text="downloads.total.transferredText"></td>
                        <td class="tm-num" data-tm-size x-text="downloads.total.sizeText"></td>
                    </tr>
                </tfoot>
            </table>
            <p class="tm-note">Transferred is what came over the network, headers included. Size is the files once unpacked.</p>

            <h3 class="tm-subheading">Largest files</h3>
            <ol class="tm-largest">
                <template x-for="(file, index) in downloads.largest" :key="index + '-' + file.url">
                    <li class="tm-file" data-tm-file :data-tm-url="file.url">
                        <span class="tm-file-name" :title="file.name" x-text="file.name"></span>
                        <span class="tm-file-group" x-text="file.groupLabel"></span>
                        <span class="tm-file-size"><span data-tm-file-size x-text="file.sizeText"></span><template x-if="file.cached"><span class="tm-file-cache"> (from cache)</span></template></span>
                    </li>
                </template>
            </ol>
            <template x-for="note in downloads.notes" :key="note.id">
                <p class="tm-note" :data-tm-note="note.id" x-text="note.text"></p>
            </template>
        </section>

        <section class="tm-panel" role="tabpanel" :id="uid + '-build'" :aria-labelledby="uid + '-tab-build'"
                 data-tm-panel="build" tabindex="0" :hidden="tab !== 'build'">
            <h2 class="tm-heading" :data-tm-build-state="info.state" x-text="info.title"></h2>
            <template x-if="info.message">
                <p class="tm-text" x-text="info.message"></p>
            </template>
            <template x-if="info.state === 'deployed'">
                <div>
                    <dl class="tm-build">
                        <div>
                            <dt>Commit</dt>
                            <dd><code data-tm-commit x-text="info.commit"></code></dd>
                        </div>
                        <div>
                            <dt>Deployed</dt>
                            <dd data-tm-deployed x-text="info.deployed"></dd>
                        </div>
                    </dl>
                    <h3 class="tm-subheading" data-tm-checks-title x-text="info.checksTitle"></h3>
                    <p class="tm-text" data-tm-checks-summary x-text="info.checksMessage"></p>
                    <template x-if="info.checks.length">
                        <ul class="tm-checks">
                            <template x-for="(check, index) in info.checks" :key="index + '-' + check.name">
                                <li class="tm-check" data-tm-check>
                                    <span class="tm-check-name" data-tm-check-name x-text="check.name"></span>
                                    <span class="tm-badge" :data-tm-tone="check.tone" :style="{ '--tm-badge': toneColour(check.tone) }" x-text="check.label"></span>
                                </li>
                            </template>
                        </ul>
                    </template>
                </div>
            </template>
        </section>
    </div>

    <div class="tm-foot">
        <span data-tm-count x-text="countText"></span>
        <span>Measured in this browser</span>
    </div>
</div>
