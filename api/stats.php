<?php
require_once '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 

// Today's Sales
$stmt = $pdo->query("SELECT SUM(total_amount) as total FROM sales WHERE DATE(created_at) = CURDATE()");
$todaySales = $stmt->fetch()['total'] ?? 0;

// Monthly Expenses
$stmt = $pdo->query("SELECT SUM(amount) as total FROM expenses WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())");
$monthExpenses = $stmt->fetch()['total'] ?? 0;

// All Time Net Income
$stmt = $pdo->query("SELECT SUM(total_amount) as total FROM sales");
$totalSales = $stmt->fetch()['total'] ?? 0;

$stmt = $pdo->query("SELECT SUM(amount) as total FROM expenses");
$totalExpenses = $stmt->fetch()['total'] ?? 0;

$netIncome = $totalSales - $totalExpenses;

echo json_encode([
    'todaySales' => (float)$todaySales,
    'monthExpenses' => (float)$monthExpenses,
    'netIncome' => (float)$netIncome
]);
?>
