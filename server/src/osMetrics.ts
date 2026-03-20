import { exec } from 'child_process';
import os from 'os';
import { promisify } from 'util';

const execAsync = promisify(exec);

let previousCpu: { idle: number; total: number } | null = null;
function getCpuLoad(): number {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (let cpu of cpus) {
    for (let type in cpu.times) {
      total += (cpu.times as any)[type];
    }
    idle += cpu.times.idle;
  }
  
  if (previousCpu) {
    const idleDiff = idle - previousCpu.idle;
    const totalDiff = total - previousCpu.total;
    const percentage = 100 - ~~(100 * idleDiff / totalDiff);
    previousCpu = { idle, total };
    return Math.max(0, Math.min(100, percentage));
  }
  
  previousCpu = { idle, total };
  return 0;
}

export async function getOsMetrics() {
  const cpuLoad = getCpuLoad();
  let gpuLoad = 0;
  try {
    const { stdout } = await execAsync('nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits');
    gpuLoad = parseInt(stdout.trim(), 10);
    if (isNaN(gpuLoad)) gpuLoad = 0;
  } catch (err) {
    // Nvidia SMI might fail if no drivers or not in PATH, just safely ignore
  }
  return { cpu: cpuLoad, gpu: gpuLoad };
}
