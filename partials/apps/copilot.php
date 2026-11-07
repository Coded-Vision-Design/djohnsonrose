<?php
/**
 * The sources for one answer, requirement or summary: a link for a section of
 * /cv, a button for a file, folder or app on the desktop. Written once here and
 * used three times below, as v2's <Citations> component is.
 */
$citations = fn(string $list) => <<<HTML
<ul class="copilot-citations">
    <template x-for="c in {$list}" :key="c.id">
        <li>
            <template x-if="OsWindowing.citationHref(c, basePath)">
                <a class="copilot-citation" :href="OsWindowing.citationHref(c, basePath)" target="_blank" rel="noopener" :data-citation="c.id" :title="OsWindowing.citationHint(c)"><span class="copilot-citation-kind" x-text="OsWindowing.citationKindLabel(c)"></span><span x-text="c.title"></span><span class="copilot-visually-hidden" x-text="' (' + OsWindowing.citationHint(c) + ')'"></span></a>
            </template>
            <template x-if="!OsWindowing.citationHref(c, basePath)">
                <button type="button" class="copilot-citation" @click="openCitation(c)" :data-citation="c.id" :title="OsWindowing.citationHint(c)"><span class="copilot-citation-kind" x-text="OsWindowing.citationKindLabel(c)"></span><span x-text="c.title"></span><span class="copilot-visually-hidden" x-text="' (' + OsWindowing.citationHint(c) + ')'"></span></button>
            </template>
        </li>
    </template>
</ul>
HTML;
?>
<!-- partials/apps/copilot.php -->
<!-- Copilot, the same as v2/src/apps/copilot/Copilot.tsx: a chat about DeVanté
     and a job matcher, both answered by api/copilot.php from the site's own
     data. The logic both builds share is assets/js/windowing/copilot.js, the
     component is copilotApp in assets/js/components/apps/copilot.js, and the
     styles are the Copilot section of assets/css/windowing.css. -->
