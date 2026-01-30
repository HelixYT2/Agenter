import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as events from './events.js';

const router = express.Router();

// --- In-Memory Database ---
const db = {
  conversations: [],
  runs: [],
  connections: [],
  schedules: [],
  vmSessions: []
};

// --- Helper: Mock Agent Execution Loop ---
// Simulates an agent thinking, planning, and executing
const startAgentRun = async (runId, prompt) => {
  const run = db.runs.find(r => r.id === runId);
  if (!run) return;

  // 1. Plan Created
  await new Promise(r => setTimeout(r, 1000));
  const plan = [
    { id: 1, title: 'Analyze requirements', status: 'done' },
    { id: 2, title: 'Check environment', status: 'queued' },
    { id: 3, title: 'Execute risky action', status: 'queued', requires_approval: true },
    { id: 4, title: 'Finalize output', status: 'queued' }
  ];
  run.plan = plan;
  events.broadcast(runId, 'plan.created', { plan });

  // 2. Step 1 Started
  await new Promise(r => setTimeout(r, 1000));
  events.broadcast(runId, 'step.started', { stepId: 1, title: 'Analyze requirements' });
  events.broadcast(runId, 'step.log', { stepId: 1, content: 'Analyzing prompt: ' + prompt });
  await new Promise(r => setTimeout(r, 500));
  events.broadcast(runId, 'step.completed', { stepId: 1 });

  // Update Plan Status
  plan[0].status = 'done';
  plan[1].status = 'running';
  events.broadcast(runId, 'plan.updated', { plan });

  // 3. Step 2 Started (Check Env)
  await new Promise(r => setTimeout(r, 800));
  events.broadcast(runId, 'step.started', { stepId: 2, title: 'Check environment' });
  events.broadcast(runId, 'tool.called', { stepId: 2, tool: 'terminal', command: 'node --version' });
  await new Promise(r => setTimeout(r, 500));
  events.broadcast(runId, 'step.log', { stepId: 2, content: 'v20.11.0' });
  events.broadcast(runId, 'step.completed', { stepId: 2 });

  plan[1].status = 'done';
  plan[2].status = 'waiting';
  events.broadcast(runId, 'plan.updated', { plan });

  // 4. Step 3 (Risky) - Requires Approval
  run.status = 'waiting_approval';
  events.broadcast(runId, 'step.requires_approval', {
    stepId: 3,
    risk: 'High',
    description: 'Install "suspicious-package" via npm'
  });
};

const resumeAgentRun = async (runId) => {
  const run = db.runs.find(r => r.id === runId);
  if (!run) return;

  // Mark resumed
  run.status = 'running';
  run.plan[2].status = 'running'; // Step 3
  events.broadcast(runId, 'plan.updated', { plan: run.plan });

  // Execute Step 3
  events.broadcast(runId, 'step.started', { stepId: 3, title: 'Execute risky action' });
  events.broadcast(runId, 'step.log', { stepId: 3, content: 'Approval granted. Installing...' });
  await new Promise(r => setTimeout(r, 1500));
  events.broadcast(runId, 'step.completed', { stepId: 3 });

  run.plan[2].status = 'done';
  run.plan[3].status = 'running';
  events.broadcast(runId, 'plan.updated', { plan: run.plan });

  // Execute Step 4
  events.broadcast(runId, 'step.started', { stepId: 4, title: 'Finalize output' });
  await new Promise(r => setTimeout(r, 1000));

  // Artifact Created
  const artifact = {
    id: uuidv4(),
    name: 'build-output.zip',
    size: '2.4MB',
    url: `/api/v1/vm/sessions/${run.vm_session_id}/download?path=build.zip`
  };
  run.artifacts.push(artifact);
  events.broadcast(runId, 'artifact.created', { artifact });
  events.broadcast(runId, 'step.completed', { stepId: 4 });

  run.plan[3].status = 'done';
  run.status = 'completed';
  events.broadcast(runId, 'plan.updated', { plan: run.plan });
  events.broadcast(runId, 'run.completed', { status: 'success' });
};


// --- Conversations ---

router.get('/conversations', (req, res) => {
  res.json(db.conversations.sort((a, b) => b.updated_at - a.updated_at));
});

router.post('/conversations', (req, res) => {
  const convo = {
    id: uuidv4(),
    title: req.body.title || 'New Conversation',
    created_at: Date.now(),
    updated_at: Date.now(),
    messages: []
  };
  db.conversations.push(convo);
  res.json(convo);
});

router.get('/conversations/:id', (req, res) => {
  const convo = db.conversations.find(c => c.id === req.params.id);
  if (!convo) return res.status(404).json({ error: 'Not found' });
  res.json(convo);
});

router.post('/conversations/:id/messages', (req, res) => {
  const convo = db.conversations.find(c => c.id === req.params.id);
  if (!convo) return res.status(404).json({ error: 'Not found' });

  const msg = {
    id: uuidv4(),
    role: req.body.role,
    content: req.body.content,
    created_at: Date.now()
  };
  convo.messages.push(msg);
  convo.updated_at = Date.now();
  res.json(msg);
});

// --- Connections ---
router.get('/connections', (req, res) => {
  res.json(db.connections);
});

router.post('/connections', (req, res) => {
  const conn = { ...req.body, id: uuidv4() };
  db.connections.push(conn);
  res.json(conn);
});

// --- Runs ---
router.post('/runs', (req, res) => {
  const { conversation_id, prompt } = req.body;
  const run = {
    id: uuidv4(),
    conversation_id,
    status: 'queued',
    prompt,
    created_at: Date.now(),
    plan: [],
    artifacts: [],
    vm_session_id: 'vm-mock-1' // Mock VM
  };
  db.runs.push(run);

  // Trigger async agent
  startAgentRun(run.id, prompt);

  res.json(run);
});

router.get('/runs/:id', (req, res) => {
  const run = db.runs.find(r => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });
  res.json(run);
});

router.get('/runs/:id/events', (req, res) => {
  events.subscribe(req, res, req.params.id);
});

router.post('/runs/:id/approve', (req, res) => {
  const { decision } = req.body; // 'confirm' or 'deny'
  const run = db.runs.find(r => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: 'Not found' });

  if (decision === 'confirm') {
    resumeAgentRun(run.id);
    res.json({ status: 'resumed' });
  } else {
    run.status = 'failed';
    events.broadcast(run.id, 'run.failed', { reason: 'User denied permission' });
    res.json({ status: 'stopped' });
  }
});

// --- VM ---
router.get('/vm/sessions/:id', (req, res) => {
  res.json({ id: req.params.id, status: 'ready', type: 'mock-windows' });
});

// --- Schedules ---
router.get('/schedules', (req, res) => {
  res.json(db.schedules);
});

router.post('/schedules', (req, res) => {
  const schedule = { ...req.body, id: uuidv4(), enabled: true };
  db.schedules.push(schedule);
  res.json(schedule);
});

export default router;
