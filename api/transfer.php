<?php
require_once '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $productId = $input['productId'];
    $quantity = (int)$input['quantity'];

    if (!$productId || $quantity <= 0) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid product or quantity']);
        exit;
    }

    try {
        $pdo->beginTransaction();

        // 1. Check if enough stock exists in store
        $stmt = $pdo->prepare("SELECT stock_quantity FROM products WHERE id = ?");
        $stmt->execute([$productId]);
        $product = $stmt->fetch();

        if (!$product || $product['stock_quantity'] < $quantity) {
            throw new Exception("Insufficient stock in main store");
        }

        // 2. Perform Transfer
        $stmt = $pdo->prepare("UPDATE products SET 
            stock_quantity = stock_quantity - ?,
            shop_quantity = shop_quantity + ?
            WHERE id = ?");
        $stmt->execute([$quantity, $quantity, $productId]);

        $pdo->commit();
        echo json_encode(['success' => true]);

    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
