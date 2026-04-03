import axios from 'axios';
import https from 'https';
import dotenv from 'dotenv';
dotenv.config();

const BMC_IP = process.env.BMC_IP || '192.168.1.234';
const BMC_USER = process.env.BMC_USER || 'admin';
const BMC_PASS = process.env.BMC_PASS || 'Admin123!';

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const client = axios.create({
  baseURL: `https://${BMC_IP}/`,
  httpsAgent,
  headers: {
    'Accept': 'application/json, text/plain, */*',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
  }
});

async function runSafeTest() {
  console.log('--- Attempting Safe Web Login ---');
  let csrfToken = '';
  let sessionCookies = '';

  try {
    const payload = new URLSearchParams({ username: BMC_USER, password: BMC_PASS });
    const res = await client.post('api/session', payload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (res.status === 200 && res.data.ok === 0) {
      csrfToken = res.data.CSRFToken;
      sessionCookies = res.headers['set-cookie']?.join('; ') || '';
      console.log('✅ Login Successful!');
    } else {
      console.error('Login returned 200 but failed.');
      return;
    }
  } catch (error: any) {
    console.error('❌ Failed to login. Response:', error.response?.data || error.message);
    return;
  }

  try {
    console.log('--- Fetching Sensors ---');
    const res = await client.get('api/sensors', { 
      headers: { 'X-CSRFTOKEN': csrfToken, 'Cookie': sessionCookies }
    });
    console.log(`✅ successfully fetched ${res.data.length || 0} sensors!`);
  } catch (error: any) {
    console.error('❌ Failed to fetch sensors.', error.message);
  }

  // --- CLEANUP IN THE RULE OF ART ---
  try {
    console.log('--- Safely Logging Out ---');
    // MegaRAC standard logout sequence: DELETE or POST to session endpoints. Sometimes it requires the CSRF token in the body or header. 
    // Usually DELETE /api/session is standard for Redfish/iKVM
    // But we will also try just clearing it if the API supports it.
    await client.delete('api/session', {
      headers: { 'X-CSRFTOKEN': csrfToken, 'Cookie': sessionCookies }
    });
    console.log('✅ Logged out successfully. Zero sessions leftover!');
  } catch (err: any) {
    if (err.response?.status === 405 || err.response?.status === 404) {
         // Attempt alternative MegaRAC logout
         try {
             await client.post('api/session/logout', {}, {
                headers: { 'X-CSRFTOKEN': csrfToken, 'Cookie': sessionCookies }
             });
             console.log('✅ Logged out successfully via alternative endpoint!');
         } catch(e: any) {
             console.error('⚠️ Could not log out from BMC:', e.message);
         }
    } else {
        console.error('⚠️ Could not log out from BMC:', err.message);
    }
  }
}

runSafeTest();
