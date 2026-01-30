const API_BASE = '/api/v1';

export const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`
});

export const api = {
  auth: {
    verify: async (token) => {
      const res = await fetch(`${API_BASE}/auth/verify`, {
        headers: getHeaders(token)
      });
      return res.json();
    }
  },
  conversations: {
    list: async (token) => {
      const res = await fetch(`${API_BASE}/conversations`, {
        headers: getHeaders(token)
      });
      return res.json();
    },
    create: async (token, title) => {
      const res = await fetch(`${API_BASE}/conversations`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ title })
      });
      return res.json();
    },
    getMessages: async (token, id) => {
      // For now, the endpoint /conversations/:id returns the convo object which has messages
      const res = await fetch(`${API_BASE}/conversations/${id}`, {
        headers: getHeaders(token)
      });
      return res.json();
    },
    addMessage: async (token, id, role, content) => {
      const res = await fetch(`${API_BASE}/conversations/${id}/messages`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ role, content })
      });
      return res.json();
    }
  },
  runs: {
    create: async (token, conversationId, prompt) => {
      const res = await fetch(`${API_BASE}/runs`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ conversation_id: conversationId, prompt })
      });
      return res.json();
    },
    get: async (token, id) => {
      const res = await fetch(`${API_BASE}/runs/${id}`, {
        headers: getHeaders(token)
      });
      return res.json();
    },
    approve: async (token, id, decision) => {
      const res = await fetch(`${API_BASE}/runs/${id}/approve`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ decision })
      });
      return res.json();
    }
  }
};
