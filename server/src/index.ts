import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { getSensors, applyMasterCurve } from './bmcClient.js';
import { getOsMetrics } from './osMetrics.js';

dotenv.config();

const server = fastify({ logger: true });

server.register(cors, {
  origin: '*'
});

server.get('/api/sensors', async (request, reply) => {
  try {
    const data = await getSensors();
    const osMetrics = await getOsMetrics();
    return { bmc: data, os: osMetrics };
  } catch (err: any) {
    server.log.error(err);
    reply.status(500).send({ error: err.message });
  }
});

server.post('/api/fans/apply-curve', async (request, reply) => {
  try {
    const body: any = request.body;
    const result = await applyMasterCurve(body.curve, body.url);
    return result;
  } catch (err: any) {
    server.log.error(err);
    reply.status(500).send({ error: err.message });
  }
});
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

const terminalEvents = new EventEmitter();
let activeProcess: ChildProcess | null = null;
let terminalHistory: string[] = [];

server.get('/api/terminal/stream', (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });

  // Send history immediately
  terminalHistory.forEach(line => {
    reply.raw.write(`data: ${JSON.stringify(line)}\n\n`);
  });

  const onData = (data: string) => {
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  terminalEvents.on('data', onData);

  request.raw.on('close', () => {
    terminalEvents.off('data', onData);
  });
});

server.post('/api/terminal/start', async (request, reply) => {
  if (activeProcess) return { status: 'already running' };
  
  const batPath = 'F:\\AzWorkspace\\run_services.bat';
  
  terminalHistory = [];
  const msg = `--- Starting ${batPath} ---\n`;
  terminalHistory.push(msg);
  terminalEvents.emit('data', msg);

  activeProcess = spawn('cmd.exe', ['/c', batPath], { cwd: 'F:\\AzWorkspace' });

  activeProcess.stdout?.on('data', (data) => {
    const str = data.toString();
    terminalHistory.push(str);
    if (terminalHistory.length > 500) terminalHistory.shift();
    terminalEvents.emit('data', str);
  });

  activeProcess.stderr?.on('data', (data) => {
    const str = data.toString();
    terminalHistory.push(str);
    if (terminalHistory.length > 500) terminalHistory.shift();
    terminalEvents.emit('data', str);
  });

  activeProcess.on('close', (code) => {
    const closeMsg = `\n--- Process exited with code ${code} ---\n`;
    terminalHistory.push(closeMsg);
    terminalEvents.emit('data', closeMsg);
    activeProcess = null;
  });

  return { status: 'started' };
});

server.post('/api/terminal/stop', async (request, reply) => {
  if (activeProcess) {
    activeProcess.kill('SIGINT');
    activeProcess = null;
    return { status: 'stopping' };
  }
  return { status: 'not running' };
});
server.listen({ port: 3001, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});
