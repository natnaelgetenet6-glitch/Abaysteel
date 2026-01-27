<?php
require_once 'db.php';
header('Content-Type: text/html');
echo "<h1>Price Notes Diagnostic</h1>";

try {
    echo "<h2>Server Info</h2>";
    echo "<p>Host: $host</p>";
    echo "<p>Database: $db</p>";

    echo "<h2>Available Tables</h2>";
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "<ul>";
    foreach ($tables as $table) {
        echo "<li>$table</li>";
    }
    echo "</ul>";

    echo "<h2>Price Notes Data</h2>";
    if (in_array('price_notes', $tables)) {
        $stmt = $pdo->query("SELECT * FROM price_notes");
        $rows = $stmt->fetchAll();
        echo "<p>Count: " . count($rows) . "</p>";
        
        if (count($rows) > 0) {
            echo "<table border='1' cellpadding='5'>";
            echo "<tr><th>ID</th><th>Item Name</th><th>Min</th><th>Max</th><th>Updated</th></tr>";
            foreach ($rows as $row) {
                echo "<tr>";
                echo "<td>" . $row['id'] . "</td>";
                echo "<td>" . htmlspecialchars($row['item_name']) . "</td>";
                echo "<td>" . $row['min_price'] . "</td>";
                echo "<td>" . $row['max_price'] . "</td>";
                echo "<td>" . $row['updated_at'] . "</td>";
                echo "</tr>";
            }
            echo "</table>";
        } else {
            echo "<p>No data found in price_notes table.</p>";
        }
    } else {
        echo "<p style='color:red;'>⚠️ Table 'price_notes' does not exist in database '$db'!</p>";
    }
} catch (Exception $e) {
    echo "<p style='color:red;'>Error: " . $e->getMessage() . "</p>";
}
?>
