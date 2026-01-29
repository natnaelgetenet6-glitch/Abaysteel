<?php
require_once 'db.php';
header('Content-Type: text/plain');

function dumpTable($pdo, $table) {
    echo "--- Table: $table ---\n";
    try {
        $stmt = $pdo->query("SHOW CREATE TABLE `$table` text");
        $res = $stmt->fetch();
        if ($res) {
            echo $res['Create Table'] . "\n\n";
        }
    } catch (Exception $e) {
        echo "Error: " . $e->getMessage() . "\n\n";
    }
}

try {
    $tables = $pdo->query("SHOW TABLES")->fetchAll(PDO::FETCH_COLUMN);
    foreach ($tables as $table) {
        dumpTable($pdo, $table);
    }
    
    echo "--- Constraint Check ---\n";
    $sql = "SELECT 
                TABLE_NAME, 
                COLUMN_NAME, 
                CONSTRAINT_NAME, 
                REFERENCED_TABLE_NAME, 
                REFERENCED_COLUMN_NAME
            FROM
                INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE
                REFERENCED_TABLE_SCHEMA = 'abaystee_' 
                AND REFERENCED_TABLE_NAME = 'products'";
    
    $stmt = $pdo->query($sql);
    foreach ($stmt->fetchAll() as $row) {
        print_r($row);
    }

} catch (Exception $e) {
    echo "Overall Error: " . $e->getMessage();
}
?>
