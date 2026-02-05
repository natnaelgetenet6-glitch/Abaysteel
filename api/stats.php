<?php
require_once '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 

// 1. Total Sales (Revenue)
$stmt = $pdo->query("SELECT SUM(total_amount) as total FROM sales");
$totalSales = $stmt->fetch()['total'] ?? 0;

// 2. Total Cost of Goods Sold (COGS)
// Join sale_items with products to get the buy_price for each sold item
// Note: using current buy_price as historical buy_price is not stored
$sql = "SELECT SUM(si.quantity * p.buy_price) as total_cogs 
        FROM sale_items si 
        JOIN products p ON si.product_id = p.id";
$stmt = $pdo->query($sql);
$totalCOGS = $stmt->fetch()['total_cogs'] ?? 0;

// 3. Total Expenses
$stmt = $pdo->query("SELECT SUM(amount) as total FROM expenses");
$totalExpenses = $stmt->fetch()['total'] ?? 0;

// 4. Calculations
$grossProfit = $totalSales - $totalCOGS;
$netProfit = $grossProfit - $totalExpenses;

// Today's Sales (Keep for reference if needed, though UI might hide it)
$stmt = $pdo->query("SELECT SUM(total_amount) as total FROM sales WHERE sale_date >= CURDATE() AND sale_date < CURDATE() + INTERVAL 1 DAY");
$todaySales = $stmt->fetch()['total'] ?? 0;

// Monthly Expenses (Keep for reference)
$stmt = $pdo->query("SELECT SUM(amount) as total FROM expenses WHERE expense_date >= DATE_FORMAT(NOW() ,'%Y-%m-01') AND expense_date < DATE_FORMAT(NOW() + INTERVAL 1 MONTH ,'%Y-%m-01')");
$monthExpenses = $stmt->fetch()['total'] ?? 0;

echo json_encode([
    'todaySales' => (float)$todaySales,
    'monthExpenses' => (float)$monthExpenses,
    'totalSales' => (float)$totalSales,
    'totalExpenses' => (float)$totalExpenses,
    'totalCOGS' => (float)$totalCOGS,
    'netProfit' => (float)$netProfit
]);
?>
