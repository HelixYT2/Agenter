export const subscribeToRun = (runId, onEvent) => {
  const eventSource = new EventSource(`/api/v1/runs/${runId}/events`);

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      onEvent(data);
    } catch (e) {
      console.error('Failed to parse SSE event', e);
    }
  };

  eventSource.onerror = (err) => {
    console.error('SSE Error', err);
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
};
