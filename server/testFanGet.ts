import { authenticate } from './src/bmcClient.ts';
import axios from 'axios';
import https from 'https';

(async () => {
    try {
        const { csrfToken: token, sessionCookies: cookie } = await authenticate();
        const client = axios.create({
            baseURL: 'https://192.168.1.234/',
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });
        const res = await client.get('api/fanctrl/PWM', {
            headers: {
                'X-CSRFTOKEN': token,
                'Cookie': cookie
            }
        });
        console.log(JSON.stringify(res.data, null, 2));
    } catch(e) {
        console.error("Error", e.message);
    }
})();
