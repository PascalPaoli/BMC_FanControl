# BMC Fan Control - App Planning

## Objective
Create a lightweight application to easily monitor sensor data and manually/automatically control fan speeds via the Baseboard Management Controller (BMC) of the ASUS Pro WS WRX80E-SAGE SE WIFI motherboard.

## 1. Interface Analysis & Connectivity
The ASUS BMC (likely ASMB9-iKVM based on the Aspeed AST2500/2600) offers several management interfaces:
- **Redfish REST API (Recommended)**: Modern, JSON-based RESTful API over HTTP/HTTPS. Excellent for web/modern apps.
- **IPMI (Intelligent Platform Management Interface)**: Traditional protocol (UDP port 623). Can be accessed using tools like `ipmitool`. Very powerful for raw hardware control.
- **SSH**: Command-line access to the BMC OS (often SMASH CLP or a custom linux shell).

*Next Step*: We need to verify if Redfish is enabled and test authentication.

## 2. Core Features required
- **Authentication**: Securely connect to the BMC using its IP Address, Username, and Password.
- **Sensor Dashboard**: Read and display current motherboard/CPU temperatures, fan RPMs, and voltages.
- **Fan Control Override**: 
  - Ability to switch fans between "Automatic" (motherboard controlled) and "Manual" modes.
  - Sliders/inputs to set specific PWM percentages (0-100%) for different fan zones.
- **Custom Fan Curves (Optional further goal)**: Software-based fan curves reacting to sensor data.

## 3. Technology Stack Proposal
Since the workspace indicates experience with TypeScript/Node.js (`AzClaw`):
- **Backend / Daemon**: Node.js or Python.
  - Node.js: Can use `node-fetch` or `axios` to communicate with the Redfish API, or spawn `ipmitool` commands.
  - Python: Excellent libraries like `redfish` or `pyghmi` (IPMI).
- **Frontend / UI**:
  - A simple Web App (HTML/Vanilla CSS/Vanilla JS or React/Vite) served by the backend.
  - Alternatively, a desktop app using Electron or Tauri.

## 4. Implementation Steps
* Phase 1: Exploration - Test BMC communication (via Redfish or IPMI) using terminal commands (e.g., `curl` or `ipmitool`) to ensure we can read sensors and set fan speeds.
* Phase 2: Backend Development - Create the core scripts to fetch sensor data and send fan commands.
* Phase 3: Frontend Development - Build a visually appealing user interface with sliders and realtime metrics.
* Phase 4: Integration - Link the UI with the backend logic.

## Resources needed from User
- IP address of the BMC.
- Validation of the preferred programming language (TypeScript/Node.js vs Python).
- Test if Redfish is responding (e.g., accessing `https://<BMC_IP>/redfish/v1/` in a browser).
