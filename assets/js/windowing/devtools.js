// Docker Desktop and FileZilla, shared by both builds. Both read their lists
// from data/devtools.json and change them only through these rules, so the
// two builds always show the same containers and files.

export function filterContainers(containers, query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return containers;
  return containers.filter((c) =>
    c.name.toLowerCase().includes(q) || c.image.toLowerCase().includes(q) || c.id.toLowerCase().includes(q),
  );
}

const ACTIONS = {
  start: (c) => (c.status === 'running' ? null : { status: 'running', statusLabel: 'Up 1 second' }),
  stop: (c) => (c.status === 'running' ? { status: 'exited', statusLabel: 'Exited (0) just now' } : null),
  restart: (c) => (c.status === 'running' ? { statusLabel: 'Up 1 second' } : null),
};

/**
 * The containers after `docker <action>` on one of them, with the command and
 * what Docker prints. Refused actions leave the list as it was, with an error.
 */
export function containerAction(containers, id, action) {
  const target = containers.find((c) => c.id === id);
  const command = `docker ${action} ${target?.name ?? id}`;
  if (!target) return { containers, command, output: [], error: `Error response from daemon: No such container: ${id}` };
  const patch = ACTIONS[action](target);
  if (!patch) {
    return { containers, command, output: [], error: `Error response from daemon: Container ${target.name} is not running` };
  }
  return {
    containers: containers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    command,
    output: [target.name],
    error: null,
  };
}

export function inspectContainer(container) {
  if (!container) return '{}';
  return JSON.stringify(
    {
      Id: container.id,
      Name: `/${container.name}`,
      Created: container.created,
      State: { Status: container.status, Running: container.status === 'running' },
      Config: { Image: container.image },
      NetworkSettings: { Ports: container.ports || {} },
    },
    null,
    2,
  );
}

/** What FileZilla logs as it connects. */
export function quickconnectLog(host, user, port, remotePath) {
  return [
    { type: 'command', text: `Command: open sftp://${user}@${host}:${port || 22}` },
    { type: 'status', text: `Status: Connecting to ${host}...` },
    { type: 'status', text: `Status: Using username "${user}".` },
    { type: 'status', text: `Status: Connected to ${host}` },
    { type: 'status', text: `Status: Retrieving directory listing of "${remotePath}"...` },
    { type: 'status', text: `Status: Directory listing of "${remotePath}" successful` },
  ];
}

export const transferSize = (entry) => (entry.type === 'dir' ? '' : entry.size.toLocaleString('en-GB'));

/** VS Code's terminal when it opens. */
export const VSCODE_TERMINAL_START = [
  { type: 'command', text: 'PS C:\\Users\\DeVante\\Projects> git status' },
  { type: 'info', text: 'On branch main' },
  { type: 'info', text: "Your branch is up to date with 'origin/main'." },
  { type: 'info', text: 'nothing to commit, working tree clean' },
];

/** The lines VS Code's Build button prints, one at a time. */
export function vscodeBuildLog(project) {
  return [
    { type: 'command', text: 'PS C:\\Users\\DeVante\\Projects> npm run build' },
    { type: 'info', text: '> vite build' },
    { type: 'info', text: 'transforming...' },
    { type: 'info', text: '✓ 248 modules transformed.' },
    { type: 'info', text: 'rendering chunks...' },
    { type: 'success', text: 'dist/assets/index.js   142.31 kB │ gzip: 46.02 kB' },
    { type: 'success', text: '✓ built in 1.84s' },
    { type: 'success', text: `Deployed ${project || 'the project'} to staging` },
  ];
}
