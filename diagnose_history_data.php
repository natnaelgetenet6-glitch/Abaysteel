<?php
require_once 'db.php';

header('Content-Type: text/plain');

echo "--- DIAGNOSTIC START ---\n";

// 1. Check Sales
$stmt = $pdo->query("SELECT COUNT(*) FROM sales");
$salesCount = $stmt->fetchColumn();
echo "Total Sales: $salesCount\n";

if ($salesCount == 0) {
    echo "No sales found. History will be empty.\n";
    exit;
}

// 2. Check Sale Items
$stmt = $pdo->query("SELECT COUNT(*) FROM sale_items");
$itemsCount = $stmt->fetchColumn();
echo "Total Sale Items: $itemsCount\n";

if ($itemsCount == 0) {
    echo "CRITICAL: No items found in 'sale_items' table. Sales exist but have no linked items.\n";
    // Check if we can see any orphaned sales
    $stmt = $pdo->query("SELECT id FROM sales LIMIT 5");
    $sampleSales = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Sample Sale IDs: " . implode(', ', $sampleSales) . "\n";
    exit;
}

// 3. Test Join Logic (Simulating history.php)
$sql = "
    SELECT id FROM sales ORDER BY sale_date DESC LIMIT 5
";
$stmt = $pdo->query($sql);
$sales = $stmt->fetchAll(PDO::FETCH_ASSOC);

$saleIds = array_column($sales, 'id');
echo "Checking Items for Sale IDs: " . implode(', ', $saleIds) . "\n";

if (!empty($saleIds)) {
    $placeholders = implode(',', array_fill(0, count($saleIds), '?'));
    
    // Check Raw Sale Items for these sales
    $checkSql = "SELECT * FROM sale_items WHERE sale_id IN ($placeholders)";
    $checkStmt = $pdo->prepare($checkSql);
    $checkStmt->execute($saleIds);
    $rawItems = $checkStmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Found " . count($rawItems) . " raw items for these 5 sales.\n";
    
    if (count($rawItems) > 0) {
        foreach ($rawItems as $ri) {
            echo " - Sale ID {$ri['sale_id']}: Product ID {$ri['product_id']}, Qty {$ri['quantity']}, Unit Price {$ri['unit_price']}\n";
        }
    } else {
        echo "WARNING: These recent sales have NO items in sale_items.\n";
    }

    // Check Full Join (what history.php uses)
    $itemSql = "
        SELECT 
            si.sale_id,
            p.name as product_name,
            p.dimensions
        FROM sale_items si
        LEFT JOIN products p ON si.product_id = p.id
        WHERE si.sale_id IN ($placeholders)
    ";
    
    $itemStmt = $pdo->prepare($itemSql);
    $itemStmt->execute($saleIds);
    $joinedItems = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "Found " . count($joinedItems) . " items after joining with Products.\n";
    foreach ($joinedItems as $ji) {
        if (empty($ji['product_name'])) {
            echo " - Sale ID {$ji['sale_id']}: Product Name is NULL (Product might be deleted)\n";
        } else {
            echo " - Sale ID {$ji['sale_id']}: {$ji['product_name']} ({$ji['dimensions']})\n";
        }
    }
}

echo "--- DIAGNOSTIC END ---\n";
?>
