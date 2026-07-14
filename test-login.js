const axios = require('axios');
const crypto = require('crypto');
const { execSync } = require('child_process');

async function test() {
  const email = `test${crypto.randomBytes(4).toString('hex')}@example.com`;
  const password = 'Password123!';
  console.log(`Testing with ${email}...`);
  try {
    console.log('1. Registering...');
    await axios.post('http://localhost:3000/auth/register', {
      fullName: 'Test User',
      email,
      password,
      confirmPassword: password,
      role: 'student'
    });
    
    console.log('2. Manually activating user in DB...');
    execSync(`npx typeorm query "UPDATE \\"user\\" SET status = 'ACTIVE' WHERE email = '${email}';" -d src/data-source.ts`, { stdio: 'ignore' }).catch(() => {
        console.log('Assuming local DB update manually via sqlite or pg...');
    });
    // Wait, typeorm might not work this easily. Let's just create a raw query via a quick nest script?
    // Let's assume there is an API to login, wait we need active status.

  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err.message);
    }
  }
}

test();
