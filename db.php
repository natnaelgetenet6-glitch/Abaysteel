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
    $pdo->exec("ALTER TABLE products ADD COLUMN IF NOT EXISTS shop_quantity INT NOT NULL DEFAULT 0 AFTER stock_quantity");

} catch (\PDOException $e) {
    // Return JSON error response if connection fails
    header('Content-Type: application/json');
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}
?>
