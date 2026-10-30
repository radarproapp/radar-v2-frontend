import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { deleteMentorConversation, getMentorConversations } from "../lib/api";
import { humanize } from "../lib/date";

/// Every conversation the learner has had with the Mentor.
///
/// Quizzes and study plans were stored; the conversation itself was not. The chat endpoint took
/// the history from the client, so a conversation lived in a browser tab and nowhere else -
/// close it and everything the tutor had explained was gone, including the worked example you
/// wanted to look at again on Thursday.
///
/// Navigation, not content. Titles and counts only, so a learner with two hundred conversations
/// is not sent two hundred transcripts to choose between, and the title is taken from their own
/// first question rather than written by a model - a list that waits on the provider goes blank
/// exactly when the provider is unreachable, which is the moment somebody most wants to reread
/// what they were already told.

export function MentorHistory({
  openId,
  onOpen,
  onNew,
}: {
  openId: string | null;
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState<string | null>(null);

  const conversations = useQuery({
    queryKey: ["mentor", "conversations"],
    queryFn: () => getMentorConversations(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteMentorConversation(id),
    onSuccess: (_, id) => {
      setConfirming(null);
      queryClient.invalidateQueries({ queryKey: ["mentor", "conversations"] });

      // Deleting the one on screen leaves the reader looking at a conversation that no longer
      // exists, and their next question would try to join it.
      if (id === openId) onNew();
    },
  });

  const list = conversations.data ?? [];

  return (
    <aside className="mentor-history" aria-label="Past conversations">
      <div className="mentor-history__head">
        <h2 className="mentor-history__title">Your conversations</h2>

        <button className="btn btn--sm" onClick={onNew}>
          <Icon name="add" size={13} /> New
        </button>
      </div>

      {conversations.isLoading ? (
        <p className="mentor-history__note">Loading…</p>
      ) : list.length === 0 ? (
        /* Said rather than left blank, and said as what it is: nothing has happened yet, which
           is not the same as something having gone wrong. */
        <p className="mentor-history__note">
          Nothing yet. Ask the Mentor something and it will be here to come back to.
        </p>
      ) : (
        <ul className="mentor-history__list">
          {list.map((conversation) => (
            <li key={conversation.id}>
              <button
                className={`mentor-history__item ${openId === conversation.id ? "active" : ""}`}
                onClick={() => onOpen(conversation.id)}
                aria-current={openId === conversation.id ? "true" : undefined}
              >
                <span className="mentor-history__name">{conversation.title}</span>
                <span className="mentor-history__meta">
                  {conversation.messageCount}{" "}
                  {conversation.messageCount === 1 ? "message" : "messages"} ·{" "}
                  {humanize(conversation.lastMessageAt)}
                </span>
              </button>

              {/* Asked once before it goes. A conversation is the only record of an explanation
                  somebody understood, and there is no undo behind this. */}
              {confirming === conversation.id ? (
                <span className="mentor-history__confirm">
                  <button
                    className="btn btn--sm btn--danger"
                    onClick={() => remove.mutate(conversation.id)}
                    disabled={remove.isPending}
                  >
                    Delete
                  </button>
                  <button className="btn btn--text btn--sm" onClick={() => setConfirming(null)}>
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  className="mentor-history__delete"
                  onClick={() => setConfirming(conversation.id)}
                  aria-label={`Delete "${conversation.title}"`}
                >
                  <Icon name="delete" size={13} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
