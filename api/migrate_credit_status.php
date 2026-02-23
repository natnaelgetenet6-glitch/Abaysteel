<?php
require_once '../db.php';

header('Content-Type: application/json');

try {
    // Check if column already exists
    $check = $pdo->query("SHOW COLUMNS FROM sales LIKE 'credit_status'");
    if ($check->rowCount() === 0) {
        $pdo->exec("ALTER TABLE sales ADD COLUMN credit_status ENUM('Pending','Paid','Refunded') DEFAULT NULL");
        // Set existing Credit sales to 'Pending'
        $pdo->exec("UPDATE sales SET credit_status = 'Pending' WHERE sell_type = 'Credit' AND credit_status IS NULL");
        echo json_encode(['success' => true, 'message' => 'Column credit_status added and existing Credit sales set to Pending.']);
    } else {
        echo json_encode(['success' => true, 'message' => 'Column credit_status already exists. No changes made.']);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
?>
