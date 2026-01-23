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
    $stmt = $pdo->query("SELECT * FROM price_notes ORDER BY item_name");
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (isset($input['id'])) {
        // Update
        $sql = "UPDATE price_notes SET item_name = ?, min_price = ?, max_price = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['item_name'],
            $input['min_price'],
            $input['max_price'],
            $input['id']
        ]);
    } else {
        // Insert
        $sql = "INSERT INTO price_notes (item_name, min_price, max_price) VALUES (?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['item_name'],
            $input['min_price'],
            $input['max_price']
        ]);
    }
    
    echo json_encode(['id' => $pdo->lastInsertId() ?: $input['id'], 'success' => true]);
    exit;
}
?>
