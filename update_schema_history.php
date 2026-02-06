<?php
require_once 'db.php';

echo "Updating database schema...\n";

try {
    // Add columns to sale_items if they don't exist
    $columns = [
        'product_name' => "VARCHAR(255) DEFAULT NULL",
        'dimensions' => "VARCHAR(100) DEFAULT NULL",
        'buy_price' => "DECIMAL(10, 2) DEFAULT 0.00"
    ];

    foreach ($columns as $col => $def) {
        try {
            // Check if column exists
            $check = $pdo->query("SHOW COLUMNS FROM sale_items LIKE '$col'");
            if ($check->rowCount() == 0) {
                echo "Adding column $col...\n";
                $pdo->exec("ALTER TABLE sale_items ADD COLUMN $col $def");
            } else {
                echo "Column $col already exists.\n";
            }
        } catch (PDOException $e) {
            echo "Error checking/adding $col: " . $e->getMessage() . "\n";
        }
    }

    // Backfill existing data from products table
    echo "Backfilling historical data...\n";
    $sql = "
        UPDATE sale_items si
        JOIN products p ON si.product_id = p.id
        SET 
            si.product_name = p.name,
            si.dimensions = p.dimensions,
            si.buy_price = p.buy_price
        WHERE si.product_name IS NULL
    ";
    $rows = $pdo->exec($sql);
    echo "Updated $rows existing rows.\n";

    echo "Database update completed successfully.\n";

} catch (PDOException $e) {
    echo "Critical Error: " . $e->getMessage() . "\n";
}
?>
