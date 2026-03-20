import axios from 'axios';
import https from 'https';

const BMC_IP = '192.168.1.234';
const USER = 'admin';
const PASS = 'Admin123!';

const client = axios.create({
  baseURL: `https://${BMC_IP}/`,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  timeout: 5000,
  validateStatus: () => true // Handle 403/etc without throwing
});

async function tryWebLogin() {
  console.log("--- Attempting MegaRAC Web Login with CSRF ---");
  
  // Try to GET any page to receive cookies and a CSRF token
  let token = "";
  let cookies = "";
  
  const initial = await client.get('api/session');
  console.log("GET /api/session Status:", initial.status);
  
  if (initial.headers['set-cookie']) {
    cookies = initial.headers['set-cookie'].join('; ');
  }
  
  if (initial.headers['x-csrftoken']) token = initial.headers['x-csrftoken'];
  else if (initial.data && initial.data.CSRFToken) token = initial.data.CSRFToken;
  
  console.log("Extracted CSRF:", token, "Cookies:", cookies);
  
  const headers: any = {
      'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (token) headers['X-CSRFTOKEN'] = token;
  if (cookies) headers['Cookie'] = cookies;

  const login = await client.post('api/session', `username=${USER}&password=${PASS}`, { headers });
  console.log("POST /api/session Status:", login.status);
  console.log("Headers:", login.headers);
  console.log("Body:", typeof login.data === 'string' ? login.data.slice(0, 200) : login.data);
  
  // Let's also test a fallback Redfish Basic auth with lowercase 'admin'
  console.log("\n--- Testing Redfish Basic Auth again ---");
  const redfish = await client.get('redfish/v1/Chassis/1', {
      headers: { 'Authorization': 'Basic ' + Buffer.from('admin:Admin123!').toString('base64') }
  });
  console.log("Redfish Basic Status:", redfish.status);
  console.log("Redfish Basic Body:", redfish.data);
}

tryWebLogin();
