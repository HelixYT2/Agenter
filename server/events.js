import { EventEmitter } from 'events';

// In-memory store of active connections per run
// Map<runId, Set<Response>>
const clients = new Map();

// Global event emitter for internal signaling
export const eventBus = new EventEmitter();

export const subscribe = (req, res, runId) => {
  const headers = {
    'Content-Type': 'text/event-stream',
    'Connection': 'keep-alive',
    'Cache-Control': 'no-cache',
    'X-Accel-Buffering': 'no' // Important for Nginx proxying if ever used
  };
  res.writeHead(200, headers);

  if (!clients.has(runId)) {
    clients.set(runId, new Set());
  }
  clients.get(runId).add(res);

  // Send initial connection message
  const data = `data: ${JSON.stringify({ type: 'connected', runId })}\n\n`;
  res.write(data);

  // Cleanup on close
  req.on('close', () => {
    const runClients = clients.get(runId);
    if (runClients) {
      runClients.delete(res);
      if (runClients.size === 0) {
        clients.delete(runId);
      }
    }
  });
};

export const broadcast = (runId, type, payload) => {
  const runClients = clients.get(runId);
  if (runClients) {
    const message = `data: ${JSON.stringify({ type, ...payload })}\n\n`;
    runClients.forEach(client => client.write(message));
  }
};
