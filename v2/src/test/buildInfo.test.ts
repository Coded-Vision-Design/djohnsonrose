import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import deployYml from '../../../.github/workflows/deploy.yml?raw'
import deployConfig from '../../../deploy-config.json'
import htaccess from '../../../.htaccess?raw'
import { parseBuildInfo } from '../../../assets/js/windowing/metrics.js'

// The deploy writes build.json for Task Manager: the commit going live, when,
// and what the checks on it concluded. These run the step's own script, with
// stand-ins for git and gh, and check what it writes against the shape Task
// Manager accepts. They also check that the file ships, and holds no secret.

// Node's own modules, reached without @types/node, as performance.test.ts does.
interface NodeBits {
  fs: {
    mkdtempSync(prefix: string): string
    mkdirSync(path: string, options: { recursive: true }): void
    writeFileSync(path: string, data: string): void
    readFileSync(path: string, encoding: 'utf8'): string
    existsSync(path: string): boolean
    chmodSync(path: string, mode: number): void
    rmSync(path: string, options: { recursive: true; force: true }): void
    readdirSync(path: string): string[]
  }
  os: { tmpdir(): string }
  path: { join(...parts: string[]): string; dirname(path: string): string; delimiter: string }
  child: {
    execFile(
      command: string,
      args: string[],
      options: { env: Record<string, string>; encoding: 'utf8'; cwd: string; timeout: number },
      done: (error: { code?: number | string } | null, stdout: string, stderr: string) => void,
    ): void
  }
}
const node = (globalThis as unknown as { process: { getBuiltinModule(id: string): unknown; platform: string; env: Record<string, string>; execPath: string } }).process
const { fs, os, path, child }: NodeBits = {
  fs: node.getBuiltinModule('node:fs') as NodeBits['fs'],
  os: node.getBuiltinModule('node:os') as NodeBits['os'],
  path: node.getBuiltinModule('node:path') as NodeBits['path'],
  child: node.getBuiltinModule('node:child_process') as NodeBits['child'],
}

/** The lines of one job in deploy.yml. */
function jobLines(job: string): string[] {
  const lines = deployYml.split(/\r?\n/)
  const start = lines.findIndex((line) => line === `  ${job}:`)
  if (start < 0) throw new Error(`no ${job} job`)
  const end = lines.findIndex((line, i) => i > start && /^ {2}[A-Za-z_-]+:\s*$/.test(line))
  return lines.slice(start, end < 0 ? undefined : end)
}

const deployJob = jobLines('deploy')
const stepNames = deployJob.map((line) => line.match(/^ {6}- name: (.+)$/)?.[1]).filter(Boolean) as string[]

/** One step of the deploy job, as its lines. */
function stepLines(name: string): string[] {
  const start = deployJob.findIndex((line) => line === `      - name: ${name}`)
  if (start < 0) throw new Error(`no step ${name}`)
  const end = deployJob.findIndex((line, i) => i > start && /^ {6}- /.test(line))
  return deployJob.slice(start, end < 0 ? undefined : end)
}

const STEP = 'Write build.json'

/** The step's run: | block, as the runner would hand it to bash. */
function stepScript(): string {
  const lines = stepLines(STEP)
  const at = lines.findIndex((line) => /^ {8}run: \|\s*$/.test(line))
  if (at < 0) throw new Error('the step has no run block')
  const body: string[] = []
  for (const line of lines.slice(at + 1)) {
    if (line.trim() && !line.startsWith('          ')) break
    body.push(line.slice(10))
  }
  return body.join('\n').trimEnd() + '\n'
}

/** The step's env: block. */
function stepEnv(): Record<string, string> {
  const lines = stepLines(STEP)
  const at = lines.findIndex((line) => line === '        env:')
  const env: Record<string, string> = {}
  for (const line of at < 0 ? [] : lines.slice(at + 1)) {
    const match = line.match(/^ {10}([A-Z_]+): (.+)$/)
    if (!match) break
    env[match[1]] = match[2]
  }
  return env
}

