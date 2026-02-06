<?php
// Simulate GET parameters
$_GET['startDate'] = '2026-02-01';
$_GET['endDate'] = '2026-02-06';

// Enable error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

echo "--- START DEBUG ---\n";

// Include the file to test
try {
    require_once 'api/overview.php';
} catch (Throwable $e) {
    echo "\nCRITICAL ERROR: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString();
}

echo "\n--- END DEBUG ---\n";
?>
