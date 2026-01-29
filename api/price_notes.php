<?php
require_once '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

// SELF-HEALING: Create table if missing
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS price_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        item_name VARCHAR(255) NOT NULL UNIQUE,
        min_price DECIMAL(10,2) NOT NULL,
        max_price DECIMAL(10,2) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
} catch (Exception $e) {
    // Standard error reporting will catch issues in subsequent queries if this fails
}

// Handle DELETE requests (URL like /api/price_notes.php?id=123)
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        exit;
    }
    
    $stmt = $pdo->prepare("DELETE FROM price_notes WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM price_notes ORDER BY item_name");
        echo json_encode($stmt->fetchAll());
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Handle Delete via POST (Fallback)
    if (isset($input['action']) && $input['action'] === 'delete') {
        $id = $input['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'ID required']);
            exit;
        }
        $stmt = $pdo->prepare("DELETE FROM price_notes WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
        exit;
    }

    // Basic Validation
    if (empty($input['item_name']) || !isset($input['min_price']) || !isset($input['max_price'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'All fields (Item Name, Min Rate, Max Rate) are required.']);
        exit;
    }

    try {
        // Use INSERT ... ON DUPLICATE KEY UPDATE for item_name
        // This handles both new entries and updates by item_name (not just ID)
        $sql = "INSERT INTO price_notes (item_name, min_price, max_price) 
                VALUES (?, ?, ?) 
                ON DUPLICATE KEY UPDATE 
                min_price = VALUES(min_price), 
                max_price = VALUES(max_price),
                updated_at = CURRENT_TIMESTAMP";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['item_name'],
            $input['min_price'],
            $input['max_price']
        ]);
        
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
    }
    exit;
}
?>
