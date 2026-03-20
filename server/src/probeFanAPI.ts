import { authenticate } from './bmcClient';
import axios from 'axios';
import https from 'https';

const BMC_IP = process.env.BMC_IP || '192.168.1.234';

const client = axios.create({
  baseURL: `https://${BMC_IP}/`,
  httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  validateStatus: () => true
});

const endpoints = [
  'api/settings/fan-control',
  'api/settings/fan_control',
  'api/settings/fan',
  'api/settings/fans',
  'api/fan-control',
  'api/fans',
  'api/cooling',
  'api/settings/thermal',
  'api/sensors/fans'
];

async function probe() {
    console.log("Authenticating...");
    const { csrfToken, sessionCookies } = await authenticate();
    console.log("Tokens attached. Probing endpoints...");
    
    for (const ep of endpoints) {
        process.stdout.write(`Testing GET /${ep}... `);
        const res = await client.get(ep, {
            headers: {
                'X-CSRFTOKEN': csrfToken,
                'Cookie': sessionCookies
            }
        });
        
        console.log(res.status);
        if (res.status === 200) {
            console.log("SUCCESS! Payload:", JSON.stringify(res.data).slice(0, 500));
        }
    }
}

probe();
