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
    
    try {
        $pdo->beginTransaction();
        
        // 1. Create Sale Record
        $stmt = $pdo->prepare("INSERT INTO sales (total_amount, sell_type, user, buyer_name, buyer_phone, buyer_address) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $input['total'],
            $input['sellType'],
            $input['user'],
            $input['buyer']['name'] ?? null,
            $input['buyer']['phone'] ?? null,
            $input['buyer']['address'] ?? null
        ]);
        
        $saleId = $pdo->lastInsertId();
        
        // 2. Insert Items and Update Stock
        $itemStmt = $pdo->prepare("INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?)");
        $stockStmt = $pdo->prepare("UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?");
        
        foreach ($input['items'] as $item) {
            $subtotal = $item['product']['sellPrice'] * $item['qty'];
            $itemStmt->execute([
                $saleId,
                $item['product']['id'],
                $item['qty'],
                $item['product']['sellPrice'],
                $subtotal
            ]);
            
            $stockStmt->execute([
                $item['qty'],
                $item['product']['id']
            ]);
        }
        
        $pdo->commit();
        echo json_encode(['id' => $saleId, 'success' => true]);
        
    } catch (Exception $e) {
        $pdo->rollBack();
        http_response_code(500);
        echo json_encode(['error' => $e->getMessage()]);
    }
}
?>
