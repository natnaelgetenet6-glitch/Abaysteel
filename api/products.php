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

// Handle DELETE requests (URL like /api/products.php?id=123)
if ($method === 'DELETE') {
    $id = $_GET['id'] ?? null;
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'ID required']);
        exit;
    }
    
    $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
    $stmt->execute([$id]);
    echo json_encode(['success' => true]);
    exit;
}

if ($method === 'GET') {
    $stmt = $pdo->query("SELECT * FROM products ORDER BY name");
    echo json_encode($stmt->fetchAll());
    exit;
}

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $sql = "INSERT INTO products (name, type, dimensions, stock_quantity, buy_price, sell_price, unit, min_stock_level) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $input['name'],
        $input['type'],
        $input['dimensions'],
        $input['quantity'] ?? 0,
        $input['buyPrice'] ?? 0,
        $input['sellPrice'] ?? 0,
        $input['unit'] ?? 'pcs',
        $input['minStockLevel'] ?? 10
    ]);
    
    echo json_encode(['id' => $pdo->lastInsertId(), 'success' => true]);
    exit;
}
?>
