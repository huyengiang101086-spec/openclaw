import { describe, expect, it } from "vitest";
import {
  createChatEvent,
  createPendingPromptHarness,
  DEFAULT_SESSION_KEY,
} from "./translator.prompt-harness.test-support.js";

describe("acp translator errorKind mapping", () => {
  it.each([
    ["refusal", "refusal"],
    ["unknown", "end_turn"],
  ])("maps %s errors to %s", async (errorKind, stopReason) => {
    const { agent, promptPromise, runId, sessionUpdate } = await createPendingPromptHarness();
    const event = createChatEvent({
      runId,
      sessionKey: DEFAULT_SESSION_KEY,
      seq: 1,
      state: "error",
      errorKind,
      errorMessage: "gateway error",
    });
    await agent.handleGatewayEvent(event);
    await expect(promptPromise).resolves.toEqual({ stopReason });
    await agent.handleGatewayEvent(event);
    const messages = sessionUpdate.mock.calls.flatMap(([notification]) =>
      notification.update.sessionUpdate === "agent_message_chunk"
        ? [notification.update.content]
        : [],
    );
    expect(messages).toEqual([{ type: "text", text: "[OpenClaw interruption] gateway error" }]);
  });

  it("settles errors without a message without emitting an empty notice", async () => {
    const { agent, promptPromise, runId, sessionUpdate } = await createPendingPromptHarness();
    await agent.handleGatewayEvent(
      createChatEvent({ runId, sessionKey: DEFAULT_SESSION_KEY, state: "error" }),
    );
    await expect(promptPromise).resolves.toEqual({ stopReason: "end_turn" });
    expect(
      sessionUpdate.mock.calls.some(
        ([notification]) => notification.update.sessionUpdate === "agent_message_chunk",
      ),
    ).toBe(false);
  });
});
