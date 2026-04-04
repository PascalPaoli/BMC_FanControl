You are an AI coding assistant resuming work on the **BMC Fan Control Dashboard**, a custom React over Fastify/Node project controlling an Asus WRX90/WRX80 MegaRAC BMC.

**WHAT WAS ACHIEVED IN THE PREVIOUS SESSION:**
1. **Flawless UI Layout:** We perfected the `App.tsx` CSS Grid layout. The Left Column (Motherboard SVG) and Right Column (Curve Editor + Presets) now align beautifully.
2. **Telemetry Coordinates:** We calibrated absolute `X/Y` percentages inside `MotherboardMap.tsx` for all thermal badges (PCIE1/3/5/7, DIMM banks) and fan headers.
3. **Sensor Filtering & Aliasing:** The UI automatically hides disabled/N/A sensors. We also implemented double-click inline editable ALIASES for Fan headers (e.g. rename `CHA_FAN3` to `TOP_INTAKE`) which saves to `localStorage` while retaining the hardware name on hover.
4. **Live Hardware Sync:** We implemented a `getZoneCurve` backend route (`/api/fans/zone-curve/:zoneId`). The UI instantaneously queries the backend when a user clicks on a Fan Header, loading the active hardware 5-point curve straight from the BMC into the interactive curve editor!

**CURRENT BLOCKERS & YOUR OBJECTIVE FOR THIS SESSION:**
The User Interface is virtually finalized and successfully communicating discrete pulls from the backend. 
However, the backend (`server/src/bmcClient.ts`) relies heavily on standard Web HTTP requests, causing polling to be slow and precarious on the BMC processors.

**YOUR EXACT IMMEDIATE GOALS:**
1. **Transition to Redfish/IPMI:** Review `doc/Plan.md`. We must migrate the polling and command logic away from the heavy Web API and over to Redfish REST APIs or IPMI raw UDP payloads for lightweight, high-frequency polling.
2. **Pushing Zone Controls:** We can *read* individual zones perfectly now, but ensure the backend `applyZoneCurve` logic is correctly formatting and pushing payloads back to the distinct 7 PWM zones when the user clicks 'Apply'.

**INSTRUCTIONS:**
Please start by checking the status of Redfish / IPMI connectivity. Look at `server/src/ipmiClient.ts` if it exists, and ask the user if they were able to enable IPMI over LAN in their BMC Dashboard settings. Proceed to optimize the backend!
