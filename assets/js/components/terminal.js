document.addEventListener('alpine:init', () => {
    Alpine.data('terminalApp', () => ({
        input: '',
        history: [],
        cmdHistory: [],
        historyIdx: -1,
        currentPath: 'C:\\Users\\DeVante',
        
        init() {
            this.$nextTick(() => {
                const el = this.$refs.terminalInput;
                if (el) el.focus();
            });
        },

        handleKey(e) {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.cmdHistory.length > 0) {
                    this.historyIdx = Math.min(this.historyIdx + 1, this.cmdHistory.length - 1);
                    this.input = this.cmdHistory[this.cmdHistory.length - 1 - this.historyIdx];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIdx > 0) {
                    this.historyIdx--;
                    this.input = this.cmdHistory[this.cmdHistory.length - 1 - this.historyIdx];
                } else {
                    this.historyIdx = -1;
                    this.input = '';
                }
            }
        },

        async handlePaste(e) {
            // Standard paste handles itself, but we can intercept for custom logic if needed
        },

        handleContextMenu(e) {
            e.preventDefault();
            navigator.clipboard.readText().then(text => {
                this.input += text;
            });
        },

        execute() {
            const rawCmd = this.input;
            const cmd = this.input.trim();
            this.historyIdx = -1;
            
            if (!cmd) {
                this.history.push({ cmd: '', path: this.currentPath, res: '' });
                this.input = '';
                return;
            }

            this.cmdHistory.push(cmd);
            if (this.cmdHistory.length > 50) this.cmdHistory.shift();
            
            // Send telemetry for terminal command
            Alpine.store('os').sendTelemetry('Terminal Command', { command: cmd, path: this.currentPath });

            let res = '';
            const parts = cmd.split(' ');
            const base = parts[0].toLowerCase();
            const args = parts.slice(1);
            
            switch (base) {
                case 'help':
                    res = 'Available commands:\n  help      - Show this help message\n  whoami    - Display current user\n  dir / ls  - List directory contents\n  cd        - Change directory\n  pwd       - Print working directory\n  ver       - Show OS version\n  date      - Display current date\n  echo      - Display a line of text\n  cls/clear - Clear terminal screen\n  open      - Open an app\n  ping      - Ping a host\n  ipconfig  - Show network config\n  systeminfo- Show system information\n  exit      - Close terminal\n\nPortfolio Commands:\n  about     - About this OS\n  projects  - List portfolio projects\n  contact   - Display contact info';
                    break;
                case 'whoami':
                    res = 'johnson-rose\\devante';
                    break;
                case 'ver':
                    res = 'Microsoft Windows [Version 10.0.22631.3007]';
                    break;
                case 'pwd':
                    res = this.currentPath;
                    break;
                case 'date':
                    res = 'The current date is: ' + new Date().toLocaleDateString('en-GB', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
                    break;
                case 'time':
                    res = 'The current time is: ' + new Date().toLocaleTimeString();
                    break;
                case 'echo':
                    res = args.join(' ');
                    break;
                case 'dir':
                case 'ls':
                    const files = Alpine.store('os').fileSystem[this.currentPath] || [];
                    if (files.length === 0) {
                        res = 'Directory is empty.';
                    } else {
                        res = ' Directory of ' + this.currentPath + '\n\n';
                        files.forEach(f => {
                            const type = f.type === 'folder' ? '<DIR>' : '     ';
                            res += `01/02/2026  12:00 PM    ${type}          ${f.name}\n`;
                        });
                        res += `               ${files.length} File(s)`;
                    }
                    break;
                case 'cd':
                    const target = args[0];
                    if (!target || target === '.') break;
                    if (target === '..') {
                        const parts = this.currentPath.split('\\');
                        if (parts.length > 1) {
                            // Don't go above C:\
                            if (parts.length === 2 && parts[1] === '') break; 
                            this.currentPath = parts.slice(0, -1).join('\\') || 'C:\\';
                        }
                    } else {
                        const files = Alpine.store('os').fileSystem[this.currentPath] || [];
                        const folder = files.find(f => f.type === 'folder' && f.name.toLowerCase() === target.toLowerCase());
                        if (folder) {
                            this.currentPath = (this.currentPath.endsWith('\\') ? this.currentPath : this.currentPath + '\\') + folder.name;
                        } else {
                            res = 'The system cannot find the path specified.';
                        }
                    }
                    break;
                case 'systeminfo':
                    res = 'Host Name:           DEV-PORTFOLIO\nOS Name:             Microsoft Windows 11 Pro\nOS Version:          10.0.22631 N/A Build 22631\nSystem Type:         x64-based PC\nProcessor(s):        1 Processor(s) Installed.\n                     [01]: Intel64 Family 6 Model 158 Stepping 10 GenuineIntel ~3600 Mhz';
                    break;
                case 'about':
                    res = 'DeVante Johnson-Rose | Portfolio OS\nVersion: 1.2.0\nBuilt with: PHP, HTMX, Tailwind, Alpine.js\nSystem: Windows 11 Simulation Engine\n\nOptimised for all breakpoints.\nFeaturing interactive desktop, draggable icons, and functional Recycle Bin.';
                    break;
                case 'ping':
                    const host = args[0] || 'localhost';
                    const ip = '127.0.0.1';
                    res = `Pinging ${host} [${ip}] with 32 bytes of data:\nReply from ${ip}: bytes=32 time<1ms TTL=128\nReply from ${ip}: bytes=32 time<1ms TTL=128\nReply from ${ip}: bytes=32 time<1ms TTL=128\nReply from ${ip}: bytes=32 time<1ms TTL=128\n\nPing statistics for ${ip}:\n    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)`;
                    break;
                case 'ipconfig':
                    res = 'Windows IP Configuration\n\nEthernet adapter Ethernet:\n   Connection-specific DNS Suffix  . : \n   IPv4 Address. . . . . . . . . . . : 192.168.1.15\n   Subnet Mask . . . . . . . . . . . : 255.255.255.0\n   Default Gateway . . . . . . . . . : 192.168.1.1';
                    break;
                case 'projects':
                    res = 'Portfolio Projects:\n- English Open BJJ\n- Bay Motors\n- CPT Tours\n- EKBJJ\n- BJJ Havering\n- BHR Recovery\n- Youngs Construction\n- Euro-Goat\n- Hameedahs Delights\n\nType "open chrome" to view details.';
                    break;
                case 'contact':
                    res = 'Contact DeVante:\nEmail: ' + Alpine.store('os').settings.email + '\nGitHub: github.com/devantejr';
                    break;
                case 'cls':
                case 'clear':
                    this.history = [];
                    this.input = '';
                    return;
                case 'exit':
                    const win = Alpine.store('os').windows.find(w => w.app === 'terminal');
                    if (win) Alpine.store('os').closeWindow(win.id);
                    return;
                case 'open':
                    const app = args[0] === 'edge' ? 'edge' : (args[0] === 'chrome' ? 'edge' : args[0]);
                    if (app) {
                        Alpine.store('os').openApp(app);
                        res = `Attempting to open ${app}...`;
                    } else {
                        res = 'Usage: open <app_name>';
                    }
                    break;
                default:
                    res = `'${base}' is not recognized as an internal or external command, operable program or batch file.`;
            }
            
            this.history.push({ cmd: rawCmd, path: this.currentPath, res });
            this.input = '';
            
            this.$nextTick(() => {
                const output = this.$refs.terminalOutput;
                if (output) output.scrollTop = output.scrollHeight;
            });
        }
    }));
});
