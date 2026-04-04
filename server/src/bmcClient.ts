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
let lockoutUntil: number = 0;

export const authenticate = async () => {
  if (Date.now() < lockoutUntil) {
     throw new Error(`BMC is locked. Cooling down for ${Math.ceil((lockoutUntil - Date.now())/1000)} seconds.`);
  }

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
    lockoutUntil = Date.now() + 15000; // 15 second cooldown before allowing another login attempt!
    throw new Error("BMC Authentication Failed");
  }
}

export const logOutSafely = async () => {
  if (!csrfToken || !sessionCookies) return;
  try {
      await client.delete('api/session', {
          headers: { 'X-CSRFTOKEN': csrfToken, 'Cookie': sessionCookies }
      });
      csrfToken = null;
      sessionCookies = '';
  } catch (err) {
      // Fallback
      try {
          await client.post('api/session/logout', {}, {
              headers: { 'X-CSRFTOKEN': csrfToken!, 'Cookie': sessionCookies }
           });
          csrfToken = null;
          sessionCookies = '';
      } catch (e) {
          // ignore
      }
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

export const getZoneCurve = async (zoneId: number) => {
  const { csrfToken: token, sessionCookies: cookie } = await authenticate();

  try {
      const res = await client.get('api/fanctrl/PWM', {
        headers: { 'X-CSRFTOKEN': token, 'Cookie': cookie }
      });
      const zoneData = res.data[zoneId];
      if (!zoneData || !zoneData.CurrentPWMdata) {
          throw new Error("Zone curve data not found");
      }
      
      const pts = zoneData.CurrentPWMdata;
      return {
          a: { temp: pts[0]?.Temp || 0, duty: pts[0]?.Duty || 20 },
          b: { temp: pts[1]?.Temp || 20, duty: pts[1]?.Duty || 20 },
          c: { temp: pts[2]?.Temp || 60, duty: pts[2]?.Duty || 60 },
          d: { temp: pts[3]?.Temp || 80, duty: pts[3]?.Duty || 100 }
      };
  } catch (error: any) {
      console.error(`Failed to fetch zone curve for zone ${zoneId}:`, error.message);
      throw new Error(`Failed to fetch zone curve`);
  }
}

export const applyZoneCurve = async (zoneId: number, curve: any, customUrl?: string) => {
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
  const payload = {
      PWMIndex: zoneId,
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
          successEndpoint = ep; 
          savedZone = true;
          break;
      }
    } catch (e: any) {
      // Ignore and try next endpoint
    }
  }
  
  if (!savedZone) {
      console.error(`Zone ${zoneId} failed to save on all guessed endpoints.`);
      throw new Error(`Failed to save curve for zone ${zoneId}`);
  }

  return { success: true, endpointUsed: successEndpoint, zoneId };
}

export const applyMasterCurve = async (curve: any, customUrl?: string) => {
  let successEndpoint = null;
  // Apply the same curve to all 7 zones
  for (let i = 0; i <= 6; i++) {
    try {
      const result = await applyZoneCurve(i, curve, customUrl);
      if (result.endpointUsed) successEndpoint = result.endpointUsed;
    } catch (e: any) {
      console.error(`Failed to apply master curve to zone ${i}`, e);
    }
  }

  return { success: true, endpointUsed: successEndpoint };
}
