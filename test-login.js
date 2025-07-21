// Simple test for admin authentication flow
console.log('Testing admin authentication...');

async function testLogin() {
    try {
        // Test login
        const loginResponse = await fetch('/admin/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                login: 'admin',
                password: 'a50eddc79a2e2b559c72ccbf',
                rememberMe: false
            })
        });

        const loginData = await loginResponse.json();
        console.log('Login response:', loginData);

        if (loginData.success) {
            console.log('Login successful, testing session validation...');
            
            // Test session validation
            const validateResponse = await fetch('/admin/api/auth/validate', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${loginData.sessionId}`
                },
                credentials: 'include'
            });

            const validateData = await validateResponse.json();
            console.log('Validation response:', validateData);

            if (validateData.valid) {
                console.log('✅ Authentication flow working correctly!');
                console.log('Redirecting to dashboard...');
                window.location.href = '/admin/dashboard';
            } else {
                console.error('❌ Session validation failed');
            }
        } else {
            console.error('❌ Login failed:', loginData);
        }
    } catch (error) {
        console.error('❌ Test error:', error);
    }
}

// Auto-run test if on login page
if (window.location.pathname === '/admin/login') {
    // Wait for page to load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(testLogin, 2000); // Wait 2 seconds for login form to initialize
        });
    } else {
        setTimeout(testLogin, 2000);
    }
}
