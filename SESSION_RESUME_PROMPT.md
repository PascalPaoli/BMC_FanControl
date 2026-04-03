You are an AI coding assistant resuming work on the **BMC Fan Control Dashboard**, a custom React over Fastify/Node project controlling an Asus WRX90/WRX80 MegaRAC BMC.

**WHAT WAS ACHIEVED IN THE PREVIOUS SESSION:**
1. **Flawless UI Layout:** We perfected the `App.tsx` CSS Grid layout. The Left Column (Motherboard SVG) and Right Column (Curve Editor + Presets) now align beautifully using organic Flexbox constraints without relying on ugly `aspect-square` pixel clipping or margin hacks. 
2. **Telemetry Coordinates:** We calibrated absolute `X/Y` percentages inside `MotherboardMap.tsx` for all thermal badges (CPU, GPU, RAM, LAN, Chipset, PCIE1, PCIE3, PCIE5, PCIE7) and fan headers.
3. **Sensor Filtering:** The UI is actively programmed to automatically hide any `N/A` or Disabled sensors coming from the BMC (such as PCIE sensors mapped to empty slots or consumer GPUs that lack SMBus temperature reporting).
4. **Custom Assets:** The user physically edited and colored the PCI slots on the background image located at `web/public/motherboard_clean.png`.

**CURRENT BLOCKERS & YOUR OBJECTIVE FOR THIS SESSION:**
The User Interface is virtually finalized. The UI is ready to select individual fan zones and apply distinct curves.
However, the backend (`server/src/bmcClient.ts`) currently relies on web-scraping the extremely heavy MegaRAC Web UI JSON endpoint (`api/sensors`). This is incredibly slow and will crash the BMC's embedded processors if polled rapidly.

**YOUR EXACT IMMEDIATE GOALS:**
1. **Transition to Redfish/IPMI:** Review `doc/Plan.md`. We must migrate the polling and command logic away from the heavy Web API and over to Redfish REST APIs or IPMI raw UDP payloads for lightweight, high-frequency polling.
2. **Implement Zone Controls:** Ensure the backend `applyZoneCurve` logic is correctly formatting and pushing payloads for the distinct 7 PWM zones rather than blasting the master curve to all channels simultaneously.

**INSTRUCTIONS:**
Please start by checking the status of Redfish / IPMI connectivity. Look at `server/src/ipmiClient.ts` if it exists, and ask the user if they were able to enable IPMI over LAN in their BMC Dashboard settings. Proceed to optimize the backend!
