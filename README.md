# Windows 11 Portfolio OS

A production-ready portfolio website built with **PHP 8.x**, **HTMX**, **TailwindCSS**, and **Alpine.js**. Designed to look and feel like Windows 11 with a functional window manager, desktop, and integrated apps.

## Features

- **Windows 11 UI**: Rounded corners, translucency (mica/glass), taskbar, start menu, and smooth animations.
- **Window Manager**: Supports dragging, resizing, maximizing, minimizing, and focus management.
- **Deep Linking**: Access specific apps via URLs like `/app/paint` or `/app/calculator`.
- **Functional Apps**:
  - **Paint**: Functional canvas with drawing, eraser, and PNG export.
  - **Calculator**: Standard operations with keyboard support.
  - **Explorer**: File browser for projects, CV, and contact info.
  - **Edge**: Tabbed browser interface showcasing portfolio projects.
  - **Word**: Professional CV viewer with Word-like ribbon.
  - **Outlook**: Integrated contact form via `mailto:`.
  - **Terminal**: Interactive shell with custom commands.
  - **Settings**: Theme toggles (Dark/Light), wallpaper selection, and system sounds.
- **Persistence**: Login state and settings (theme, wallpaper) persist via `localStorage`.
- **Deployment Ready**: Optimised for Apache/Hostinger shared hosting.

## Project Structure

```text
/
├── assets/             # CSS, JS, and Images
├── partials/           # PHP components and App templates
│   └── apps/           # Individual application partials
├── api/                # HTMX/JSON endpoints
├── data/               # Projects and CV data files
├── index.php           # Main entry point (Shell)
├── router.php          # Request routing logic
├── bootstrap.php       # Application initialization
├── config.php          # Configuration handler
├── .htaccess           # Apache routing rules
├── .env.example        # Environment template
└── README.md           # This file
```

## Local Development

1. Clone or download the repository to your local server (e.g., XAMPP, Laragon, or local PHP).
2. Copy `.env.example` to `.env` and set your contact email.
3. Run using the built-in PHP server:
   ```bash
   php -S localhost:8000
   ```
4. Open `http://localhost:8000` in your browser.

## Deployment Notes (Hostinger/Shared Hosting)

1. Upload all files to the `public_html` directory (or your chosen subdirectory).
2. Ensure `.htaccess` is present in the root to handle routing.
3. If you're on a subdirectory (e.g., `yoursite.com/portfolio`), update the base path in `bootstrap.php` or `.htaccess`.

## Customization

- **Projects**: Edit `data/projects.php` to add your own work.
- **CV**: Edit `data/cv.php` to update your professional experience.
- **Email**: Update `PORTFOLIO_EMAIL` in `.env`.
- **Wallpaper**: Replace files in `assets/img/wallpaper-*.jpg`.

## License
MIT


UUIDs vs. Auto-Increment IDs: "I chose UUIDs for Primary Keys instead of standard integers. This prevents ID guessing (security) and makes the database horizontally scalable. If we ever needed to merge data from multiple servers, we wouldn't have ID collisions."
Normalization (3NF): "The design follows Third Normal Form. I separated Categories into its own table and used a project_categories junction table. This avoids data redundancy; I don't have to repeat category names for every project."
Indexing: "I added indexes on is_featured and sort_order. This ensures that when the portfolio loads its 'Featured Projects', the database doesn't have to scan the entire table, making it highly performant even as the dataset grows."
Referential Integrity: "I used Foreign Keys with ON DELETE CASCADE. This ensures data consistency—if a project is deleted, its category assignments are automatically cleaned up, preventing 'orphan' records."
Data Types: "I used TEXT for descriptions to allow for long-form content and TIMESTAMP with ON UPDATE for auditing, so we always know when a record was last modified."
Window Edge Resizing: "That behaviour is officially called window edge resizing, but in modern desktop UX it’s more specifically part of Window chrome resizing (non-client area). Best described as 'Manual window resizing via resize handles' or 'Window border hit-testing with drag-based resizing'. For realism, it implements 8-directional resizing with a ~6-8px invisible resize border, cursor capture during drag, and adaptive control icons (switching to the Restore Down icon in the middle when maximized) integrated with the window manager's snapping logic."
