import vmProfile from "../data/vmProfile.json";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const defaultPlan = (goal) => ({
  plan: [
    "Summarize the user goal",
    "Collect required information",
    "Execute actions in the sandbox",
    "Deliver results"
  ],
  steps: [
    {
      id: "step-1",
      title: "Open the target website",
      action: "Open the relevant website in the sandboxed browser.",
      impact: "read-only",
      tool: "browser"
    },
    {
      id: "step-2",
      title: "Gather the needed info",
      action: "Scan the page and extract key data points.",
      impact: "read-only",
      tool: "browser"
    },
    {
      id: "step-3",
      title: "Draft the final output",
      action: "Compile a response and prepare any edits or uploads.",
      impact: "write",
      tool: "files"
    }
  ],
  rules: vmProfile.guardrails,
  goal
});

const parsePlanResponse = (text, goal) => {
  try {
    const jsonStart = text.indexOf("{");
    const jsonEnd = text.lastIndexOf("}");
    if (jsonStart >= 0 && jsonEnd > jsonStart) {
      const raw = text.slice(jsonStart, jsonEnd + 1);
      return JSON.parse(raw);
    }
  } catch (error) {
    console.warn("Failed to parse plan JSON", error);
  }
  return defaultPlan(goal);
};

export const requestPlan = async ({ goal, model, baseUrl, apiKey, streamChat }) => {
  const systemPrompt = `You are an agent planner for a sandboxed VM.\nReturn JSON only with keys: plan (string[]), steps (array of {id,title,action,impact,tool,why}), rules (string[]).\nImpact must be one of: read-only, write, destructive, external.\nTool must be one of: browser, shell, files.\nThe VM control schema is: ${JSON.stringify(vmProfile.controlSchema)}.\nRules: ${vmProfile.guardrails.join(" ")}.\nGoal: ${goal}`;

  let output = "";
  await streamChat({
    baseUrl,
    apiKey,
    payload: {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: goal }
      ]
    },
    onToken: (token, done) => {
      output += token;
      if (done && !output.trim()) {
        output = "";
      }
    }
  });

  const plan = parsePlanResponse(output, goal);
  if (!plan.rules) {
    plan.rules = vmProfile.guardrails;
  }
  return plan;
};

export const createAgentRunner = ({ bus }) => {
  let status = "idle";
  let aborted = false;
  let paused = false;

  const emit = (type, payload = {}) => {
    bus.emit({ type, timestamp: Date.now(), ...payload });
  };

  const waitWhilePaused = async () => {
    while (paused && !aborted) {
      await delay(200);
    }
  };

  const stop = () => {
    aborted = true;
    status = "stopped";
    emit("run_stopped", { status });
  };

  const run = async (plan) => {
    aborted = false;
    status = "running";
    paused = false;
    emit("run_started", { plan, status });
    emit("plan_created", { plan: plan.plan || [] });

    for (const step of plan.steps || []) {
      if (aborted) {
        return;
      }
      await waitWhilePaused();
      emit("step_started", { step, status });

      if (step.impact && step.impact !== "read-only") {
        status = "waiting_confirmation";
        emit("step_requires_confirmation", { step, status });
        const decision = await new Promise((resolve) => {
          const unsubscribe = bus.subscribe((event) => {
            if (event.stepId !== step.id) {
              return;
            }
            if (event.type === "step_confirmed") {
              status = "running";
              unsubscribe();
              resolve("confirmed");
            }
            if (event.type === "step_denied") {
              status = "running";
              unsubscribe();
              resolve("denied");
            }
          });
        });
        if (decision === "denied") {
          emit("step_skipped", { step, status });
          continue;
        }
      }

      if (aborted) {
        return;
      }

      await waitWhilePaused();
      await delay(700);
      emit("step_output", {
        step,
        status,
        output: `${step.tool.toUpperCase()} · ${step.action}`
      });
      await delay(400);
    }

    status = "complete";
    emit("run_completed", { status });
  };

  const pause = () => {
    status = "paused";
    paused = true;
    emit("run_paused", { status });
  };

  const resume = () => {
    status = "running";
    paused = false;
    emit("run_resumed", { status });
  };

  return {
    run,
    stop,
    pause,
    resume,
    getStatus: () => status,
    emit
  };
};
