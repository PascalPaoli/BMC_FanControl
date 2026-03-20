import axios from 'axios';
import https from 'https';

const BMC_IP = process.env.BMC_IP || '192.168.1.234';
const BMC_USER = process.env.BMC_USER || 'admin';
const BMC_PASS = process.env.BMC_PASS || 'Admin123!';

// Base axios client ignoring self-signed certificate errors
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

let csrfToken: string | null = null;
let sessionCookies: string = '';

export const authenticate = async () => {
  if (csrfToken && sessionCookies) return { csrfToken, sessionCookies };

  if (!BMC_USER || !BMC_PASS) {
      throw new Error("Missing BMC_USER or BMC_PASS in environment variables.");
  }

  try {
    const payload = new URLSearchParams({ username: BMC_USER, password: BMC_PASS });
    const res = await client.post('api/session', payload.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (res.status === 200 && res.data.ok === 0) {
      csrfToken = res.data.CSRFToken;
      sessionCookies = res.headers['set-cookie']?.join('; ') || '';
      return { csrfToken, sessionCookies };
    } else {
      throw new Error("Login endpoint did not return OK");
    }
  } catch (error: any) {
    console.error("Authentication failed:", error.response?.status || error.message);
    throw new Error("BMC Authentication Failed");
  }
}

export const getSensors = async () => {
  const { csrfToken: token, sessionCookies: cookie } = await authenticate();
  
  try {
      const res = await client.get('api/sensors', { 
        headers: { 
          'X-CSRFTOKEN': token,
          'Cookie': cookie
        }
      });
      return res.data;
  } catch (error: any) {
      // If unauthorized, clear tokens to force re-auth next time
      if (error.response?.status === 401 || error.response?.status === 403) {
         csrfToken = null;
         sessionCookies = '';
      }
      console.error("Failed to fetch sensors:", error.message);
      throw new Error("Failed to fetch sensors");
  }
}

export const applyMasterCurve = async (curve: any, customUrl?: string) => {
  const { csrfToken: token, sessionCookies: cookie } = await authenticate();
  
  // Format the array: ["tempA","dutyA","tempB","dutyB","tempC","dutyC","tempD","dutyD", 100, 100]
  const CurrentPWMdata = [
    String(curve.a.temp), String(curve.a.duty),
    String(curve.b.temp), String(curve.b.duty),
    String(curve.c.temp), String(curve.c.duty),
    String(curve.d.temp), String(curve.d.duty),
    100, 100
  ];

  const possibleEndpoints = customUrl ? [customUrl] : [
    'api/fanctrl/PWM',
  ];

  let successEndpoint = null;

  for (let i = 0; i <= 6; i++) {
    const payload = {
       PWMIndex: i,
       PWMSrc: 0,
       CurrentPWMdata
    };

    let savedZone = false;
    for (const ep of possibleEndpoints) {
      try {
        const res = await client.put(ep, payload, {
          headers: {
            'X-CSRFTOKEN': token,
            'Cookie': cookie,
             'Content-Type': 'application/json'
          }
        });
        if (res.status === 200 || res.status === 204) {
           successEndpoint = ep; // found the right endpoint
           savedZone = true;
           break;
        }
      } catch (e: any) {
        // likely 404, we will try the next endpoint
      }
    }
    
    if (!savedZone) {
       console.error(`Zone ${i} failed to save on all guessed endpoints.`);
    }
  }

  return { success: true, endpointUsed: successEndpoint };
}
