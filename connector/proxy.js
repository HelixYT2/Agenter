import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';

// If http-proxy-middleware is not installed, I'll use a simple forwarder.
// But let's check if I can install it or write a simple one.
// I'll write a simple one using fetch to avoid extra deps if possible,
// OR just use express + fetch.

const app = express();
const PORT = 3001;
let defaultTarget = 'http://localhost:1234/v1'; // LM Studio Default

app.use(cors({
  origin: '*', // In production, restrict to Artemis origin
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Target-Url']
}));

app.use(express.json());

app.all('*', async (req, res) => {
  if (req.method === 'OPTIONS') return res.sendStatus(200);

  // Allow client to override target via header
  const target = req.headers['x-target-url'] || defaultTarget;
  const url = `${target}${req.path}`;
  console.log(`Proxying ${req.method} ${req.path} -> ${url}`);

  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward auth if provided
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization })
      },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined
    });

    if (response.body) {
      // Stream response
      res.writeHead(response.status, {
         'Content-Type': response.headers.get('Content-Type') || 'application/json'
      });
      // ReadableStream to Node Stream
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.status(response.status).end();
    }
  } catch (err) {
    console.error('Proxy Error:', err.message);
    res.status(502).json({ error: 'Failed to connect to Local LLM', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Artemis Local Connector running on http://localhost:${PORT}`);
  console.log(`Targeting LM Studio at ${TARGET}`);
});
