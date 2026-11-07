<?php
// pages/privacy.php - the privacy notice at /privacy. Plain HTML with no
// JavaScript. It describes what api/log.php, api/send_email.php and
// api/weather.php actually do, so keep it in step with them, and with the
// cookie banner in both builds, which links here.

require_once __DIR__ . '/../lib/telemetry.php';

$e = fn($value) => htmlspecialchars((string)$value, ENT_QUOTES, 'UTF-8');
$email = (string)($config['email'] ?? 'devante@johnson-rose.co.uk');
$place = (string)($config['weather']['city'] ?? 'Essex');
$days = TELEMETRY_RETENTION_DAYS;
$messageDays = EMAIL_LOG_RETENTION_DAYS;

$pageTitle = 'Privacy notice';
$pageDescription = 'What DeVanté Johnson-Rose\'s portfolio records about visitors, why, and for how long.';
$pageCurrent = 'privacy';
$pageCanonical = 'https://devante.johnson-rose.co.uk/privacy';

ob_start();
?>
        <h1>Privacy notice</h1>
        <p class="lead">This portfolio is run by DeVanté Johnson-Rose. This page sets out exactly what the site records about visitors, why, and for how long.</p>

        <div class="note">
            <p><strong>In short:</strong> nothing is recorded unless you accept. If you accept, the site records which apps you open and a shortened IP address, and may load Google Analytics. Records are kept for <?php echo $days; ?> days. A message you send me through the Outlook app is kept for 12 months.</p>
        </div>

        <h2 id="consent">Nothing is recorded until you accept</h2>
        <p>The first time you sign in to the desktop, a banner asks whether you accept cookies and telemetry. Until you choose Accept, neither version of the site (v1 at <code>/</code> and v2 at <code>/v2/</code>) sends any records, and Google Analytics is not loaded.</p>

        <h2 id="records">What is recorded if you accept</h2>
        <p>Each record is one of these events:</p>
        <ul>
            <li>opening or closing an app, such as Word or Calculator</li>
            <li>signing in to or out of the desktop</li>
            <li>opening the Start menu, moving between folders in File Explorer, and moving a file to the Recycle Bin</li>
            <li>viewing a document, such as the CV in the PDF Reader</li>
            <li>running a command in the Terminal app. Only the name of the command is kept (for example <code>ls</code>), never anything typed after it</li>
        </ul>
        <p>With each event, the record holds:</p>
        <ul>
            <li>the app it came from, and which version of the site you were using</li>
            <li>a random visit number, made by your browser and forgotten when you close the tab. It is not stored in a cookie and is not linked to you</li>
            <li>the name of your operating system and browser (for example Windows and Chrome) and your screen size</li>
            <li>a shortened IP address. The last part of an IPv4 address is replaced with zero, so 203.0.113.77 is stored as 203.0.113.0, and an IPv6 address keeps only its first 48 bits. That is enough to tell visits apart roughly, but not to identify your connection</li>
            <li>the date and time</li>
        </ul>
        <p>The site does not store your full IP address, your location, your internet provider or your browser's full identifying string, and it never looks up where an IP address is.</p>
        <p>To stop abuse, the server counts how often each address sends records, sends messages or tries to sign in to the Admin Console. While it counts, it keeps a scrambled, one-way form (a hash) of your full IP address. That is never stored with your records.</p>

        <h2 id="retention">How long records and messages are kept</h2>
        <p>Records are deleted automatically once they are <?php echo $days; ?> days old. The copy of a message you send me (see <a href="#messages">If you send me a message</a>) is deleted automatically once it is 12 months (<?php echo $messageDays; ?> days) old.</p>
        <p>The clean-up runs at most once a day, the next time a visitor who has accepted uses the site, so a record or a message can last a little longer than that.</p>

        <h2 id="access">Who sees them</h2>
        <p>Only me. Records are kept in the site's own database at its web host. At most once a day I receive one summary email with counts only: how many events and visits there were, which apps were used and which version of the site. It contains no IP addresses and nothing about any one visitor. The Admin Console shows the same totals, and only I can sign in to it.</p>

        <h2 id="google-analytics">Google Analytics (v1 only)</h2>
        <p>If you accept, v1 of the site loads Google Analytics (measurement ID <code>G-64PRMY8EKD</code>) from Google's servers, on that visit and on every later visit until you withdraw consent. Google Analytics sets its own cookies, named <code>_ga</code> and <code>_ga_</code> followed by an ID, and sends Google details of your visit, such as the pages you view, your browser and device, and an approximate location that Google works out from your IP address. <a href="https://policies.google.com/privacy">Google's privacy policy</a> covers that data. v2 never loads Google Analytics, and neither version loads it if you decline.</p>

        <h2 id="weather">Weather</h2>
        <p>The weather in the taskbar is always for one fixed place, <?php echo $e($place); ?>. Your IP address and location are never used for it, and nothing about you is sent to the weather service: the site's server asks Open-Meteo for the forecast for that one place and shows the same answer to every visitor.</p>

        <h2 id="messages">If you send me a message</h2>
        <p>If you use the Outlook app to send me a message, I receive your email address, your subject, your message and any attachments by email. A copy of the message, without attachments, is kept in the site's database with a shortened IP address so that I can reply and deal with abuse. That copy is deleted automatically after 12 months, or sooner if you ask me.</p>

        <h2 id="copilot">Copilot</h2>
        <p>The Copilot app answers questions about my work and matches job descriptions against my CV. When you send it a question or a job description, the site's server passes it to Anthropic, whose Claude models write the answer, together with your last few messages in that chat and the site's own CV data. Nothing else about you goes with it: not your IP address, not a cookie and not a name. The site does not keep your questions, job descriptions or Copilot's answers; your chat stays in that window until you close it. To stop overuse, the server counts requests against a hashed copy of your shortened IP address and forgets each count within a day. Anthropic handles what it receives under its own <a href="https://www.anthropic.com/legal/privacy">privacy policy</a>, so please do not paste anything private into Copilot.</p>

        <h2 id="device">What stays on your device</h2>
        <p>Your settings (such as theme and wallpaper), your answer to the cookie banner and any files you make on the desktop are saved in your browser's local storage, on your own device. They are not sent to the site, except where an event above mentions them, such as the name of a file you move to the Recycle Bin.</p>

        <h2 id="other-services">Other services your browser contacts</h2>
        <p>Some pictures load straight from other services, such as wallpapers from Unsplash and flags from flagcdn.com. Opening the Admin Console app loads Google's sign-in button and a chart library from jsDelivr. As with any website, those services receive your IP address and browser details when your browser fetches from them.</p>

        <h2 id="withdraw">Changing your mind</h2>
        <p>Open Settings, go to System, and switch off Telemetry and cookies. Records stop at once. Google Analytics will not load on your next visit; to remove the cookies it has already set, clear this site's cookies in your browser. v1 and v2 each keep their own setting, so if you use both, switch it off in both.</p>

        <h2 id="rights">Your rights</h2>
        <p>You can ask what the site holds about you, ask me to delete it, or object to it being kept, by emailing <a href="mailto:<?php echo $e($email); ?>"><?php echo $e($email); ?></a>. Records are not linked to a name, so to find yours I may need the date, the time and the apps you used. You can also complain to the Information Commissioner's Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a>.</p>

        <p><small>Last updated 7 November 2026.</small></p>
<?php
$pageContent = ob_get_clean();
include __DIR__ . '/layout.php';
