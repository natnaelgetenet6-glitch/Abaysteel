<?php
require_once 'db.php';

header('Content-Type: text/html');

echo "<h1>Database Fixer</h1>";

try {
    echo "<p>Attempting to fix database constraints...</p>";

    // 1. Drop the specific constraint causing the error
    // We wrap in try-catch in case it's already gone or named differently, 
    // but the error message confirmed it is 'fk_item_product'.
    try {
        echo "Dropping constraint 'fk_item_product'... ";
        $pdo->exec("ALTER TABLE `sale_items` DROP FOREIGN KEY `fk_item_product`");
        echo "<span style='color:green'>DONE</span><br>";
    } catch (Exception $e) {
        echo "<span style='color:orange'>Warning: Could not drop constraint (might not exist): " . $e->getMessage() . "</span><br>";
    }

    // 2. Add it back with CASCADE
    echo "Adding constraint 'fk_item_product' with ON DELETE CASCADE... ";
    $sql = "ALTER TABLE `sale_items` 
            ADD CONSTRAINT `fk_item_product` 
            FOREIGN KEY (`product_id`) 
            REFERENCES `products` (`id`) 
            ON DELETE CASCADE";
    $pdo->exec($sql);
    echo "<span style='color:green'>DONE</span><br>";

    echo "<h3>SUCCESS! You can now delete items.</h3>";
    echo "<p>Please go back to the app and try again.</p>";

} catch (Exception $e) {
    echo "<h2 style='color:red'>Error</h2>";
    echo "<p>" . $e->getMessage() . "</p>";
}
?>
