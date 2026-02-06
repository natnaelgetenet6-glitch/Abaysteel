<?php
// db.php
$host = 'mysql-db03.remote';
$port = 33636;
$db   = 'abaystee_';
$user = 'ABuser';
$pass = 'Mo0918124803';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);

    // SELF-HEALING: Add shop_quantity if missing
    $check = $pdo->query("SHOW COLUMNS FROM products LIKE 'shop_quantity'")->fetch();
    if (!$check) {
        $pdo->exec("ALTER TABLE products ADD COLUMN shop_quantity INT NOT NULL DEFAULT 0 AFTER stock_quantity");
    }

    // SELF-HEALING: Ensure 'stock' role exists in users table
    $userRoleCheck = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'")->fetch();
    if ($userRoleCheck && strpos($userRoleCheck['Type'], 'stock') === false) {
        $pdo->exec("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'shop', 'stock') NOT NULL DEFAULT 'shop'");
    }

    // SELF-HEALING: Add history columns to sale_items if missing
    $historyCheck = $pdo->query("SHOW COLUMNS FROM sale_items LIKE 'product_name'")->fetch();
    if (!$historyCheck) {
        // Add columns
        $pdo->exec("ALTER TABLE sale_items 
            ADD COLUMN product_name VARCHAR(255) DEFAULT NULL,
            ADD COLUMN dimensions VARCHAR(100) DEFAULT NULL,
            ADD COLUMN buy_price DECIMAL(10, 2) DEFAULT 0.00
        ");
        
        // Backfill historical data
        $pdo->exec("UPDATE sale_items si
            JOIN products p ON si.product_id = p.id
            SET 
                si.product_name = p.name,
                si.dimensions = p.dimensions,
                si.buy_price = p.buy_price
            WHERE si.product_name IS NULL
        ");
    }


} catch (\PDOException $e) {
    // Return JSON error response if connection fails
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
?>