describe('the build.json step', () => {
  it('runs in the deploy job, after the release is unpacked and before any key is written', () => {
    const at = stepNames.indexOf(STEP)
    expect(at).toBeGreaterThan(stepNames.indexOf('Unpack and check the release'))
    expect(at).toBeLessThan(stepNames.indexOf('Configure SSH'))
    expect(at).toBeLessThan(stepNames.indexOf('Deploy files'))
  })

  it('reads the checks with the job token alone, and only reads', () => {
    expect(stepEnv()).toEqual({
      GH_TOKEN: '${{ github.token }}',
      REPO: '${{ github.repository }}',
      RUN_ID: '${{ github.run_id }}',
    })
    expect(stepLines(STEP).join('\n')).not.toMatch(/secrets\./)
    // Every value reaches the script through env, never pasted into it.
    expect(stepScript()).not.toContain('${{')
    const permissions = deployJob.slice(deployJob.indexOf('    permissions:') + 1)
    const granted = Object.fromEntries(
      permissions
        .map((line) => line.match(/^ {6}([a-z-]+): ([a-z]+)$/))
        .filter((match, i, all) => match && all.slice(0, i).every(Boolean))
        .map((match) => [match![1], match![2]]),
    )
    expect(granted).toEqual({ contents: 'read', checks: 'read', statuses: 'read', 'pull-requests': 'read' })
  })

  it('writes into the release that ships', () => {
    expect(stepScript()).toContain('OUT="${RUNNER_TEMP}/release/site/build.json"')
  })
})

