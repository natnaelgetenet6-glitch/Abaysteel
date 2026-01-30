<?php
require_once '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 

$sql = "
    SELECT 
        id, sale_date as date, total_amount as amount, sell_type, processed_by as user, buyer_name, NULL as description, 'sale' as type 
    FROM sales
    UNION ALL
    SELECT 
        id, expense_date as date, amount, NULL as sell_type, NULL as user, NULL as buyer_name, description, 'expense' as type 
    FROM expenses
    ORDER BY date DESC
    LIMIT 500
";

$stmt = $pdo->query($sql);
echo json_encode($stmt->fetchAll());
?>
