<!-- partials/apps/putty.php: the same markup as v2's Putty.tsx, styled by assets/css/office.css. -->
<div class="putty-app" data-office-app="putty" x-data="puttyApp()">
    <div class="putty-titlebar" data-putty-titlebar>
        <img :src="imgPath + 'putty.webp'" alt="">
        <span x-text="session ? `${session.host} - PuTTY` : 'PuTTY Configuration'"></span>
    </div>

    <template x-if="!session">
        <div class="putty-body">
            <div class="putty-tree">
                <div class="putty-tree-label" id="putty-category">Category:</div>
                <ul role="tree" aria-labelledby="putty-category">
                    <template x-for="group in CATEGORIES" :key="group.name">
                        <li class="putty-tree-group">
                            <div role="treeitem" class="putty-tree-parent" :data-putty-category="group.name"
                                 :aria-selected="String(group.name === 'Session')" x-text="group.name"></div>
                            <ul role="group">
                                <template x-for="child in group.children" :key="child">
                                    <li role="treeitem" class="putty-tree-child" :data-putty-category="child" aria-selected="false" x-text="child"></li>
                                </template>
                            </ul>
                        </li>
                    </template>
                </ul>
            </div>

            <div class="putty-panel" data-putty-panel>
                <div class="putty-heading">Basic options for your PuTTY session</div>

                <div class="putty-section">
                    <div class="putty-subheading">Specify the destination you want to connect to</div>
                    <div class="putty-row">
                        <label class="putty-host-label" for="putty-host">Host Name (or IP address)</label>
                        <input id="putty-host" class="putty-input putty-host" type="text" autocomplete="off" spellcheck="false"
                               x-model="host" @keydown.enter="open()">
                        <label for="putty-port">Port</label>
                        <input id="putty-port" class="putty-input putty-port" type="number" min="1" max="65535"
                               :value="port" @input="port = Number($event.target.value)">
                    </div>
                    <div class="putty-row" role="radiogroup" aria-label="Connection type">
                        <span>Connection type:</span>
                        <template x-for="type in TYPES" :key="type">
                            <label class="putty-radio">
                                <input type="radio" name="putty-connection" :value="type" :checked="type === connection" @change="connection = type">
                                <span x-text="type"></span>
                            </label>
                        </template>
                    </div>
                </div>

                <div class="putty-section">
                    <div class="putty-subheading" id="putty-saved">Load, save or delete a stored session</div>
                    <div class="putty-sessions">
                        <div class="putty-list" role="listbox" aria-labelledby="putty-saved">
                            <template x-for="saved in SESSIONS" :key="saved.name">
                                <button type="button" role="option" class="putty-option" :aria-selected="String(saved.name === selected)"
                                        @click="pick(saved)" @dblclick="pick(saved); open()" x-text="saved.name"></button>
                            </template>
                        </div>
                        <div class="putty-side-buttons">
                            <button type="button" class="putty-button" @click="pick(SESSIONS.find((saved) => saved.name === selected))">Load</button>
                            <button type="button" class="putty-button">Save</button>
                            <button type="button" class="putty-button">Delete</button>
                        </div>
                    </div>
                </div>

                <div class="putty-actions">
                    <button type="button" class="putty-button putty-button-default" :disabled="!host.trim()" @click="open()">Open</button>
                    <button type="button" class="putty-button" @click="cancel()">Cancel</button>
                </div>
            </div>
        </div>
    </template>

    <template x-if="session">
        <div class="putty-terminal" data-putty-terminal x-ref="terminal" @click="$refs.command?.focus()">
            <pre class="putty-output" x-text="lines.join('\n')"></pre>
            <form class="putty-prompt" @submit.prevent="submit()">
                <span x-text="O.puttyPrompt(session.host)"></span>
                <input x-ref="command" aria-label="Command" autocomplete="off" autocapitalize="off" spellcheck="false" x-model="command">
            </form>
        </div>
    </template>
</div>
