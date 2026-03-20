import axios from 'axios';
import https from 'https';

const BMC_IP = '192.168.1.234';
const USER = 'admin';
const PASS = 'admin';

const client = axios.create({
  baseURL: `https://${BMC_IP}/`,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 5000
});

async function testAll() {
  console.log("--- Testing Redfish Session Auth ---");
  try {
    const res = await client.post('redfish/v1/SessionService/Sessions', { UserName: USER, Password: PASS });
    console.log("✅ Redfish Session SUCCESS. Token:", res.headers['x-auth-token']);
  } catch (e: any) {
    console.error("❌ Redfish Session FAILED:", e.response?.status, JSON.stringify(e.response?.data));
  }

  console.log("\n--- Testing Megarac Web API (JSON) ---");
  try {
    const res = await client.post('api/session', { username: USER, password: PASS }, {
        headers: { 'Content-Type': 'application/json' }
    });
    console.log("✅ Web API JSON SUCCESS.", res.headers['set-cookie'] || 'No Cookies', res.data);
  } catch (e: any) {
    console.error("❌ Web API JSON FAILED:", e.response?.status, e.response?.data);
  }

  console.log("\n--- Testing Megarac Web API (Form-UrlEncoded) ---");
  try {
    const res = await client.post('api/session', `username=${USER}&password=${PASS}`, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    console.log("✅ Web API Form SUCCESS.", res.headers['set-cookie'] || 'No Cookies', res.data);
  } catch (e: any) {
    console.error("❌ Web API Form FAILED:", e.response?.status, e.response?.data);
  }
}

testAll();
