<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Management - Nat Steel</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Outfit:wght@700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css">
    <style>
        body { overflow: auto; height: auto; }
        #app { min-height: 100vh; height: auto; padding-bottom: 3rem; }
        .container { max-width: 1000px; margin: 0 auto; width: 100%; }
        .header-actions { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .back-link { color: var(--text-accent); text-decoration: none; font-weight: 600; display: flex; align-items: center; gap: 0.5rem; }
        .back-link:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <div id="app">
        <div class="container" style="margin-top: 2rem;">
            <div class="header-actions">
                <a href="index.html" class="back-link">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                    Back to Dashboard
                </a>
                <h1>User Management</h1>
            </div>

            <div class="glass-panel" style="padding: 2rem; margin-bottom: 2rem;">
                <h3>Add / Edit User</h3>
                <form id="standalone-user-form" style="display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; margin-top: 1.5rem;">
                    <input type="hidden" id="s-user-id">
                    
                    <div style="flex: 2; min-width: 200px;">
                        <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.4rem;">Username</label>
                        <input type="text" id="s-user-username" placeholder="Username" class="input-field" required>
                    </div>

                    <div style="flex: 2; min-width: 200px;">
                        <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.4rem;">Password</label>
                        <input type="password" id="s-user-password" placeholder="Password" class="input-field">
                        <small style="color: var(--text-secondary); font-size: 0.7rem;">Leave blank to keep current password when editing</small>
                    </div>

                    <div style="width: 160px;">
                        <label style="display: block; font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.4rem;">Role</label>
                        <select id="s-user-role" class="input-field" required>
                            <option value="shop">Shop (User)</option>
                            <option value="stock">Stock Manager</option>
                            <option value="admin">Administrator</option>
                        </select>
                    </div>

                    <div style="display: flex; gap: 0.5rem; width: 100%; margin-top: 1rem;">
                        <button type="submit" id="s-save-btn" class="btn btn-primary" style="width: auto; padding: 0.75rem 2.5rem;">Create User</button>
                        <button type="button" id="s-cancel-btn" class="btn hidden" style="width: auto; padding: 0.75rem 2.5rem; background: var(--bg-hover);">Cancel Edit</button>
                    </div>
                </form>
            </div>

            <div class="glass-panel" style="padding: 1.5rem; overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; min-width: 600px;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); text-align: left;">
                            <th style="padding: 1rem; color: var(--text-secondary);">Username</th>
                            <th style="padding: 1rem; color: var(--text-secondary);">Role</th>
                            <th style="padding: 1rem; color: var(--text-secondary);">Joined Date</th>
                            <th style="padding: 1rem; color: var(--text-secondary); text-align: right;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="s-users-list">
                        <!-- Users will be loaded here -->
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <script>
        const API_URL = 'api/users.php';
        let currentUser = JSON.parse(localStorage.getItem('nat_current_user'));

        // Guard: Only admins can access this page
        if (!currentUser || currentUser.role !== 'admin') {
            alert('Access Denied: Administrators only.');
            window.location.href = 'index.html';
        }

        async function loadUsers() {
            try {
                const res = await fetch(API_URL);
                const users = await res.json();
                renderUsers(users);
            } catch (err) {
                console.error('Error loading users:', err);
            }
        }

        function renderUsers(users) {
            const list = document.getElementById('s-users-list');
            list.innerHTML = '';
            
            users.forEach(user => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                tr.innerHTML = `
                    <td style="padding: 1rem; font-weight: 600;">${user.username}</td>
                    <td style="padding: 1rem;"><span style="background: ${user.role === 'admin' ? 'rgba(14, 165, 233, 0.2)' : (user.role === 'stock' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(148, 163, 184, 0.1)')}; color: ${user.role === 'admin' ? 'var(--text-accent)' : (user.role === 'stock' ? 'var(--success-color)' : 'inherit')}; padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem;">${user.role.toUpperCase()}</span></td>
                    <td style="padding: 1rem; color: var(--text-secondary); font-size: 0.9rem;">${new Date(user.created_at).toLocaleDateString()}</td>
                    <td style="padding: 1rem; text-align: right;">
                        <button onclick='editUser(${JSON.stringify(user)})' class="btn-icon" style="color: var(--primary-color); margin-right: 1rem;">Edit</button>
                        <button onclick="deleteUser(${user.id})" class="btn-icon" style="color: var(--danger-color);">Delete</button>
                    </td>
                `;
                list.appendChild(tr);
            });
        }

        function editUser(user) {
            document.getElementById('s-user-id').value = user.id;
            document.getElementById('s-user-username').value = user.username;
            document.getElementById('s-user-role').value = user.role;
            document.getElementById('s-user-password').value = '';
            document.getElementById('s-save-btn').textContent = 'Update User';
            document.getElementById('s-cancel-btn').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        async function deleteUser(id) {
            if (confirm('Are you sure you want to delete this user?')) {
                try {
                    const res = await fetch(`${API_URL}?id=${id}`, { method: 'DELETE' });
                    if (res.ok) {
                        loadUsers();
                    } else {
                        alert('Error deleting user');
                    }
                } catch (err) {
                    console.error('Delete error:', err);
                }
            }
        }

        document.getElementById('standalone-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('s-user-id').value;
            const username = document.getElementById('s-user-username').value;
            const password = document.getElementById('s-user-password').value;
            const role = document.getElementById('s-user-role').value;

            if (!id && !password) {
                alert('Password is required for new users');
                return;
            }

            const payload = { username, role };
            if (id) payload.id = id;
            if (password) payload.password = password;

            try {
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();
                if (data.success) {
                    alert('User saved successfully');
                    e.target.reset();
                    resetForm();
                    loadUsers();
                } else {
                    alert('Error: ' + data.error);
                }
            } catch (err) {
                console.error('Save error:', err);
                alert('Failed to save user');
            }
        });

        document.getElementById('s-cancel-btn').addEventListener('click', resetForm);

        function resetForm() {
            document.getElementById('s-user-id').value = '';
            document.getElementById('s-user-username').value = '';
            document.getElementById('s-user-password').value = '';
            document.getElementById('s-save-btn').textContent = 'Create User';
            document.getElementById('s-cancel-btn').classList.add('hidden');
        }

        loadUsers();
    </script>
</body>
</html>
