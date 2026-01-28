<?php
require_once 'db.php';
header('Content-Type: text/plain');
try {
    $stmt = $pdo->query("DESCRIBE users");
    print_r($stmt->fetchAll());
} catch (Exception $e) {
    echo $e->getMessage();
}
?>
