<?php
require_once 'db.php';

echo "<h2>Diagnostic Tool: User Verification</h2>";

try {
    $targetUsers = [
        ['username' => 'abay', 'password' => '321', 'role' => 'admin'],
        ['username' => 'user', 'password' => '321', 'role' => 'shop']
    ];

    echo "<table border='1' cellpadding='10' style='border-collapse: collapse;'>";
    echo "<tr><th>Username</th><th>Expected Role</th><th>Status</th><th>Action</th></tr>";

    foreach ($targetUsers as $target) {
        $stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
        $stmt->execute([$target['username']]);
        $user = $stmt->fetch();

        echo "<tr>";
        echo "<td>" . htmlspecialchars($target['username']) . "</td>";
        echo "<td>" . $target['role'] . "</td>";
        
        if ($user) {
            $passMatch = ($user['password'] === $target['password']) ? "✅ Match" : "❌ Mismatch (DB Has: '" . htmlspecialchars($user['password']) . "')";
            echo "<td>Exists. Password: $passMatch</td>";
            echo "<td>-</td>";
        } else {
            echo "<td style='color: red;'>Missing</td>";
            echo "<td><a href='?action=create&user=" . urlencode($target['username']) . "&pass=" . urlencode($target['password']) . "&role=" . $target['role'] . "'>Create User</a></td>";
        }
        echo "</tr>";
    }
    echo "</table>";

    if (isset($_GET['action']) && $_GET['action'] === 'create') {
        $u = $_GET['user'];
        $p = $_GET['pass'];
        $r = $_GET['role'];
        
        $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
        $stmt->execute([$u, $p, $r]);
        echo "<p style='color: green; font-weight: bold;'>User '$u' created successfully! Please refresh.</p>";
    }

} catch (Exception $e) {
    echo "<p style='color: red;'>Error: " . $e->getMessage() . "</p>";
}
?>
