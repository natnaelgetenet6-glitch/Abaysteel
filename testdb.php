<?php
// testdb.php
require_once 'db.php';

echo "<h2>Database Connection Test</h2>";

if (isset($pdo)) {
    echo "<p style='color: green; font-weight: bold;'>✅ Connected successfully to the database!</p>";
    
    // Attempt a query
    try {
        $stmt = $pdo->query("SELECT 1 + 1 AS solution");
        $result = $stmt->fetch();
        echo "<p>Test Query (1+1) returned: <strong>" . $result['solution'] . "</strong></p>";
    } catch (Exception $e) {
        echo "<p style='color: red;'>❌ Query Failed: " . $e->getMessage() . "</p>";
    }
} else {
    echo "<p style='color: red; font-weight: bold;'>❌ Connection Variable Not Found!</p>";
}
?>
