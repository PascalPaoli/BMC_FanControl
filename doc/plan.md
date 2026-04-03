# BMC Fan System - Independent Zones & Next-Gen Polling

## Goal Description
The current implementation controls all fans together via a single master curve and relies on "heavy" web API scraping (`api/sensors`) to obtain temperatures. This plan outlines how we will:
1. **Enable & Migrate to IPMI/Redfish**: Poll data "in the rule of art" for much lighter and faster hardware queries. 
2. **Implement Independent Fan Control**: Use the 7 available PWM Indices (from the Asus WRX80E-SAGE SE WIFI manual) to control CPU and Chassis fans separately.
3. **Enhance Fan Curves**: Implement socket-based, granular curve controls matching the native BMC capabilities.

## User Review Required

> [!WARNING]
> Redfish and IPMI over LAN appear to be currently returning `Access Denied` (401/403) or are disabled on your motherboard's BMC at `192.168.1.234`. Before I can implement the new lightweight polling, **you must log into the BMC Website (https://192.168.1.234), navigate to Settings -> Services, and enable IPMI over LAN (or Redfish if available)**, or verify if the `admin` user has the necessary privileges for Redfish/IPMI. 

## Proposed Changes

---

### Phase 1: IPMI / Redfish Transition
To stop scraping the heavy web JSON API, we will transition to IPMI (via `node-ipmi` or standard UDP payloads) or Redfish API.
- [NEW] `server/src/ipmiClient.ts`: A new module to send lightweight IPMI/Redfish requests for just the necessary fan speeds and thermal data, removing the 1300-line JSON payload we currently parse.
- [MODIFY] `server/src/bmcClient.ts`: Deprecate the web-scraper session auth for sensor polling.
- [MODIFY] `server/src/index.ts`: Update the fastify endpoints to use the optimized fast-polling logic.

---

### Phase 2: Independent Fan Zones Configuration
According to the manual you shared, there are 8 physical headers but they map to 7 control zones:
- **Index 0 (Shared A)**: CPU_FAN & CPU_OPT
- **Index 1**: CHA_FAN1
- **Index 2**: CHA_FAN2
- **Index 3**: CHA_FAN3
- **Index 4**: CHA_FAN4
- **Index 5**: CHA_FAN5
- **Index 6**: CHA_FAN6

- [MODIFY] `server/src/bmcClient.ts`: Update `applyMasterCurve` to `applyZoneCurve(zoneId, curve)` so we no longer loop `for (let i = 0; i <= 6; i++)` to blast the same curve across all zones.
- [MODIFY] `web/src/components/FanControl.tsx` (or similar): Replace the single global fan curve editor with a tabular/card layout allowing you to switch between the 7 discrete zones.

---

### Phase 3: Native Socket Curve Control
- [NEW] Introduce WebSockets to the Node Backend to push hardware updates directly to the React frontend instead of the React app spamming REST API polls.
- [MODIFY] Map the exact 5-point curve setup the MegaRAC BMC uses so your React SVG editor perfectly matches the hardware's internal logic.

## Open Questions

> [!IMPORTANT]
> 1. Will you be able to check the BMC settings to enable IPMI / Redfish so we can test the lightweight requests?
> 2. For the UI, do you want a sidebar to switch between each of the 7 zones, or do you want to see all 7 curves simultaneously on the dashboard?

## Verification Plan
### Automated Tests
- Run IPMI/Redfish scripts against `192.168.1.234` to ensure response times are under 100ms and payload size is reduced by 90%.

### Manual Verification
- Test each fan header (Index 0 to 6) individually and confirm the physical fans spin up independently.
