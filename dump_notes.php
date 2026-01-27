<?php
require_once 'db.php';
header('Content-Type: text/html');
echo "<h1>Price Notes Diagnostic</h1>";

try {
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
} catch (Exception $e) {
    echo "<p style='color:red;'>Error: " . $e->getMessage() . "</p>";
}
?>
