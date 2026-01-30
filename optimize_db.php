<?php
require_once 'db.php';

header('Content-Type: text/html');
echo "<h1>Optimizing Database...</h1>";

try {
    // Sales Indices
    echo "Adding index on sales(sale_date)... ";
    try {
        $pdo->exec("CREATE INDEX idx_sale_date ON sales(sale_date)");
        echo "<span style='color:green'>DONE</span><br>";
    } catch (Exception $e) {
        echo "<span style='color:grey'>Skipped (probably exists): " . $e->getMessage() . "</span><br>";
    }

    // Expense Indices
    echo "Adding index on expenses(expense_date)... ";
    try {
        $pdo->exec("CREATE INDEX idx_expense_date ON expenses(expense_date)");
        echo "<span style='color:green'>DONE</span><br>";
    } catch (Exception $e) {
        echo "<span style='color:grey'>Skipped (probably exists): " . $e->getMessage() . "</span><br>";
    }

    echo "<h3>Optimization Complete! System should be faster now.</h3>";

} catch (Exception $e) {
    echo "<h2 style='color:red'>Error</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
}
?>
