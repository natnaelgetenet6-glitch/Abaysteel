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
    
    try {
        $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
        $stmt->execute([$id]);
        echo json_encode(['success' => true]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to delete product: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM products ORDER BY name");
        echo json_encode($stmt->fetchAll());
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to fetch products: ' . $e->getMessage()]);
    }
    exit;
}

if ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        // Handle Delete via POST (Fallback)
        if (isset($input['action']) && $input['action'] === 'delete') {
            $id = $input['id'] ?? null;
            if (!$id) throw new Exception("ID required for deletion");
            $stmt = $pdo->prepare("DELETE FROM products WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true]);
            exit;
        }

        if (!$input || empty($input['name']) || empty($input['type'])) {
            throw new Exception("Name and Type are required");
        }

        $sql = "INSERT INTO products (name, type, dimensions, stock_quantity, buy_price, sell_price, unit, min_stock_level) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $input['name'],
            $input['type'],
            $input['dimensions'] ?? '',
            $input['quantity'] ?? 0,
            $input['buyPrice'] ?? 0,
            $input['sellPrice'] ?? 0,
            $input['unit'] ?? 'pcs',
            $input['minStockLevel'] ?? 10
        ]);
        
        echo json_encode(['id' => $pdo->lastInsertId(), 'success' => true]);
    } catch (Exception $e) {
        http_response_code(400); // Or 500 depending on error
        echo json_encode(['error' => $e->getMessage(), 'success' => false]);
    }
    exit;
}
?>