/** rsync's rules for a pattern with no slash: it matches a name at any depth. */
function rsyncMatches(pattern: string, file: string): boolean {
  const glob = pattern
    .split('**')
    .map((part) => part.replace(/[.+^${}()|\\[\]]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]'))
    .join('.*')
  const regex = new RegExp(`^${glob}$`)
  if (pattern.includes('/')) return regex.test(file)
  return file.split('/').some((part) => regex.test(part))
}

describe('build.json ships and can be read', () => {
  it('is not in the deploy exclude list', () => {
    expect(rsyncMatches('.env.*', '.env.local')).toBe(true)
    expect(rsyncMatches('v2/src', 'v2/src')).toBe(true)
    const patterns = (deployConfig as { exclude_patterns: string[] }).exclude_patterns
    expect(patterns.length).toBeGreaterThan(10)
    expect(patterns.filter((pattern) => rsyncMatches(pattern, 'build.json'))).toEqual([])
  })

  it('is not one of the files Apache refuses to serve', () => {
    const denied = [...htaccess.matchAll(/<FilesMatch "([^"]+)">\s*Require all denied/g)].map((match) => new RegExp(match[1]))
    expect(denied.length).toBeGreaterThan(1)
    expect(denied.some((rule) => rule.test('.env'))).toBe(true)
    expect(denied.filter((rule) => rule.test('build.json'))).toEqual([])
  })

  it('is checked with the server every time, so a new deploy shows at once', () => {
    const rule = htaccess.match(/<Files "build\.json">([\s\S]*?)<\/Files>/)?.[1] ?? ''
    expect(rule).toMatch(/Header set Cache-Control "no-cache"/)
  })
})

// ── Running the step ─────────────────────────────────────────────────────────

const SHA = 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678'
const HEAD = 'ffeeddccbbaa99887766554433221100ffeeddcc'
const RUN_ID = '4242'
const TOKEN = 'ghs_not_a_real_token_0000'
const REPO = 'secret-owner/secret-repo'

/** Git's own bash on Windows (not WSL's), or the system's elsewhere. */
function findBash(): string | null {
  if (node.platform !== 'win32') return '/bin/bash'
  const candidates = [node.env.ProgramFiles, node.env['ProgramFiles(x86)'], node.env.LOCALAPPDATA && path.join(node.env.LOCALAPPDATA, 'Programs')]
    .filter(Boolean)
    .map((root) => path.join(root as string, 'Git', 'usr', 'bin', 'bash.exe'))
  return candidates.find((file) => fs.existsSync(file)) ?? null
}
const bash = findBash()

const forBash = (file: string) => file.replace(/\\/g, '/')

const checkRun = (name: string, status: string, conclusion: string | null, runId = '100') => ({
  name,
  status,
  conclusion,
  details_url: `https://github.com/${REPO}/actions/runs/${runId}/job/1`,
  html_url: `https://github.com/${REPO}/runs/1`,
})

interface Fixture {
  pulls?: unknown
  checkRuns?: unknown
  status?: unknown
  fail?: 'pulls' | 'check-runs' | 'status'
  sha?: string
}


/** A reply as gh prints it: JSON, or raw text to stand for a broken one. */
const asText = (value: unknown) => (typeof value === 'string' ? value : JSON.stringify(value))

/** Runs the step as the runner does, with fake git and gh, and returns what it wrote. */
async function runStep(root: string, name: string, fixture: Fixture) {
  const dir = path.join(root, name)
  const fakes = path.join(dir, 'bin')
  const temp = path.join(dir, 'runner-temp')
  const data = path.join(dir, 'data')
  const work = path.join(dir, 'cwd')
  for (const folder of [fakes, path.join(temp, 'release', 'site'), data, work]) fs.mkdirSync(folder, { recursive: true })
  fs.writeFileSync(path.join(data, 'pulls.json'), asText(fixture.pulls ?? []))
  fs.writeFileSync(path.join(data, 'check-runs.json'), asText(fixture.checkRuns ?? [{ total_count: 0, check_runs: [] }]))
  fs.writeFileSync(path.join(data, 'status.json'), asText(fixture.status ?? { state: 'pending', statuses: [] }))
  const log = path.join(dir, 'gh.log')

  fs.writeFileSync(
    path.join(fakes, 'git'),
    ['#!/bin/bash', 'if [ "$1 $2" = "rev-parse HEAD" ]; then echo "$FAKE_SHA"; exit 0; fi', 'exit 1', ''].join('\n'),
  )
  fs.writeFileSync(
    path.join(fakes, 'gh'),
    [
      '#!/bin/bash',
      'echo "$* token=${GH_TOKEN:-none}" >> "$FAKE_LOG"',
      'endpoint=""',
      'for arg in "$@"; do case "$arg" in repos/*) endpoint="$arg" ;; esac; done',
      'case "$endpoint" in',
      '  */pulls) kind=pulls ;;',
      '  */check-runs*) kind=check-runs ;;',
      '  */status*) kind=status ;;',
      '  *) echo "unexpected call: $*" >&2; exit 2 ;;',
      'esac',
      'if [ "${FAKE_FAIL:-}" = "$kind" ]; then echo "HTTP 403: Resource not accessible by integration" >&2; exit 1; fi',
      'cat "$FAKE_DATA/$kind.json"',
      '',
    ].join('\n'),
  )
  fs.chmodSync(path.join(fakes, 'git'), 0o755)
  fs.chmodSync(path.join(fakes, 'gh'), 0o755)
  const script = path.join(dir, 'step.sh')
  fs.writeFileSync(script, stepScript())

  const env: Record<string, string> = {
    PATH: [fakes, path.dirname(node.execPath), path.dirname(bash!), node.env.PATH ?? ''].join(path.delimiter),
    HOME: dir,
    GH_TOKEN: TOKEN,
    REPO,
    RUN_ID,
    RUNNER_TEMP: forBash(temp),
    FAKE_SHA: fixture.sha ?? SHA,
    FAKE_DATA: forBash(data),
    FAKE_LOG: forBash(log),
    FAKE_FAIL: fixture.fail ?? '',
  }
  if (node.platform === 'win32') {
    env.SYSTEMROOT = node.env.SYSTEMROOT ?? 'C:\\Windows'
    env.MSYSTEM = 'MSYS'
  }
  const result = await new Promise<{ status: number; stderr: string }>((resolve) => {
    child.execFile(
      bash!,
      ['--noprofile', '--norc', '-eo', 'pipefail', forBash(script)],
      { env, encoding: 'utf8', cwd: work, timeout: 120_000 },
      (error, _stdout, stderr) => resolve({ status: error ? Number(error.code ?? 1) || 1 : 0, stderr }),
    )
  })
  const out = path.join(temp, 'release', 'site', 'build.json')
  const written = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null
  return {
    result,
    written,
    json: written ? (JSON.parse(written) as Record<string, unknown>) : null,
    calls: fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : [],
    site: fs.readdirSync(path.join(temp, 'release', 'site')),
    cwd: fs.readdirSync(work),
  }
}

const merged = [
  { number: 70, merged_at: null, merge_commit_sha: 'f'.repeat(40), head: { sha: 'e'.repeat(40) } },
  { number: 71, merged_at: '2026-11-07T08:00:00Z', merge_commit_sha: SHA, head: { sha: HEAD } },
]

const prChecks = [
  {
    total_count: 4,
    check_runs: [
      checkRun('site-tests', 'completed', 'success'),
      checkRun('browser-tests', 'completed', 'failure'),
      checkRun('ios-safari', 'in_progress', null),
      // This deploy's own jobs are not results of the code it ships.
      checkRun('Deploy', 'in_progress', null, RUN_ID),
    ],
  },
  { total_count: 1, check_runs: [checkRun('verify', 'completed', 'skipped')] },
]

const ODD_NAMES = ['quote " and \' and `backtick`', '$(touch pwned) ${HOME}', 'line\nbreak\tand\u0007bell', 'x'.repeat(150)]

// Each scenario is one run of the step. They run side by side, as starting bash
// and Node is slow on Windows.
const SCENARIOS = {
  merged: {
    pulls: merged,
    checkRuns: prChecks,
    status: { state: 'success', statuses: [{ context: 'CodeRabbit', state: 'success' }] },
  },
  pushed: {
    pulls: [merged[0]],
    checkRuns: [{ total_count: 2, check_runs: [checkRun('site-tests', 'completed', 'success'), checkRun('Build', 'completed', 'success', RUN_ID)] }],
  },
  none: { pulls: [] },
  'pulls fails': { pulls: merged, checkRuns: prChecks, fail: 'pulls' },
  'check-runs fails': { pulls: merged, checkRuns: prChecks, fail: 'check-runs' },
  'status fails': { pulls: merged, checkRuns: prChecks, fail: 'status' },
  'check runs that are not JSON': { pulls: merged, checkRuns: 'not json at all' },
  'check runs that are not a list of pages': { pulls: merged, checkRuns: { message: 'Moved Permanently' } },
  'a status without its list': { pulls: merged, checkRuns: prChecks, status: { state: 'success' } },
  'pull requests that are not JSON': { pulls: '<html>', checkRuns: prChecks },
  'pull requests that are not a list': { pulls: { message: 'Not Found' }, checkRuns: prChecks },
  odd: {
    pulls: [],
    checkRuns: [{ total_count: 4, check_runs: ODD_NAMES.map((name) => checkRun(name, 'completed', 'success')) }],
    status: { state: 'failure', statuses: [{ context: 'odd', state: 'weird<state>' }] },
  },
  'no commit': { sha: 'not-a-sha' },
} satisfies Record<string, Fixture>

type Scenario = keyof typeof SCENARIOS
const ran = {} as Record<Scenario, Awaited<ReturnType<typeof runStep>>>

describe.skipIf(!bash)('running the build.json step', () => {
  let root = ''
  beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'build-info-'))
    const done = await Promise.all(
      (Object.entries(SCENARIOS) as [Scenario, Fixture][]).map(async ([name, fixture]) => [name, await runStep(root, name, fixture)] as const),
    )
    for (const [name, outcome] of done) ran[name] = outcome
  }, 300_000)
  afterAll(() => {
    if (root) fs.rmSync(root, { recursive: true, force: true })
  })

  it('records the checks on the pull request that was merged', () => {
    const { result, json, calls, site } = ran.merged
    expect(result.status, result.stderr).toBe(0)
    expect(site).toEqual(['build.json'])
    const parsed = parseBuildInfo(json)
    expect(parsed.ok, JSON.stringify(json)).toBe(true)
    expect(json).toMatchObject({ schema: 1, commit: SHA, shortCommit: SHA.slice(0, 7) })
    expect(Math.abs(Date.parse(json!.deployedAt as string) - Date.now())).toBeLessThan(600_000)
    expect(json!.checks).toEqual({
      state: 'read',
      ranOn: 'pull-request',
      results: [
        { name: 'browser-tests', result: 'failure' },
        { name: 'CodeRabbit', result: 'success' },
        { name: 'ios-safari', result: 'pending' },
        { name: 'site-tests', result: 'success' },
        { name: 'verify', result: 'skipped' },
      ],
    })
    // The checks were read for the pull request's head, with the job token.
    expect(calls.some((call) => call.includes(`commits/${HEAD}/check-runs`) && call.includes('--paginate'))).toBe(true)
    expect(calls.some((call) => call.includes(`commits/${HEAD}/status`))).toBe(true)
    expect(calls.every((call) => call.endsWith(`token=${TOKEN}`))).toBe(true)
  })

  it('names no account, repository or token, and links nowhere', () => {
    const { written } = ran.merged
    expect(written).not.toBeNull()
    for (const secret of [TOKEN, 'secret-owner', 'secret-repo', 'github.com', 'http']) expect(written).not.toContain(secret)
  })

  it('records the checks on the commit itself when no pull request was merged into it', () => {
    const { result, json, calls } = ran.pushed
    expect(result.status, result.stderr).toBe(0)
    expect(json!.checks).toEqual({ state: 'read', ranOn: 'commit', results: [{ name: 'site-tests', result: 'success' }] })
    expect(calls.some((call) => call.includes(`commits/${SHA}/check-runs`))).toBe(true)
  })

  it('says so when no checks ran', () => {
    const { json } = ran.none
    expect(json!.checks).toEqual({ state: 'none', ranOn: 'commit', results: [] })
    expect(parseBuildInfo(json).ok).toBe(true)
  })

  it.each([
    'pulls fails',
    'check-runs fails',
    'status fails',
    'check runs that are not JSON',
    'check runs that are not a list of pages',
    'a status without its list',
    'pull requests that are not JSON',
    'pull requests that are not a list',
  ] as const)('says the checks could not be read, and still deploys, on %s', (scenario) => {
    const { result, json } = ran[scenario]
    expect(result.status, result.stderr).toBe(0)
    expect(json).toMatchObject({ commit: SHA, checks: { state: 'unreadable', results: [] } })
    expect(parseBuildInfo(json).ok).toBe(true)
  })

  it('keeps an odd check name as plain text, and runs none of it', () => {
    const { result, json, site, cwd } = ran.odd
    expect(result.status, result.stderr).toBe(0)
    expect(site).toEqual(['build.json'])
    expect(cwd).toEqual([])
    const parsed = parseBuildInfo(json)
    expect(parsed.ok, JSON.stringify(json)).toBe(true)
    if (!parsed.ok) return
    const names = parsed.build.checks.results.map((check) => check.name)
    expect(names).toContain('quote " and \' and `backtick`')
    expect(names).toContain('$(touch pwned) ${HOME}')
    expect(names).toContain('line break and bell')
    expect(names.every((name) => name.length <= 100)).toBe(true)
    expect(parsed.build.checks.results.find((check) => check.name === 'odd')?.result).toBe('unknown')
  })

  it('refuses to write anything when it cannot tell which commit is going out', () => {
    const { result, written } = ran['no commit']
    expect(result.status).not.toBe(0)
    expect(written).toBeNull()
  })
})
