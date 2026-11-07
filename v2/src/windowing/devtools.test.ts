import { describe, it, expect } from 'vitest'
import {
  containerAction,
  filterContainers,
  inspectContainer,
  quickconnectLog,
  transferSize,
  type DockerContainer,
} from '../../../assets/js/windowing/devtools.js'
import devtools from '../../../data/devtools.json'

// Docker Desktop and FileZilla in both builds read data/devtools.json and
// change it through these rules, so the two builds always list the same things.

const containers = devtools.docker.containers as DockerContainer[]

describe('data/devtools.json', () => {
  it('lists the containers, images and volumes once, for both builds', () => {
    expect(containers.length).toBeGreaterThan(0)
    for (const c of containers) {
      expect(devtools.docker.images.some((i) => `${i.name}:${i.tag}` === c.image)).toBe(true)
    }
  })

  it('gives FileZilla a Windows local path, not a Mac one', () => {
    expect(devtools.filezilla.localPath).toMatch(/^C:\\/)
    expect(JSON.stringify(devtools)).not.toMatch(/Applications\/XAMPP/)
  })
})

describe('containers', () => {
  it('finds containers by name, image or id, whatever the case', () => {
    expect(filterContainers(containers, 'MARIADB').map((c) => c.name)).toEqual(['mariadb-portfolio'])
    expect(filterContainers(containers, 'alpine').length).toBeGreaterThan(1)
    expect(filterContainers(containers, '  ')).toEqual(containers)
    expect(filterContainers(containers, 'nothing-like-this')).toEqual([])
  })

  it('starts a stopped container and prints the command', () => {
    const stopped = containers.find((c) => c.status !== 'running')!
    const out = containerAction(containers, stopped.id, 'start')
    expect(out.containers.find((c) => c.id === stopped.id)).toMatchObject({ status: 'running', statusLabel: 'Up 1 second' })
    expect(out.command).toBe(`docker start ${stopped.name}`)
    expect(out.output).toEqual([stopped.name])
    expect(containers.find((c) => c.id === stopped.id)!.status).not.toBe('running')
  })

  it('stops and restarts a running container', () => {
    const running = containers.find((c) => c.status === 'running')!
    expect(containerAction(containers, running.id, 'stop').containers.find((c) => c.id === running.id)).toMatchObject({
      status: 'exited',
      statusLabel: 'Exited (0) just now',
    })
    expect(containerAction(containers, running.id, 'restart').command).toBe(`docker restart ${running.name}`)
  })

  it('refuses what Docker refuses, with its error', () => {
    const stopped = containers.find((c) => c.status !== 'running')!
    const out = containerAction(containers, stopped.id, 'stop')
    expect(out.containers).toBe(containers)
    expect(out.error).toMatch(/is not running/)
    expect(containerAction(containers, 'missing', 'start').error).toMatch(/No such container/)
  })

  it('inspects a container as JSON', () => {
    const json = JSON.parse(inspectContainer(containers[0]))
    expect(json).toMatchObject({ Id: containers[0].id, Name: `/${containers[0].name}`, Config: { Image: containers[0].image } })
    expect(inspectContainer(null)).toBe('{}')
  })
})

describe('FileZilla', () => {
  it('logs a quick connection to the host and folder given', () => {
    const log = quickconnectLog('example.com', 'devante', 22, '/home/devante/public_html')
    expect(log[0]).toEqual({ type: 'command', text: 'Command: open sftp://devante@example.com:22' })
    expect(log.at(-1)).toEqual({ type: 'status', text: 'Status: Directory listing of "/home/devante/public_html" successful' })
  })

  it('uses port 22 when none is given', () => {
    expect(quickconnectLog('example.com', 'devante', '', '/')[0].text).toContain(':22')
  })

  it('shows sizes in bytes, and nothing for a folder', () => {
    expect(transferSize({ type: 'file', size: 4210 })).toBe('4,210')
    expect(transferSize({ type: 'dir', size: 0 })).toBe('')
  })
})
