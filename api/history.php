<?php
require_once '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Handle Delete / Clear Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    try {
        if ($action === 'delete') {
            $id = $input['id'] ?? null;
            $type = $input['type'] ?? null; // 'sale' or 'expense'

            if (!$id || !$type) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing ID or type']);
                exit;
            }

            if ($type === 'sale') {
                $stmt = $pdo->prepare("DELETE FROM sales WHERE id = ?");
                $stmt->execute([$id]);
            } elseif ($type === 'expense') {
                $stmt = $pdo->prepare("DELETE FROM expenses WHERE id = ?");
                $stmt->execute([$id]);
            }
            echo json_encode(['success' => true]);
            exit;
        }

        if ($action === 'clear') {
            // Clear all history
            $pdo->exec("DELETE FROM sales");
            $pdo->exec("DELETE FROM expenses");
            echo json_encode(['success' => true]);
            exit;
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
        exit;
    }
}

// Handle Update Actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';

    if ($action === 'update_sale') {
        $id = $input['id'] ?? null;
        if (!$id) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing Sale ID']);
            exit;
        }

        $buyerName = $input['buyer_name'] ?? null;
        $buyerPhone = $input['buyer_phone'] ?? null;
        $buyerAddress = $input['buyer_address'] ?? null;
        $sellType = $input['sell_type'] ?? 'Cash';
        $totalAmount = $input['total_amount'] ?? 0;

        try {
            $stmt = $pdo->prepare("
                UPDATE sales 
                SET buyer_name = ?, buyer_phone = ?, buyer_address = ?, sell_type = ?, total_amount = ?
                WHERE id = ?
            ");
            $stmt->execute([$buyerName, $buyerPhone, $buyerAddress, $sellType, $totalAmount, $id]);
            
            echo json_encode(['success' => true]);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['error' => 'Update failed: ' . $e->getMessage()]);
            exit;
        }
    }
}

// Default GET: Fetch History
// 1. Fetch Sales and Expenses (Top 500 by date)
$sql = "
    SELECT 
        id, 
        sale_date as date, 
        total_amount as amount, 
        sell_type, 
        processed_by as user, 
        buyer_name, 
        buyer_phone,
        buyer_address,
        NULL as description, 
        'sale' as type 
    FROM sales
    UNION ALL
    SELECT 
        id, 
        expense_date as date, 
        amount, 
        NULL as sell_type, 
        NULL as user, 
        NULL as buyer_name, 
        NULL as buyer_phone,
        NULL as buyer_address,
        description, 
        'expense' as type 
    FROM expenses
    ORDER BY date DESC
    LIMIT 500
";

$stmt = $pdo->query($sql);
$history = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 2. Extract Sale IDs to fetch items
$saleIds = [];
// Map keys for easy lookup
$salesMap = [];

foreach ($history as $key => $row) {
    if ($row['type'] === 'sale') {
        $saleIds[] = $row['id'];
        $history[$key]['items'] = []; // Initialize empty items array
        // We can't easily use id as key because history is a mixed array, 
        // allowing duplicates if we had multiple sales with same ID (unlikely but possible if data err).
        // Instead, we'll iterate again or build a reference map if needed.
        // Actually, let's just use a simple loop later to attach items to keep order.
    }
}

// 3. Fetch Items for these Sales if any
if (!empty($saleIds)) {
    $placeholders = implode(',', array_fill(0, count($saleIds), '?'));
    $itemSql = "
        SELECT 
            si.sale_id,
            si.quantity,
            si.unit_price as sell_price,
            COALESCE(si.product_name, p.name) as product_name,
            COALESCE(si.dimensions, p.dimensions) as dimensions,
            COALESCE(si.buy_price, p.buy_price) as buy_price
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id IN ($placeholders)
    ";
    
    $itemStmt = $pdo->prepare($itemSql);
    $itemStmt->execute($saleIds);
    $allItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

    // Group items by sale_id
    $itemsBySale = [];
    foreach ($allItems as $item) {
        $itemsBySale[$item['sale_id']][] = $item;
    }

    // Attach to history
    foreach ($history as &$row) {
        if ($row['type'] === 'sale' && isset($itemsBySale[$row['id']])) {
            $row['items'] = $itemsBySale[$row['id']];
        }
    }
}

echo json_encode($history);
?>
