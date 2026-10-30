import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { MentorHistory } from "../MentorHistory";
import { renderPage } from "../../test/harness";
import * as api from "../../lib/api";
import type { MentorConversationSummary } from "../../lib/types";

/// Every conversation the learner has had with the Mentor.
///
/// Quizzes and study plans were stored and the conversation was not: the chat endpoint took the
/// history from the client, so it lived in a browser tab and nowhere else. Close it and
/// everything the tutor had explained was gone.

function conversation(overrides: Partial<MentorConversationSummary> = {}): MentorConversationSummary {
  return {
    id: "c1",
    title: "Why does a p-value of 0.05 matter?",
    messageCount: 6,
    createdAt: "2026-10-28T09:00:00Z",
    lastMessageAt: "2026-10-28T09:40:00Z",
    ...overrides,
  };
}

describe("MentorHistory", () => {
  it("lists past conversations", async () => {
    vi.spyOn(api, "getMentorConversations").mockResolvedValue([
      conversation(),
      conversation({ id: "c2", title: "Explain regression to me simply" }),
    ]);

    renderPage(<MentorHistory openId={null} onOpen={() => {}} onNew={() => {}} />);

    expect(await screen.findByText("Why does a p-value of 0.05 matter?")).toBeTruthy();
    expect(screen.getByText("Explain regression to me simply")).toBeTruthy();
  });

  it("opens the one that was pressed", async () => {
    vi.spyOn(api, "getMentorConversations").mockResolvedValue([conversation()]);
    const opened = vi.fn();

    renderPage(<MentorHistory openId={null} onOpen={opened} onNew={() => {}} />);
    fireEvent.click(await screen.findByText("Why does a p-value of 0.05 matter?"));

    expect(opened).toHaveBeenCalledWith("c1");
  });

  /// Nothing yet is not an error, and should not read like one.
  it("says nothing has happened yet rather than looking broken", async () => {
    vi.spyOn(api, "getMentorConversations").mockResolvedValue([]);

    renderPage(<MentorHistory openId={null} onOpen={() => {}} onNew={() => {}} />);

    expect(await screen.findByText(/nothing yet/i)).toBeTruthy();
  });

  it("offers a fresh conversation", async () => {
    vi.spyOn(api, "getMentorConversations").mockResolvedValue([conversation()]);
    const started = vi.fn();

    renderPage(<MentorHistory openId={null} onOpen={() => {}} onNew={started} />);
    fireEvent.click(screen.getByRole("button", { name: /new/i }));

    expect(started).toHaveBeenCalled();
  });

  /// <summary>Deleting asks first, because there is no undo behind it.</summary>
  ///
  /// A conversation is the only record of an explanation somebody understood. A single press
  /// next to the row they meant to open would lose it with nothing to get it back.
  it("asks before deleting", async () => {
    vi.spyOn(api, "getMentorConversations").mockResolvedValue([conversation()]);
    const removed = vi.spyOn(api, "deleteMentorConversation");

    renderPage(<MentorHistory openId={null} onOpen={() => {}} onNew={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /delete "why does a p-value/i }));

    expect(removed).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /^keep$/i })).toBeTruthy();
  });

  it("deletes once it has been confirmed", async () => {
    vi.spyOn(api, "getMentorConversations").mockResolvedValue([conversation()]);
    const removed = vi.spyOn(api, "deleteMentorConversation").mockResolvedValue(undefined);

    renderPage(<MentorHistory openId={null} onOpen={() => {}} onNew={() => {}} />);
    fireEvent.click(await screen.findByRole("button", { name: /delete "why does a p-value/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(removed).toHaveBeenCalledWith("c1"));
  });

  /// <summary>Deleting the one on screen starts a fresh one.</summary>
  ///
  /// Otherwise the reader is left looking at a conversation that no longer exists, and their
  /// next question would try to join it.
  it("starts fresh when the open conversation is the one deleted", async () => {
    vi.spyOn(api, "getMentorConversations").mockResolvedValue([conversation()]);
    vi.spyOn(api, "deleteMentorConversation").mockResolvedValue(undefined);
    const started = vi.fn();

    renderPage(<MentorHistory openId="c1" onOpen={() => {}} onNew={started} />);
    fireEvent.click(await screen.findByRole("button", { name: /delete "why does a p-value/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(started).toHaveBeenCalled());
  });

  /// And deleting a different one does not disturb what they are reading.
  it("leaves the open conversation alone when another is deleted", async () => {
    vi.spyOn(api, "getMentorConversations").mockResolvedValue([
      conversation(),
      conversation({ id: "c2", title: "Explain regression to me simply" }),
    ]);
    vi.spyOn(api, "deleteMentorConversation").mockResolvedValue(undefined);
    const started = vi.fn();

    renderPage(<MentorHistory openId="c1" onOpen={() => {}} onNew={started} />);
    fireEvent.click(await screen.findByRole("button", { name: /delete "explain regression/i }));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => expect(api.deleteMentorConversation).toHaveBeenCalledWith("c2"));
    expect(started).not.toHaveBeenCalled();
  });

  /// One message is a message, not 1 messages.
  it("counts one message correctly", async () => {
    vi.spyOn(api, "getMentorConversations").mockResolvedValue([conversation({ messageCount: 1 })]);

    renderPage(<MentorHistory openId={null} onOpen={() => {}} onNew={() => {}} />);

    expect(await screen.findByText(/1 message ·/)).toBeTruthy();
  });
});
