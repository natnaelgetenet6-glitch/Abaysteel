<?php
require_once '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Get Date Filters
$startDate = $_GET['startDate'] ?? date('Y-m-01'); // Default to first day of current month
$endDate = $_GET['endDate'] ?? date('Y-m-d'); // Default to today

// 1. Summary Stats
// ----------------

// 1a. Total Sales (Revenue)
$stmt = $pdo->prepare("SELECT SUM(total_amount) as total FROM sales WHERE sale_date >= ? AND sale_date <= ? + INTERVAL 1 DAY");
$stmt->execute([$startDate, $endDate]);
$totalSales = $stmt->fetch()['total'] ?? 0;

// 1b. Total Expenses
$stmt = $pdo->prepare("SELECT SUM(amount) as total FROM expenses WHERE expense_date >= ? AND expense_date <= ? + INTERVAL 1 DAY");
$stmt->execute([$startDate, $endDate]);
$totalExpenses = $stmt->fetch()['total'] ?? 0;

// 1c. Cost of Goods Sold (COGS)
// Join sale_items -> sales to filter by sale_date
// Join sale_items -> products to get buy_price (or use historical buy_price if available)
// Prefer historical buy_price from sale_items if your schema update ran
// Fallback to products.buy_price
$cogsSql = "
    SELECT SUM(si.quantity * COALESCE(NULLIF(si.buy_price, 0), p.buy_price, 0)) as total_cogs
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.sale_date >= ? AND s.sale_date <= ? + INTERVAL 1 DAY
";
$stmt = $pdo->prepare($cogsSql);
$stmt->execute([$startDate, $endDate]);
$totalCOGS = $stmt->fetch()['total_cogs'] ?? 0;

$grossProfit = $totalSales - $totalCOGS;
$netProfit = $grossProfit - $totalExpenses;


// 2. Weekly/Daily Profit Graph Data
// ---------------------------------
// Group by date to show trend over the filtered period
$trendSql = "
    SELECT 
        DATE(s.sale_date) as date,
        SUM(s.total_amount) as daily_revenue,
        (
            SELECT SUM(si2.quantity * COALESCE(NULLIF(si2.buy_price, 0), p2.buy_price, 0))
            FROM sale_items si2
            JOIN sales s2 ON si2.sale_id = s2.id
            LEFT JOIN products p2 ON si2.product_id = p2.id
            WHERE DATE(s2.sale_date) = DATE(s.sale_date)
        ) as daily_cogs
    FROM sales s
    WHERE s.sale_date >= ? AND s.sale_date <= ? + INTERVAL 1 DAY
    GROUP BY DATE(s.sale_date)
    ORDER BY DATE(s.sale_date) ASC
";
$stmt = $pdo->prepare($trendSql);
$stmt->execute([$startDate, $endDate]);
$trendData = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Format trend data for chart
$labels = [];
$profitData = [];
$salesData = [];

foreach ($trendData as $row) {
    $labels[] = $row['date'];
    $salesData[] = (float)$row['daily_revenue'];
    $gross = (float)$row['daily_revenue'] - (float)$row['daily_cogs'];
    $profitData[] = $gross; 
    // Note: Net profit graph is harder per day because expenses are separate table. 
    // Gross profit is usually what's graphed unless we union expenses.
    // Let's stick to Gross Profit trend for now as it maps 1:1 with sales.
}


// 3. Top Selling Items
// --------------------
$topSql = "
    SELECT 
        COALESCE(si.product_name, p.name) as name,
        SUM(si.quantity) as total_qty,
        SUM(si.subtotal) as total_revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    LEFT JOIN products p ON si.product_id = p.id
    WHERE s.sale_date >= ? AND s.sale_date <= ? + INTERVAL 1 DAY
    GROUP BY COALESCE(si.product_name, p.name)
    ORDER BY total_revenue DESC
    LIMIT 5
";
$stmt = $pdo->prepare($topSql);
$stmt->execute([$startDate, $endDate]);
$topSells = $stmt->fetchAll(PDO::FETCH_ASSOC);


// Return JSON
echo json_encode([
    'params' => ['start' => $startDate, 'end' => $endDate],
    'stats' => [
        'totalSales' => (float)$totalSales,
        'totalExpenses' => (float)$totalExpenses,
        'grossProfit' => (float)$grossProfit,
        'netProfit' => (float)$netProfit
    ],
    'trend' => [
        'labels' => $labels,
        'profit' => $profitData,
        'revenue' => $salesData
    ],
    'topSells' => $topSells
]);
?>