<div class="copilot" data-copilot x-data="copilotApp()">
    <header class="copilot-header">
        <img src="<?php echo IMG_PATH; ?>copilot.webp" alt="" class="copilot-logo" width="32" height="32">
        <div>
            <h1 class="copilot-title">Copilot</h1>
            <p class="copilot-subtitle">Answers from DeVanté's CV, with sources</p>
        </div>
    </header>

    <template x-if="status === 'checking'">
        <p class="copilot-loading" role="status">Starting Copilot…</p>
    </template>

    <template x-if="status === 'off'">
        <div class="copilot-off" data-copilot-off>
            <img src="<?php echo IMG_PATH; ?>copilot.webp" alt="" class="copilot-off-logo" width="64" height="64">
            <h2 class="copilot-off-title">Copilot is not switched on yet</h2>
            <p>Once it is, Copilot will answer questions about DeVanté's work and match job descriptions against his CV, showing where each answer comes from. Until then, the CV has everything it would draw on.</p>
            <a class="copilot-button copilot-button-primary" :href="basePath + 'cv'" target="_blank" rel="noopener">Read the CV<span class="copilot-visually-hidden"> (opens in a new tab)</span></a>
        </div>
    </template>

    <template x-if="status === 'on' || status === 'unknown'">
        <div class="copilot-panel">
            <div class="copilot-tabs" role="tablist" aria-label="Copilot" @keydown="tabKey($event)">
                <button type="button" role="tab" id="copilot-tab-chat" class="copilot-tab" aria-controls="copilot-panel-chat"
                        :aria-selected="tab === 'chat' ? 'true' : 'false'" :tabindex="tab === 'chat' ? 0 : -1"
                        @click="tab = 'chat'" data-copilot-tab="chat">Chat</button>
                <button type="button" role="tab" id="copilot-tab-match" class="copilot-tab" aria-controls="copilot-panel-match"
                        :aria-selected="tab === 'match' ? 'true' : 'false'" :tabindex="tab === 'match' ? 0 : -1"
                        @click="tab = 'match'" data-copilot-tab="match">Job match</button>
            </div>
            <p class="copilot-notice" role="status" aria-live="polite" data-copilot-notice x-text="notice"></p>

            <section class="copilot-panel" id="copilot-panel-chat" role="tabpanel" aria-labelledby="copilot-tab-chat" :hidden="tab !== 'chat'">
                <div class="copilot-log" role="log" aria-label="Conversation" data-copilot-log x-ref="log">
                    <div class="copilot-message copilot-message-assistant" data-copilot-message="assistant">
                        <p class="copilot-message-text">Hello. Ask me about DeVanté's experience, skills, projects or certificates. I answer only from this site's own data, and show where each answer comes from.</p>
                    </div>
                    <template x-for="m in messages" :key="m.id">
                        <div class="copilot-message" :class="'copilot-message-' + m.role" :data-copilot-message="m.role">
                            <p class="copilot-message-text" x-text="m.text"></p>
                            <template x-if="m.role === 'assistant' && m.covered && !m.grounded">
                                <p class="copilot-note" data-copilot-ungrounded>No source could be checked for this answer, so treat it with care.</p>
                            </template>
                            <template x-if="m.citations && m.citations.length">
                                <div class="copilot-sources">
                                    <p class="copilot-sources-title">Sources</p>
                                    <?php echo $citations('m.citations'); ?>
                                </div>
                            </template>
                        </div>
                    </template>
                    <template x-if="asking">
                        <div class="copilot-message copilot-message-assistant copilot-thinking">Copilot is thinking…</div>
                    </template>
                </div>
                <template x-if="!asked">
                    <div class="copilot-suggestions" role="group" aria-label="Suggested questions">
                        <template x-for="s in suggestions" :key="s">
                            <button type="button" class="copilot-suggestion" data-copilot-suggestion @click="ask(s)" x-text="s"></button>
                        </template>
                    </div>
                </template>
                <form class="copilot-composer" @submit.prevent="ask()">
                    <label for="copilot-question" class="copilot-visually-hidden">Ask Copilot about DeVanté</label>
                    <textarea id="copilot-question" class="copilot-field" rows="2" :maxlength="questionMax" x-model="question"
                              placeholder="Ask about his experience, skills or projects"
                              @keydown.enter="if (!$event.shiftKey && !$event.isComposing) { $event.preventDefault(); ask() }"></textarea>
                    <div class="copilot-bar">
                        <span class="copilot-count" data-copilot-count x-text="OsWindowing.countLabel(question, questionMax)"></span>
                        <button type="submit" class="copilot-button copilot-button-primary" :disabled="asking || !question.trim()">Send</button>
                    </div>
                </form>
                <p class="copilot-disclaimer">Copilot uses Claude, by Anthropic, and answers only from this site's data. Check the sources. <a :href="basePath + 'privacy#copilot'" target="_blank" rel="noopener">How your questions are handled</a></p>
            </section>

            <section class="copilot-panel" id="copilot-panel-match" role="tabpanel" aria-labelledby="copilot-tab-match" :hidden="tab !== 'match'">
                <div class="copilot-scroll">
                    <form class="copilot-job" @submit.prevent="runMatch()" novalidate>
                        <label for="copilot-job" class="copilot-label">Paste a job description</label>
                        <p class="copilot-subtitle" id="copilot-job-help">Copilot maps each requirement to evidence in the CV, says plainly what is missing, and builds a CV chosen and ordered for the job.</p>
                        <textarea id="copilot-job" class="copilot-field copilot-field-job" rows="8" :maxlength="jobMax" x-model="job" aria-describedby="copilot-job-help"></textarea>
                        <div class="copilot-bar">
                            <span class="copilot-count" data-copilot-count x-text="OsWindowing.countLabel(job, jobMax)"></span>
                            <button type="submit" class="copilot-button copilot-button-primary" :disabled="matching">Match</button>
                        </div>
                    </form>
                    <template x-if="matchError">
                        <p class="copilot-error" role="alert" data-copilot-match-error x-text="matchError"></p>
                    </template>
                    <template x-if="matching">
                        <p class="copilot-thinking" role="status">Copilot is reading the job description…</p>
                    </template>
                    <template x-if="match">
                        <div class="copilot-results" data-copilot-results tabindex="-1" x-ref="results">
                            <h2 class="copilot-heading">How the CV matches</h2>
                            <p class="copilot-counts" data-copilot-counts x-text="OsWindowing.matchCountsText(match.requirements)"></p>
                            <template x-if="match.summary">
                                <aside class="copilot-generated" data-copilot-summary aria-label="Generated summary">
                                    <p class="copilot-generated-label">Generated by Copilot</p>
                                    <p x-text="match.summary.text"></p>
                                    <?php echo $citations('match.summary.citations'); ?>
                                </aside>
                            </template>
                            <table class="copilot-table" data-copilot-table>
                                <caption class="copilot-visually-hidden">Each requirement in the job description, with its evidence in the CV</caption>
                                <thead>
                                    <tr><th scope="col">Requirement</th><th scope="col">Strength</th><th scope="col">Evidence</th></tr>
                                </thead>
                                <tbody>
                                    <template x-for="(r, i) in match.requirements" :key="i">
                                        <tr>
                                            <th scope="row" x-text="r.requirement"></th>
                                            <td><span class="copilot-strength" :data-strength="r.strength" x-text="OsWindowing.strengthLabel(r.strength)"></span></td>
                                            <td>
                                                <p x-text="r.note"></p>
                                                <template x-if="r.citations.length">
                                                    <?php echo $citations('r.citations'); ?>
                                                </template>
                                            </td>
                                        </tr>
                                    </template>
                                </tbody>
                            </table>
                            <h3 class="copilot-subheading">Gaps</h3>
                            <template x-if="match.gaps.length">
                                <ul class="copilot-gaps" data-copilot-gaps>
                                    <template x-for="(gap, i) in match.gaps" :key="i">
                                        <li x-text="gap"></li>
                                    </template>
                                </ul>
                            </template>
                            <template x-if="!match.gaps.length">
                                <p>Copilot found no gaps between this job and the CV.</p>
                            </template>
                            <h2 class="copilot-heading">Tailored CV</h2>
                            <p class="copilot-subtitle">Chosen and ordered from the CV for this job, with the matched skills highlighted. Only a summary marked as generated is new text.</p>
                            <div class="copilot-cv-actions">
                                <button type="button" class="copilot-button copilot-button-primary" @click="printCv()">Print<span class="copilot-visually-hidden"> the tailored CV</span></button>
                                <button type="button" class="copilot-button" @click="downloadCv()">Download<span class="copilot-visually-hidden"> the tailored CV</span></button>
                            </div>
                            <iframe class="copilot-cv-frame" title="Tailored CV preview" sandbox="allow-same-origin allow-modals"
                                    :srcdoc="cvHtml" x-ref="cvFrame" x-init="watchFrame($el)" data-copilot-cv></iframe>
                        </div>
                    </template>
                </div>
            </section>
        </div>
    </template>
</div>
