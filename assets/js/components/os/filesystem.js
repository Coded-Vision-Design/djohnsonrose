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
- British Judo Squad, Veteran category
- High Sheriff of Essex Award, Volunteer child mentor (Lads Need Dads)

PROFILES:
- Smoothcomp: https://smoothcomp.com/en/profile/73838
- British Judo Squad: https://www.britishjudo.org.uk/wp-content/uploads/2024/10/British-Masters-Squad-2024-2025.pdf` },
        { name: 'SQL Server Management Studio', type: 'app', app: 'database', icon: window.portfolioConfig.imgPath + 'mssql.webp' },
        { name: 'VS Code', type: 'app', app: 'vscode', icon: window.portfolioConfig.imgPath + 'vscode.webp' },
        { name: 'Chrome', type: 'app', app: 'edge', icon: window.portfolioConfig.imgPath + 'chrome.webp' },
        { name: 'Outlook', type: 'app', app: 'outlook', icon: window.portfolioConfig.imgPath + 'outlook.webp' },
        { name: 'Terminal', type: 'app', app: 'terminal', icon: window.portfolioConfig.imgPath + 'terminal.webp' },
        { name: 'FL Studio 24', type: 'app', app: 'flstudio', icon: window.portfolioConfig.imgPath + 'fl studio.webp' },
        // Cross-build switch — taskbar React/PHP toggle is hidden on mobile,
        // so the same shortcut lives on the Desktop. Handled by openItem's
        // 'link' branch below.
        { name: 'React Build', type: 'link', url: '/v2/', icon: window.portfolioConfig.imgPath + 'react.png' },
        { name: 'Recycle Bin', type: 'folder', path: 'C:\\Recycle Bin', icon: window.portfolioConfig.imgPath + 'recyclebinempty.webp' }
    ],
    'C:\\Users\\DeVante\\Documents': [
        { name: 'Career', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'CV - DeVanté Johnson-Rose.pdf', type: 'app', app: 'pdfreader', icon: window.portfolioConfig.imgPath + 'pdf.webp', pdfUrl: window.portfolioConfig.basePath + 'data/cv.pdf' }
    ],
    'C:\\Users\\DeVante\\Documents\\Career': [
        { name: 'Killik and Co.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp',
          content: 'Killik & Co — Applications Support Engineer\nIpswich · Apr 2025 – Present\n\n- Maintain and enhance business-critical applications with a strong focus on automation and knowledge sharing.\n- Build AI-assisted internal tooling and PowerShell automation scripts that streamline repeat processes and generate reports.\n- Query and update SQL databases via MSSMS for production data work and reporting.' },
        { name: 'Coded Vision Design.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp',
          content: 'Coded Vision Design — Freelance Full-Stack Developer\nRemote · 2013 – Present\n\n- 100+ freelance projects delivered, with consistent 5-star feedback across SMEs and startups.\n- Engagements span CMS platforms, e-commerce, AI-powered chatbots, deployment and auth consulting.\n- Self-hosts containerised stacks on VPS with Docker, Traefik reverse-proxy, Grafana, Ofelia and OpenClaw.\n- Adjacent creative services: CAA A2 CofC drone videography, drone-photogrammetry 3D modelling, indoor 360° virtual tours, social-media ad editing, content writing.\n- Mainly UK-based clients; engagements across the US, UAE, Saudi Arabia, Australia, and South Africa.' },
        { name: 'UEA.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp',
          content: 'UEA (University of East Anglia) — Desktop Developer / 3rd Line Engineer\nNorwich · Nov 2021 – Apr 2025\n\n- Transformed UEA’s desktop infrastructure across 8,000+ devices, achieving 60% faster deployments through SCCM and JAMF automation.\n- PowerShell automation eliminated 20+ weekly manual hours while maintaining 99.9% system availability.\n- Led Windows 11 migration for 2,000+ users and spearheaded remote-learning infrastructure for 15,000+ students.' },
        { name: 'Skyscanner.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp',
          content: 'Skyscanner — Systems Engineer II\nGlobal · Mar 2020 – Nov 2021\n\n- Led global deployment of AI heat-sensing CCTV across 10+ international offices during COVID-19.\n- Managed £500K infrastructure budget; optimised JAMF/SCCM workflows reducing onboarding setup by 65%.\n- MacBook provisioning compressed from 4 hours to 45 minutes. Provided in-house support via the techbar.' },
        { name: 'Shawbrook Bank.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp',
          content: 'Shawbrook Bank — Desk Side Engineer\nEssex · Mar 2017 – Mar 2020\n\n- End-to-end IT support for 900+ users across multiple sites; SCCM imaging, patching, RSA deployment.\n- PowerShell scripting and process improvements; trained incoming desk-side engineers, reducing onboarding time.' },
        { name: 'Earlier roles (2011-2017).txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp',
          content: 'Earlier roles · 2011 – 2017\n\nFRP Advisory — 2nd Line Engineer (Aug 2016 – Feb 2017)\n  Remote/desk side support, P2V migrations, 200TB data extraction from BHS, digital forensics.\n\nAlexander Knight Business Solutions — Senior Network Engineer (Jul 2015 – Aug 2016)\n  Ran multiple IT departments for an MSP, reporting directly to the CEO.\n\nOntraq IT — IT Support / 2nd Line Field (Nov 2014 – Jul 2015)\n  On-site and telephone assistance for British Transport Police, Gepp & Sons, private legal & financial firms.\n\nPensar IT — Service Desk / 2nd Line (Jun 2014 – Nov 2014)\n  Service-desk and 2nd-line support across an MSP client base.\n\nDatabarracks — IT Support, 1st Line (Jun 2013 – Jun 2014)\n  1st-line support for a UK disaster-recovery and backup specialist.\n\nBlueprint Collections — IT Systems Administrator (Sep 2011 – Jun 2013)\n  Systems administration across the business — first professional role.' },
        { name: 'References (locked).txt', type: 'app', app: 'references', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
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
        { name: 'Easter Egg - South Africa 25 Video.mp4', type: 'video', icon: '🎬', url: '/data/south-africa-25.mp4', originalPath: 'C:\\Users\\DeVante\\Desktop' }
    ],
    'C:\\Users\\DeVante\\Projects': [
        { name: 'Freelance', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Killik and Co', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Coded Vision Design', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'UEA', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Skyscanner', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'Shawbrook Bank', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' },
        { name: 'FRP Advisory', type: 'folder', icon: window.portfolioConfig.imgPath + 'win11/folder.png' }
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
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'Killik & Co — Applications Support Engineer (Apr 2025 – Present)\n\n- Maintain and enhance business-critical applications with a strong focus on automation and knowledge sharing.\n- Build AI-assisted internal tooling and PowerShell automation scripts that streamline repeat processes and generate reports.\n- Query and update SQL databases via MSSMS for production data work and reporting.' },
        { name: 'References (locked).txt', type: 'app', app: 'references', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\Coded Vision Design': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'Coded Vision Design — Freelance Full-Stack Developer (2013 – Present, Remote)\n\n- 100+ freelance projects delivered, consistent 5-star feedback across SMEs and startups.\n- Engagements span CMS platforms, e-commerce, AI-powered chatbots, deployment and auth consulting.\n- Self-hosts containerised stacks on VPS with Docker, Traefik, Grafana, Ofelia and OpenClaw.\n- Adjacent creative services: CAA A2 CofC drone videography, drone-photogrammetry 3D modelling, indoor 360° virtual tours, social-media ad editing, content writing.\n- UK-based clients with engagements across the US, UAE, Saudi Arabia, Australia, and South Africa.' },
        { name: 'References (locked).txt', type: 'app', app: 'references', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\UEA': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'UEA — Desktop Developer / 3rd Line Engineer (Nov 2021 – Apr 2025, Norwich)\n\n- Transformed UEA’s desktop infrastructure across 8,000+ devices; 60% faster deployments via SCCM/JAMF.\n- PowerShell automation eliminated 20+ weekly manual hours while maintaining 99.9% availability.\n- Led Windows 11 migration for 2,000+ users; spearheaded remote-learning infra for 15,000+ students.' },
        { name: 'References (locked).txt', type: 'app', app: 'references', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\Skyscanner': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'Skyscanner — Systems Engineer II (Mar 2020 – Nov 2021, Global)\n\n- Led global AI heat-sensing CCTV deployment across 10+ international offices during COVID-19.\n- Managed £500K infrastructure budget; optimised JAMF/SCCM workflows, 65% faster onboarding.\n- MacBook provisioning compressed from 4 hours to 45 minutes; in-house techbar support.' },
        { name: 'References (locked).txt', type: 'app', app: 'references', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\Shawbrook Bank': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'Shawbrook Bank — Desk Side Engineer (Mar 2017 – Mar 2020, Essex)\n\n- End-to-end IT support for 900+ users across multiple sites; SCCM imaging, patching, RSA.\n- PowerShell scripting + process improvements; trained incoming desk-side engineers.' },
        { name: 'References (locked).txt', type: 'app', app: 'references', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
    ],
    'C:\\Users\\DeVante\\Projects\\FRP Advisory': [
        { name: 'Role_Description.txt', type: 'file', icon: window.portfolioConfig.imgPath + 'notepad++.webp', content: 'FRP Advisory — 2nd Line Engineer (Aug 2016 – Feb 2017)\n\n- Remote/desk side support across the UK for companies in liquidation.\n- P2V migrations and on-site infrastructure moves.\n- Assisted in extracting and sorting 200TB of data from BHS.\n- Specialised in digital forensics and ethical hacking.' },
        { name: 'References (locked).txt', type: 'app', app: 'references', icon: window.portfolioConfig.imgPath + 'notepad++.webp', extraData: { locked: true } }
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
