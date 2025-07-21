const bcrypt = require('bcrypt');
const Database = require('sqlite3').Database;

const db = new Database('./data/articles.db');

// Get the admin user
db.get('SELECT * FROM admin_users WHERE username = ?', ['admin'], async (err, user) => {
    if (err) {
        console.error('Database error:', err);
        return;
    }
    
    if (!user) {
        console.log('No admin user found');
        return;
    }
    
    console.log('Admin user found:', {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_active: user.is_active
    });
    
    // Test password
    const testPassword = 'a50eddc79a2e2b559c72ccbf';
    try {
        const isValid = await bcrypt.compare(testPassword, user.password_hash);
        console.log('Password valid:', isValid);
        
        if (!isValid) {
            console.log('Password hash:', user.password_hash.substring(0, 20) + '...');
            console.log('Test password:', testPassword);
        }
    } catch (error) {
        console.error('Password comparison error:', error);
    }
    
    db.close();
});
