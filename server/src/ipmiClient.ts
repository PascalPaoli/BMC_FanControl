/**
 * Scaffold for IPMI/Redfish fallback
 * To be used once IPMI over LAN or Redfish is enabled in BMC settings.
 */

export const getIpmiSensors = async () => {
    // Example Redfish payload or ipmitool usage
    throw new Error("IPMI not yet enabled on BMC. Returning fallback.");
}

export const applyIpmiZoneCurve = async (zoneId: number, curve: any) => {
    // Scaffold for fan curving via standard IPMI raw commands
    throw new Error("IPMI not yet enabled on BMC. Returning fallback.");
}
