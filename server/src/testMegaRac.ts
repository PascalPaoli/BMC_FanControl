import axios from 'axios';
import https from 'https';

const BMC_IP = '192.168.1.234';
const USER = 'admin';
const PASS = 'Admin123!';

const client = axios.create({
  baseURL: `https://${BMC_IP}/`,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 5000,
  validateStatus: () => true, // Don't throw on error
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest', // Often required by MegaRAC CSRF protection
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
});

async function main() {
  console.log("--- Attempting MegaRAC Web Login ---");
  
  const payload = new URLSearchParams({
    username: USER,
    password: PASS
  });

  const loginResponse = await client.post('api/session', payload.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  console.log(`Login Status: ${loginResponse.status} ${loginResponse.statusText}`);
  
  if (loginResponse.status === 200 && loginResponse.data.ok === 0) {
    console.log("✅ Success! Token:", loginResponse.data.CSRFToken);
    
    // Extract QSESSIONID
    const cookies = loginResponse.headers['set-cookie']?.join('; ') || '';
    const csrfToken = loginResponse.data.CSRFToken;

    console.log("--- Fetching /api/sensors ---");
    const sensorsResponse = await client.get('api/sensors', {
      headers: {
        'Cookie': cookies,
        'X-CSRFTOKEN': csrfToken
      }
    });
    
    console.log(`Sensors Status: ${sensorsResponse.status}`);
    console.log(JSON.stringify(sensorsResponse.data).slice(0, 300) + '... (truncated)');
  } else {
    console.log("❌ Failed to login. Response:", loginResponse.data);
  }
}

main();
