<?php
// Simulate GET parameters
$_GET['startDate'] = '2026-02-01';
$_GET['endDate'] = '2026-02-06';

// Enable error reporting
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

header('Content-Type: text/plain'); // Force text output so browser doesn't hide errors in JSON

echo "--- START DEBUG ---\n";

echo "Current Directory: " . getcwd() . "\n";
echo "Script File: " . __FILE__ . "\n";

// 1. Test Path Resolution
$dbPath = __DIR__ . '/db.php';
echo "Looking for db.php at: " . $dbPath . "\n";
if (file_exists($dbPath)) {
    echo "SUCCESS: db.php found.\n";
} else {
    echo "ERROR: db.php NOT found at expected path.\n";
}

// 2. Test DB Connection directly
try {
    require_once 'db.php';
    echo "SUCCESS: db.php included.\n";
    if (isset($pdo)) {
        echo "SUCCESS: \$pdo object exists.\n";
    } else {
        echo "ERROR: \$pdo object NOT set after including db.php.\n";
    }
} catch (Throwable $e) {
    echo "CRITICAL DB ERROR: " . $e->getMessage() . "\n";
}

echo "\n--- EXECUTING API/OVERVIEW.PHP ---\n";

// 3. Include the API file
// note: api/overview.php now returns JSON. expected output is JSON string.
try {
    // We need to trick api/overview.php because it uses relative paths for db.php
    // checking if we need to adjust include_path or just rely on absolute paths in api/overview.php
    
    // reset db.php inclusion check if possible, though require_once prevents re-include.
    // Since we already included 'db.php', api/overview.php's 'require_once' should just skip.
    // BUT api/overview.php tries to include '../db.php'. PHP considers 'db.php' and '../db.php' different files unless resolved absolute paths match.
    // My previous fix used __DIR__, so it should resolve effectively to the same file.
    
    require 'api/overview.php'; 
    
} catch (Throwable $e) {
    echo "\nCRITICAL API ERROR: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine() . "\n";
    echo "Trace:\n" . $e->getTraceAsString();
}

echo "\n--- END DEBUG ---\n";
?>
