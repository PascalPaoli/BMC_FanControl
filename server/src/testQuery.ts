import { getSensors, authenticate } from './bmcClient';
import 'dotenv/config';

(async () => {
  try {
    console.log(`Authenticating to BMC... USER=${process.env.BMC_USER} PASS=${process.env.BMC_PASS}`);
    const token = await authenticate();
    console.log("Success! Session Token received.");

    console.log("Fetching Chassis Thermal/Sensor Data...");
    const data = await getSensors();
    console.log("Response:", JSON.stringify(data).slice(0, 500) + '... (truncated)');
    console.log("Run completed successfully.");
  } catch (err: any) {
    console.error("Test Error:", err.message);
  }
})();
