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

// Default GET: Fetch History
$sql = "
    SELECT 
        s.id, 
        s.sale_date as date, 
        s.total_amount as amount, 
        s.sell_type, 
        s.processed_by as user, 
        s.buyer_name, 
        s.buyer_phone,
        s.buyer_address,
        GROUP_CONCAT(CONCAT(p.name, ' (', COALESCE(p.dimensions, '-'), ') x ', si.quantity) SEPARATOR ', ') as items_summary,
        NULL as description, 
        'sale' as type 
    FROM sales s
    LEFT JOIN sale_items si ON s.id = si.sale_id
    LEFT JOIN products p ON si.product_id = p.id
    GROUP BY s.id
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
        NULL as items_summary,
        description, 
        'expense' as type 
    FROM expenses
    ORDER BY date DESC
    LIMIT 500
";

$stmt = $pdo->query($sql);
echo json_encode($stmt->fetchAll());
?>
