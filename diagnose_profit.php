<?php
require_once 'db.php';
header('Content-Type: text/plain');

echo "--- PROFIT CALCULATION DIAGNOSTIC ---\n\n";

// 1. Check Product Buy Prices
$stmt = $pdo->query("SELECT COUNT(*) as total, SUM(CASE WHEN buy_price > 0 THEN 1 ELSE 0 END) as with_price FROM products");
$res = $stmt->fetch();
echo "1. PRODUCTS:\n";
echo "   Total Products: " . $res['total'] . "\n";
echo "   Products with Buy Price > 0: " . $res['with_price'] . "\n";
if ($res['with_price'] == 0) echo "   WARNING: No products have a buy price set! COGS will be 0.\n";
echo "\n";

// 2. Check Sale Items
$stmt = $pdo->query("SELECT COUNT(*) as total FROM sale_items");
$count = $stmt->fetch()['total'];
echo "2. SALE ITEMS:\n";
echo "   Total Items Sold (rows in sale_items): " . $count . "\n";
if ($count == 0) echo "   WARNING: No sale items found! Did you populate history manually without items?\n";
echo "\n";

// 3. Totals from Sales Table vs COGS Calculation
$stmt = $pdo->query("SELECT SUM(total_amount) as revenue FROM sales");
$revenue = $stmt->fetch()['revenue'] ?? 0;

$stmt = $pdo->query("SELECT SUM(si.quantity * p.buy_price) as cogs 
                     FROM sale_items si 
                     JOIN products p ON si.product_id = p.id");
$cogs = $stmt->fetch()['cogs'] ?? 0;

echo "3. TOTALS:\n";
echo "   Total Sales (Revenue): " . number_format($revenue, 2) . "\n";
echo "   Total Cost of Goods (COGS): " . number_format($cogs, 2) . "\n";
echo "   Gross Profit (Revenue - COGS): " . number_format($revenue - $cogs, 2) . "\n";
echo "\n";

// 4. Detailed Inspector (Last 5 items)
echo "4. RECENT SALE ITEMS (Last 5):\n";
echo str_pad("ID", 6) . str_pad("Product", 20) . str_pad("Qty", 6) . str_pad("Buy Price", 12) . str_pad("Sell Price", 12) . "Calc COGS\n";
echo str_repeat("-", 80) . "\n";

$sql = "SELECT si.id, p.name, si.quantity, p.buy_price, si.unit_price as sell_price
        FROM sale_items si
        JOIN products p ON si.product_id = p.id
        ORDER BY si.id DESC LIMIT 5";
$stmt = $pdo->query($sql);
foreach ($stmt->fetchAll() as $row) {
    echo str_pad($row['id'], 6);
    echo str_pad(substr($row['name'], 0, 18), 20);
    echo str_pad($row['quantity'], 6);
    echo str_pad(number_format($row['buy_price'], 2), 12);
    echo str_pad(number_format($row['sell_price'], 2), 12);
    echo number_format($row['quantity'] * $row['buy_price'], 2) . "\n";
}
?>
