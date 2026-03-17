// assets/js/components/os/filesystem.js
window.osFileSystem = {
    'C:\\': [
        { name: 'Users', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Program Files', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Program Files (x86)', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Windows', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files': [
        { name: 'Adobe', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Docker', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Google', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Microsoft Office', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Microsoft VS Code', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'XAMPP', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files\\Adobe': [
        { name: 'photoshop.exe', type: 'app', app: 'photoshop', icon: window.portfolioConfig.imgPath + 'photoshop.webp' },
        { name: 'Adobe Premiere Pro 2024', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Adobe Illustrator 2024', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Adobe After Effects 2024', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files\\Google': [
        { name: 'Chrome', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files\\Google\\Chrome': [
        { name: 'Application', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files\\Google\\Chrome\\Application': [
        { name: 'chrome.exe', type: 'app', app: 'edge', icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'chrome_proxy.exe', type: 'file', icon: '⚙️' }
    ],
    'C:\\Program Files\\Microsoft VS Code': [
        { name: 'Code.exe', type: 'app', app: 'vscode', icon: window.portfolioConfig.imgPath + 'vscode.webp' },
        { name: 'bin', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'resources', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files\\Microsoft Office': [
        { name: 'root', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files\\Microsoft Office\\root': [
        { name: 'Office16', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files\\Microsoft Office\\root\\Office16': [
        { name: 'WINWORD.EXE', type: 'app', app: 'word', icon: window.portfolioConfig.imgPath + 'word.webp' },
        { name: 'EXCEL.EXE', type: 'app', app: 'excel', icon: window.portfolioConfig.imgPath + 'excel.webp' },
        { name: 'POWERPNT.EXE', type: 'app', app: 'powerpoint', icon: window.portfolioConfig.imgPath + 'powerpoint.webp' },
        { name: 'OUTLOOK.EXE', type: 'app', app: 'outlook', icon: window.portfolioConfig.imgPath + 'outlook.webp' }
    ],
    'C:\\Program Files\\Docker': [
        { name: 'Docker', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files\\Docker\\Docker': [
        { name: 'Docker Desktop.exe', type: 'file', icon: window.portfolioConfig.imgPath + 'docker.webp' },
        { name: 'resources', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files\\XAMPP': [
        { name: 'htdocs', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'mysql', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'php', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'xampp-control.exe', type: 'file', icon: '🧡' }
    ],
    'C:\\Program Files (x86)': [
        { name: 'FileZilla FTP Client', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Image-Line', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Notepad++', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'PuTTY', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files (x86)\\Image-Line': [
        { name: 'FL Studio 24', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files (x86)\\Notepad++': [
        { name: 'notepad++.exe', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp' },
        { name: 'plugins', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Program Files (x86)\\PuTTY': [
        { name: 'putty.exe', type: 'file', icon: window.portfolioConfig.imgPath + 'putty.webp' },
        { name: 'pscp.exe', type: 'file', icon: '⚙️' }
    ],
    'C:\\Program Files (x86)\\FileZilla FTP Client': [
        { name: 'filezilla.exe', type: 'app', app: 'filezilla', icon: window.portfolioConfig.imgPath + 'filezilla.webp' },
        { name: 'docs', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Windows': [
        { name: 'System32', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'SysWOW64', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Fonts', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Web', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Media', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Resources', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Windows\\System32': [
        { name: 'drivers', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'config', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'cmd.exe', type: 'app', app: 'terminal', icon: window.portfolioConfig.imgPath + 'terminal.webp' },
        { name: 'calc.exe', type: 'app', app: 'calculator', icon: window.portfolioConfig.imgPath + 'calculator.webp' },
        { name: 'Ssms.exe', type: 'app', app: 'database', icon: window.portfolioConfig.imgPath + 'mssql.webp' },
        { name: 'taskmgr.exe', type: 'app', app: 'taskmanager', icon: window.portfolioConfig.imgPath + 'taskmanager.webp' },
        { name: 'settings.exe', type: 'app', app: 'settings', icon: window.portfolioConfig.imgPath + 'settings.webp' },
        { name: 'eventvwr.exe', type: 'app', app: 'eventviewer', icon: window.portfolioConfig.imgPath + 'eventviewer.webp' }
    ],
    'C:\\Windows\\Web': [
        { name: 'Wallpaper', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Screen', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Windows\\Media': [
        { name: 'Windows Logon.wav', type: 'file', icon: '🎵' },
        { name: 'Windows Error.wav', type: 'file', icon: '🎵' },
        { name: 'Windows Background.wav', type: 'file', icon: '🎵' }
    ],
    'C:\\Windows\\Fonts': [
        { name: 'Segoe UI.ttf', type: 'file', icon: '🔤' },
        { name: 'Arial.ttf', type: 'file', icon: '🔤' },
        { name: 'Consolas.ttf', type: 'file', icon: '🔤' }
    ],
    'C:\\Windows\\Resources': [
        { name: 'Themes', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Windows\\Resources\\Themes': [
        { name: 'aero.theme', type: 'file', icon: '🎨' },
        { name: 'dark.theme', type: 'file', icon: '🎨' }
    ],
    'C:\\Users': [
        { name: 'DeVante', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Public', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante': [
        { name: 'Desktop', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/desktop.png' },
        { name: 'Documents', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/documents.png' },
        { name: 'Downloads', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/downloads.png' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/pictures.png' },
        { name: 'Projects', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Desktop': [
        { name: 'Projects', type: 'folder', path: 'C:\\Users\\DeVante\\Projects', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'CV - DeVanté Johnson-Rose.pdf', type: 'app', app: 'pdfreader', icon: window.portfolioConfig.imgPath + 'pdf.webp', extraData: { pdfUrl: window.portfolioConfig.basePath + 'data/cv.pdf' } },
        { name: 'achievements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: `KEY ACHIEVEMENTS:
- 2023 4 X NAGA World Champion
- 2023 IBJJF No-Gi Silver and Bronze Medalist
- AJP 4 X Grand Slam Champion
- IBJJF European Champion No-GI
- IBJJF Master European Champion Gi
- British Judo Silver Medalist

PROFILES:
- Smoothcomp: https://smoothcomp.com/en/profile/73838
- British Judo Squad: https://www.britishjudo.org.uk/wp-content/uploads/2024/10/British-Masters-Squad-2024-2025.pdf` },
        { name: 'SQL Server Management Studio', type: 'app', app: 'database', icon: window.portfolioConfig.imgPath + 'mssql.webp' },
        { name: 'VS Code', type: 'app', app: 'vscode', icon: window.portfolioConfig.imgPath + 'vscode.webp' },
        { name: 'Chrome', type: 'app', app: 'edge', icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'Outlook', type: 'app', app: 'outlook', icon: window.portfolioConfig.imgPath + 'outlook.webp' },
        { name: 'Terminal', type: 'app', app: 'terminal', icon: window.portfolioConfig.imgPath + 'terminal.webp' },
        { name: 'FL Studio 24', type: 'app', app: 'flstudio', icon: window.portfolioConfig.imgPath + 'fl studio.webp' },
        { name: 'Recycle Bin', type: 'folder', path: 'C:\\Recycle Bin', icon: window.portfolioConfig.imgPath + 'recyclebinempty.webp' }
    ],
    'C:\\Users\\DeVante\\Documents': [
        { name: 'Career', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'CV - DeVanté Johnson-Rose.pdf', type: 'app', app: 'pdfreader', icon: window.portfolioConfig.imgPath + 'pdf.webp', pdfUrl: window.portfolioConfig.basePath + 'data/cv.pdf' }
    ],
    'C:\\Users\\DeVante\\Documents\\Career': [
        { name: 'Killik and Co', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'UEA', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Skyscanner', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Shawbrook Bank', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'FRP Advisory', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Certificates', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Documents\\Career\\Killik and Co': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: '2nd Line Engineer for Killik and Co. Work with SQL databases, Docker, Postman, running stored procedures, updating the db where needed troubleshooting, creating technical guides and providing training.' }
    ],
    'C:\\Users\\DeVante\\Documents\\Career\\UEA': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'Hired to provide 3rd line support and create the desktop experience for staff and students. Responsible for >8000 devices via SCCM and JAMF. Provisioning servers and patching vulnerabilities. Service ended April 2025.' }
    ],
    'C:\\Users\\DeVante\\Documents\\Career\\Skyscanner': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'Joined during lockdown. Implemented global heat-sensing CCTV system. Managed MacBook deployments via JAMF and HPs via SCCM. Upgraded firewalls.' }
    ],
    'C:\\Users\\DeVante\\Documents\\Career\\Shawbrook Bank': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'Promoted to Desk Side Engineer. Imaging and deploying machines using SCCM. PowerShell scripting and Active Directory administration. Managed GPOs.' }
    ],
    'C:\\Users\\DeVante\\Documents\\Career\\FRP Advisory': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: '2nd Line Engineer providing remote/desk side support. Extracted 200TB of data from BHS. Involved in digital forensics and P2V migrations.' }
    ],
    'C:\\Users\\DeVante\\Documents\\Career\\Certificates': [
        { name: 'MCSA_Windows_7.pdf', type: 'app', app: 'pdfreader', icon: window.portfolioConfig.imgPath + 'pdf.webp' },
        { name: 'CompTIA_Network_Plus.pdf', type: 'app', app: 'pdfreader', icon: window.portfolioConfig.imgPath + 'pdf.webp' },
        { name: 'ITIL_Foundation.pdf', type: 'app', app: 'pdfreader', icon: window.portfolioConfig.imgPath + 'pdf.webp' }
    ],
    'C:\\Users\\DeVante\\Pictures': [
        { name: 'AJP Grand Slam 2024.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.imgPath + 'AJP Grand Slam 2024.webp' },
        { name: 'Allstars UK Nationals.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.imgPath + 'Allstars UK Nationals.webp' },
        { name: 'IBJJF European No-Gi 2023.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.imgPath + 'IBJJF European No-Gi 2023.webp' },
        { name: 'IBJJF No-Gi World Championships 2023.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.imgPath + 'IBJJF No-Gi World Championships 2023.webp' },
        { name: 'IBJJF World Championships 2022.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.imgPath + 'IBJJF World Championships 2022.webp' },
        { name: 'NAGA World Championships 2023.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.imgPath + 'NAGA World Championships 2023.webp' }
    ],
    'C:\\Recycle Bin': [
        { name: 'Easter Egg - Drone Footage.mp4', type: 'video', icon: '🎬', url: 'https://assets.mixkit.co/videos/preview/mixkit-drone-view-of-a-serene-lake-and-mountains-4318-large.mp4', originalPath: 'C:\\Users\\DeVante\\Desktop' }
    ],
    'C:\\Users\\DeVante\\Projects': [
        { name: 'Freelance', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Killik and Co', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'UEA', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Skyscanner', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Shawbrook Bank', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'FRP Advisory', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Ontraq IT', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance': [
        { name: 'English Open BJJ', type: 'folder', status: '✅', techStack: 'PHP, Tailwind, Alpine, HTMX, OpenAI', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Bay Motors', type: 'folder', status: '✅', techStack: 'PHP, Tailwind, Alpine, HTMX', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'CPT Tours', type: 'folder', status: '✅', techStack: 'PHP, Tailwind, Alpine, HTMX, MySQL', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'EKBJJ', type: 'folder', status: '✅', techStack: 'PHP, Tailwind, Alpine, HTMX, OpenAI', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'BJJ Havering', type: 'folder', status: '✅', techStack: 'PHP, Tailwind, Alpine, HTMX, OpenAI', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'BHR Recovery', type: 'folder', status: '✅', techStack: 'PHP, Tailwind, Alpine, HTMX, WhatsApp', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Youngs Construction', type: 'folder', status: '✅', techStack: 'PHP, Tailwind, Alpine, HTMX', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Euro-Goat', type: 'folder', status: '✅', techStack: 'PHP, Tailwind, Alpine, HTMX, Three.js', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Hameedahs Delights', type: 'folder', status: '✅', techStack: 'PHP, Tailwind, Alpine, HTMX', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Boulevard Logistics', type: 'folder', status: '✅', techStack: 'Custom Software, PHP, Logistics, FinTech', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Killik and Co': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: '2nd Line Engineer for Killik and Co.\n\nKey Responsibilities:\n- Managing SQL databases and Docker environments.\n- Postman API testing and running stored procedures.\n- DB updates and complex technical troubleshooting.\n- Creating technical guides and providing staff training.' },
        { name: 'references.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\UEA': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'Desktop Developer / 3rd Line Engineer.\n\nKey Achievements:\n- Created the desktop experience for staff and students.\n- Responsible for >8000 devices via SCCM and JAMF.\n- provisioning servers and patching vulnerabilities.\n- Project end: April 2025.' },
        { name: 'references.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\Skyscanner': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'System Engineer 2.\n\nKey Projects:\n- Implemented global heat-sensing CCTV system during lockdown.\n- Managed MacBook deployments via JAMF.\n- Managed HP fleet via SCCM.\n- Upgraded corporate firewalls.' },
        { name: 'references.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\Shawbrook Bank': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'Desk Side Engineer.\n\nHighlights:\n- Promoted from Service Desk.\n- Full cycle imaging and deployment using SCCM.\n- Extensive PowerShell scripting for automation.\n- Active Directory & GPO administration.' },
        { name: 'references.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\FRP Advisory': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: '2nd Line Engineer.\n\nCore Tasks:\n- Remote and desk side support.\n- Digital Forensics: Extracted 200TB data from BHS.\n- Handled complex P2V migrations.' },
        { name: 'references.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\Ontraq IT': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'IT Support Engineer.\n\nScope:\n- Field engineering for high-profile clients.\n- Supported British Transport Police and various legal firms.' },
        { name: 'references.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\English Open BJJ': [
        { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://englishopenbjjchampionships.co.uk/' }, icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'requirements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'REQUIREMENTS:\n- Showcase the prestige of the English Open BJJ Championships.\n- Highlight previous champions and event highlights.\n- Seamless integration with Smoothcomp for registrations.\n- User-friendly, intuitive interface.' },
        { name: 'plan.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'PLAN:\n- Build lightweight site with high Lighthouse/SEO scores.\n- Optimise assets (WebP/WebM) for mobile-first performance.\n- Implement JS Weight Class Finder (Imperial/Metric).\n- Train AI Chatbot on FAQs and IBJJF ruleset.\n- Create clear CTA pathways to Smoothcomp.' },
        { name: 'outcome.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'OUTCOME:\n- Largest competitor turnout in event history.\n- Significant reduction in manual admin tasks.\n- Massive growth in web traffic via SEO optimization.' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\English Open BJJ\\Pictures': [
        { name: 'Desktop UI.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.basePath + 'portfolio/englishopenbjj.webp' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\Bay Motors': [
        { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://www.baymotors.co.uk/' }, icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'requirements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'REQUIREMENTS:\n- Establish first digital presence for trusted local garage.\n- Automate booking process to reduce phone dependency.\n- Prevent lost revenue from missed calls during peak hours.' },
        { name: 'plan.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'PLAN:\n- Build SEO-focussed site with dedicated service pages.\n- Integrate car registration API for automated data retrieval.\n- Create formatted email notification system for bookings.\n- Showcase high-end project gallery to build trust.' },
        { name: 'outcome.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'OUTCOME:\n- Reached #1 on Google for local searches within 3 weeks.\n- Maintained top position and significantly increased traffic.\n- Drastic increase in new customer bookings.' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\Bay Motors\\Pictures': [
        { name: 'Desktop UI.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.basePath + 'portfolio/baymotors.webp' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\CPT Tours': [
        { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://cpttours.co.za/' }, icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'requirements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'REQUIREMENTS:\n- Bypass high GetYourGuide commission fees.\n- Enable direct, easy booking for international travelers.\n- Build independent brand credibility.' },
        { name: 'plan.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'PLAN:\n- Integrate Google Places API for verified reviews.\n- Link system to WhatsApp for real-time booking alerts.\n- Integrate Calendar API for visual booking management.\n- Build custom Headless CMS for blogs and tour management.\n- Implement secure Google OAuth authentication.' },
        { name: 'outcome.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'OUTCOME:\n- First direct booking within 9 days of launch.\n- Drastically reduced reliance on 3rd party platforms.\n- Streamlined operations via integrated calendar.' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\CPT Tours\\Pictures': [
        { name: 'Desktop UI.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.basePath + 'portfolio/cpttours.webp' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\EKBJJ': [
        { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://ekbjj.com/' }, icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'requirements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'REQUIREMENTS:\n- Rescue site from bad state after developer went AWOL.\n- Modernise outdated UI and optimise for mobile.\n- Consolidate 12 dormant domains into one platform.' },
        { name: 'plan.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'PLAN:\n- Build modern, lightweight Headless CMS with RBAC.\n- Integrate SumUp API for secure class bookings.\n- Automate podcast/video updates via Spotify & YouTube.\n- Implement 301 redirects for all dormant domains.\n- Deploy AI Chatbot for 24/7 lead capture and triaging.' },
        { name: 'outcome.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'OUTCOME:\n- Huge increase in trial classes and Gi hire bookings.\n- Improved local SEO rankings.\n- Significant reduction in administrative overhead.' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\EKBJJ\\Pictures': [
        { name: 'Desktop UI.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.basePath + 'portfolio/ekbjjdesktop.webp' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\BJJ Havering': [
        { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://bjjhavering.co.uk/' }, icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'requirements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'REQUIREMENTS:\n- Modernise non-responsive site after developer disappeared.\n- Create fresh digital presence for competitive market.\n- Increase online lead generation for academy.' },
        { name: 'plan.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'PLAN:\n- Mobile-first redesign with high-performance metrics.\n- Build automated enrollment workflows.\n- Implement local SEO strategy for martial arts keywords.\n- Deploy AI FAQ system for student triaging.' },
        { name: 'outcome.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'OUTCOME:\n- Achieved #1 local Google ranking.\n- 50% increase in monthly student enrollments.\n- Operational efficiency improved via automated bookings.' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\BJJ Havering\\Pictures': [
        { name: 'Desktop UI.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.basePath + 'portfolio/wolvesbjj.webp' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\BHR Recovery': [
        { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://bhrrecovery.co.uk/' }, icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'requirements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'REQUIREMENTS:\n- Establish first digital presence for local recovery service.\n- Appeal to specific geographic areas in the community.' },
        { name: 'plan.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'PLAN:\n- Create full company branding, logo, and guidelines.\n- Build high-converting site with dedicated area landing pages.\n- Optimise for hyper-local SEO.\n- Design and print integrated business cards.' },
        { name: 'outcome.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'OUTCOME:\n- Rapid deployment: Site live within 4 hours of contact.\n- Full project (Branding + Site) turned around in 72 hours.\n- Immediate increase in local service calls.' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\BHR Recovery\\Pictures': [
        { name: 'Desktop UI.webp', type: 'image', icon: '🖼️', url: 'https://picsum.photos/seed/recovery_desk/1920/1080' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\Youngs Construction': [
        { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://youngsconstructionltd.co.uk/' }, icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'requirements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'REQUIREMENTS:\n- Modernise outdated site that was failing to generate leads.\n- Replace stock imagery with authentic project showcases.\n- Build high-trust professional digital portal.' },
        { name: 'plan.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'PLAN:\n- Capture 4K drone photography of major flats project.\n- Create and embed 360-degree virtual project tours.\n- Build interactive 3D house wireframes using Three.js.\n- Optimise site structure for construction-specific SEO.' },
        { name: 'outcome.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'OUTCOME:\n- Drastic increase in average time-on-site.\n- Measurable growth in high-value project inquiries.' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\Youngs Construction\\Pictures': [
        { name: 'Desktop UI.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.basePath + 'portfolio/youngsconstructiondesktop.webp' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\Euro-Goat': [
        { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://euro-goat.com/' }, icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'requirements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'REQUIREMENTS:\n- Launch first digital presence for niche mobile mechanic.\n- Transition from word-of-mouth to high-volume lead gen.' },
        { name: 'plan.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'PLAN:\n- Build high-converting expertise-led website.\n- Use interactive 3D car models for specialist vehicle types.\n- Optimise high-poly OBJ files for mobile performance.\n- Local New Jersey SEO strategy deployment.' },
        { name: 'outcome.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'OUTCOME:\n- Ranked #1 in New Jersey for mobile European mechanics.\n- Consistent volume of high-quality bookings.' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\Euro-Goat\\Pictures': [
        { name: 'Desktop UI.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.basePath + 'portfolio/eurogoatdesktop.webp' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\Hameedahs Delights': [
        { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://hameedahsdelights.com/' }, icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'requirements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'REQUIREMENTS:\n- Scale from social media to a professional corporate portal.\n- Appeal to large business orders and event catering.\n- Automated booking and inquiry management.' },
        { name: 'plan.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'PLAN:\n- Build custom specification form with photo upload capability.\n- Implement full interactive menu with auto-pricing engine.\n- Link instant booking notifications to WhatsApp.\n- Synchronise GMB profile and social media lead flows.' },
        { name: 'outcome.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'OUTCOME:\n- First major booking within 24 hours of launch.\n- Significant increase in professional visibility.\n- Scalable digital presence for business growth.' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\Hameedahs Delights\\Pictures': [
        { name: 'Desktop UI.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.basePath + 'portfolio/sweetdelights.webp' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\Boulevard Logistics': [
        { name: 'Visit Site.url', type: 'app', app: 'edge', extraData: { initialUrl: 'https://boulevardlogistics.co.uk/' }, icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'requirements.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'REQUIREMENTS:\n- Custom pricing engine to replace complex spreadsheets.\n- Multi-variable calculation (fuel surcharge, pallet count, weight, distance).\n- Automated customer payment integration.\n- Streamlined operational workflow.' },
        { name: 'plan.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'PLAN:\n1. Audit existing spreadsheet variables and logic.\n2. Design database schema for logistics tracking.\n3. Build calculation engine using PHP.\n4. Integrate payment gateway (Stripe/GoCardless).\n5. Beta testing with internal ops team.' },
        { name: 'outcome.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'OUTCOME:\n- Eliminated manual spreadsheet updates.\n- 75% reduction in administrative booking time.\n- Streamlined financial reconciliation workflow.' },
        { name: 'Pictures', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
    ],
    'C:\\Users\\DeVante\\Projects\\Freelance\\Boulevard Logistics\\Pictures': [
        { name: 'Desktop UI.webp', type: 'image', icon: '🖼️', url: window.portfolioConfig.basePath + 'portfolio/boulevardlogistics.webp' }
    ]
};
