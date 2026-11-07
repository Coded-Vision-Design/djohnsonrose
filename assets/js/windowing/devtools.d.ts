export interface DockerContainer {
  id: string
  name: string
  image: string
  status: 'running' | 'exited'
  statusLabel: string
  ports: string
  created: string
  logs: string[]
}

export interface ContainerActionResult {
  containers: DockerContainer[]
  command: string
  output: string[]
  error: string | null
}

export interface LogLine {
  type: 'command' | 'status' | 'error'
  text: string
}

export function filterContainers(containers: DockerContainer[], query: string): DockerContainer[]
export function containerAction(
  containers: DockerContainer[],
  id: string,
  action: 'start' | 'stop' | 'restart',
): ContainerActionResult
export function inspectContainer(container: DockerContainer | null | undefined): string
export function quickconnectLog(host: string, user: string, port: number | string, remotePath: string): LogLine[]
export function transferSize(entry: { type: string; size: number }): string

export interface BuildLine {
  type: 'command' | 'info' | 'success' | 'error'
  text: string
}

export const VSCODE_TERMINAL_START: BuildLine[]
export function vscodeBuildLog(project: string | null | undefined): BuildLine[]
