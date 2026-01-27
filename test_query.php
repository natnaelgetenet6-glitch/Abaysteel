<?php
// test_api.php
require_once 'db.php';

function test_add_note($pdo, $name, $min, $max) {
    echo "Testing add/update note: $name ($min - $max)\n";
    $url = 'http://localhost/Abaysteel/api/price_notes.php'; // This won't work from CLI easily, let's use the DB directly to see if the query works
    
    $sql = "INSERT INTO price_notes (item_name, min_price, max_price) 
            VALUES (?, ?, ?) 
            ON DUPLICATE KEY UPDATE 
            min_price = VALUES(min_price), 
            max_price = VALUES(max_price),
            updated_at = CURRENT_TIMESTAMP";
    
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$name, $min, $max]);
        echo "Success!\n";
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
    }
}

test_add_note($pdo, 'Test Item ' . time(), 10.50, 20.75);
?>
