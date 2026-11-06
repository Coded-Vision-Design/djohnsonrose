<?php
// pages/not-found.php - the 404 page for any path lib/routes.php does not
// know. index.php sets the status code before including it.

$pageTitle = 'Page not found';
$pageDescription = 'There is nothing at this address.';
$pageNoIndex = true;

ob_start();
?>
        <h1>Page not found</h1>
        <p class="lead">There is nothing at this address. The link may be mistyped, or the page may have moved.</p>
        <ul>
            <li><a href="<?php echo htmlspecialchars(BASE_PATH, ENT_QUOTES, 'UTF-8'); ?>">Open the portfolio desktop</a></li>
            <li><a href="<?php echo htmlspecialchars(BASE_PATH, ENT_QUOTES, 'UTF-8'); ?>v2/">Open the React version of the portfolio</a></li>
            <li><a href="<?php echo htmlspecialchars(BASE_PATH, ENT_QUOTES, 'UTF-8'); ?>privacy">Read the privacy notice</a></li>
        </ul>
<?php
$pageContent = ob_get_clean();
include __DIR__ . '/layout.php';
