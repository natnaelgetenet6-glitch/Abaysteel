<?php
// api/users.php
require_once '../db.php';
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    switch ($method) {
        case 'GET':
            // List all users (excluding passwords)
            $stmt = $pdo->query("SELECT id, username, role, created_at FROM users ORDER BY username ASC");
            $users = $stmt->fetchAll();
            echo json_encode($users);
            break;

        case 'POST':
            // Create or update user
            $data = json_decode(file_get_contents('php://input'), true);
            
            if (!$data || !isset($data['username']) || !isset($data['role'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields']);
                break;
            }

            $username = $data['username'];
            $role = $data['role'];
            $id = isset($data['id']) ? $data['id'] : null;
            $password = isset($data['password']) && !empty($data['password']) ? $data['password'] : null;

            if ($id) {
                // Update
                if ($password) {
                    $stmt = $pdo->prepare("UPDATE users SET username = ?, role = ?, password = ? WHERE id = ?");
                    $stmt->execute([$username, $role, $password, $id]);
                } else {
                    $stmt = $pdo->prepare("UPDATE users SET username = ?, role = ? WHERE id = ?");
                    $stmt->execute([$username, $role, $id]);
                }
                echo json_encode(['success' => true, 'message' => 'User updated']);
            } else {
                // Create
                if (!$password) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Password is required for new users']);
                    break;
                }
                $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
                $stmt->execute([$username, $password, $role]);
                echo json_encode(['success' => true, 'message' => 'User created', 'id' => $pdo->lastInsertId()]);
            }
            break;

        case 'DELETE':
            // Delete user
            if (!isset($_GET['id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing user ID']);
                break;
            }
            $id = $_GET['id'];
            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'User deleted']);
            break;

        default:
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
            break;
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}
?>
