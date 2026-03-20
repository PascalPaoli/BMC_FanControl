import * as fs from 'fs';
import { getSensors } from './bmcClient';
import * as dotenv from 'dotenv';
dotenv.config();

(async () => {
    try {
        const data = await getSensors();
        fs.writeFileSync('f:/AzWorkspace/BMC_FanControl/server/test_sensors.json', JSON.stringify(data, null, 2));
        console.log("Successfully wrote sensor data!");
    } catch (e: any) {
        console.error("Error:", e.message);
    }
})();
