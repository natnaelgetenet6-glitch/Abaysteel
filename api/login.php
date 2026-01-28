<?php
require_once '../db.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$username = $input['username'] ?? '';
$password = $input['password'] ?? ''; // Plain text password comparison as per previous implementation

if (!$username || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password required']);
    exit;
}

$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ?");
$stmt->execute([$username]);
$user = $stmt->fetch();

if ($user) {
    $is_match = false;
    // Check if it's a hash first
    if (password_verify($password, $user['password'])) {
        $is_match = true;
    } 
    // Fallback to plain text comparison for legacy/seeded users
    else if ($user['password'] === $password) {
        $is_match = true;
    }

    if ($is_match) {
        // Return user info (excluding password)
        unset($user['password']);
        echo json_encode($user);
    } else {
        http_response_code(401);
        echo json_encode([
            'error' => 'Invalid credentials',
            'debug' => 'Password mismatch for user: ' . $username
        ]);
    }
} else {
    http_response_code(401);
    echo json_encode([
        'error' => 'Invalid credentials',
        'debug' => 'User not found: ' . $username
    ]);
}

?>
