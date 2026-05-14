import { useState } from 'react'

interface SavedSession {
  name: string
  host: string
}

const SAVED: SavedSession[] = [
  { name: 'Default Settings', host: '' },
  { name: 'devante-homelab', host: '192.168.1.42' },
  { name: 'cloud-prod-eu', host: 'prod-eu.example.com' },
  { name: 'staging-uk', host: 'staging.example.co.uk' },
]

// PuTTY connection dialog — pure cosmetic, but the form remembers state and
// shows a faux terminal when "Open" is clicked.
export default function Putty() {
  const [host, setHost] = useState('')
  const [port, setPort] = useState(22)
  const [connected, setConnected] = useState<string | null>(null)
  const [selectedSaved, setSelectedSaved] = useState<string>('Default Settings')

  const connect = () => {
    if (!host) return
    setConnected(host)
  }

  if (connected) {
    return (
      <div className="h-full flex flex-col bg-[#0c0c0c] text-[#00ff66] font-mono text-xs">
        <div className="h-6 bg-[#1a1a1a] flex items-center px-3 shrink-0 text-[10px] text-gray-400">
          {connected}:{port} — PuTTY
        </div>
        <div className="flex-grow p-3 whitespace-pre-wrap leading-relaxed">
          {`Connecting to ${connected}:${port}...
Using username "devante".
Last login: ${new Date().toLocaleString()}

Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 6.8.0-49-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com

System load:  0.42                Processes:               148
Usage of /:   38.2% of 461.04GB   Users logged in:         1
Memory usage: 24%                 IPv4 address for ens33:  ${connected}
Swap usage:   0%

devante@${connected}:~$ `}
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#f0f0f0] text-black select-none">
      <div className="h-6 bg-[#0a246a] text-white text-xs flex items-center px-2 shrink-0">
        <img src="/assets/img/putty.webp" alt="" className="w-3 h-3 mr-2" />
        PuTTY Configuration
      </div>

      <div className="flex-grow flex min-h-0">
        <div className="w-48 bg-white border-r border-gray-400 overflow-y-auto shrink-0 p-2">
          <div className="text-[10px] font-bold mb-1">Category:</div>
          <ul className="text-[11px] space-y-0.5">
            <li className="bg-[#316ac5] text-white px-1">Session</li>
            <li className="px-1 hover:bg-gray-100">Logging</li>
            <li className="font-bold mt-2">Terminal</li>
            <li className="px-1 hover:bg-gray-100">Keyboard</li>
            <li className="px-1 hover:bg-gray-100">Bell</li>
            <li className="px-1 hover:bg-gray-100">Features</li>
            <li className="font-bold mt-2">Window</li>
            <li className="px-1 hover:bg-gray-100">Appearance</li>
            <li className="font-bold mt-2">Connection</li>
            <li className="px-1 hover:bg-gray-100">SSH</li>
          </ul>
        </div>

        <div className="flex-grow p-4 space-y-3 text-xs bg-[#ece9d8]">
          <div className="font-bold border-b border-gray-400 pb-1">
            Basic options for your PuTTY session
          </div>

          <div className="space-y-2">
            <div className="font-medium">Specify the destination you want to connect to</div>
            <div className="flex items-center space-x-2">
              <label className="w-24">Host Name (or IP address)</label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="flex-grow bg-white border border-gray-500 px-2 py-0.5"
              />
              <label className="ml-3">Port</label>
              <input
                type="number"
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-16 bg-white border border-gray-500 px-2 py-0.5"
              />
            </div>
            <div className="flex items-center space-x-3 mt-1">
              <span>Connection type:</span>
              {['SSH', 'Telnet', 'Rlogin', 'Serial'].map((t) => (
                <label key={t} className="flex items-center space-x-1">
                  <input type="radio" name="conn" defaultChecked={t === 'SSH'} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-3">
            <div className="font-medium">Load, save, or delete a stored session</div>
            <div className="flex space-x-3">
              <div className="flex-grow border border-gray-500 bg-white p-1 space-y-0.5">
                {SAVED.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    onClick={() => {
                      setSelectedSaved(s.name)
                      setHost(s.host)
                    }}
                    className={`w-full text-left px-2 py-0.5 ${
                      selectedSaved === s.name ? 'bg-[#316ac5] text-white' : 'hover:bg-gray-100'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                {['Load', 'Save', 'Delete'].map((b) => (
                  <button
                    key={b}
                    type="button"
                    className="w-20 py-0.5 bg-[#ece9d8] border border-gray-500 hover:bg-gray-200"
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4 mt-auto">
            <button
              type="button"
              onClick={connect}
              disabled={!host}
              className="w-24 py-1 bg-[#ece9d8] border border-gray-700 font-semibold hover:bg-gray-200 disabled:opacity-50"
            >
              Open
            </button>
            <button
              type="button"
              className="w-24 py-1 bg-[#ece9d8] border border-gray-500 hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
