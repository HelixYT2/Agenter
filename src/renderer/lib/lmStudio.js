const normalizeBaseUrl = (baseUrl) => baseUrl.replace(/\/$/, "");

const getHeaders = (apiKey) => {
  const headers = {
    "Content-Type": "application/json"
  };
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  return headers;
};

export const testConnection = async ({ baseUrl, apiKey }) => {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/v1/models`, {
    headers: getHeaders(apiKey)
  });
  if (!response.ok) {
    throw new Error(`Connection failed (${response.status})`);
  }
  return response.json();
};

export const fetchModels = async ({ baseUrl, apiKey }) => {
  const data = await testConnection({ baseUrl, apiKey });
  return data.data || [];
};

const parseSse = (buffer) => {
  const lines = buffer.split("\n");
  const remaining = lines.pop() || "";
  const events = [];
  for (const line of lines) {
    if (line.startsWith("data:")) {
      const payload = line.replace(/^data:\s*/, "");
      if (payload === "[DONE]") {
        events.push({ done: true });
      } else {
        events.push({ data: payload });
      }
    }
  }
  return { events, buffer: remaining };
};

export const streamChatCompletion = async ({ baseUrl, apiKey, payload, onToken, signal }) => {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/v1/chat/completions`, {
    method: "POST",
    headers: getHeaders(apiKey),
    body: JSON.stringify({ ...payload, stream: true }),
    signal
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/event-stream") || !response.body) {
    const data = await response.json();
    const message = data.choices?.[0]?.message?.content || "";
    onToken(message, true);
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = false;

  while (!done) {
    const result = await reader.read();
    done = result.done;
    buffer = buffer + decoder.decode(result.value || new Uint8Array(), { stream: !done });
    const parsed = parseSse(buffer);
    buffer = parsed.buffer;
    for (const event of parsed.events) {
      if (event.done) {
        onToken("", true);
      } else if (event.data) {
        try {
          const json = JSON.parse(event.data);
          const delta = json.choices?.[0]?.delta?.content || "";
          if (delta) {
            onToken(delta, false);
          }
        } catch (error) {
          console.warn("Failed to parse SSE chunk", error);
        }
      }
    }
  }
};
