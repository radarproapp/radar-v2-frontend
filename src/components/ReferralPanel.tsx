import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "./Icon";
import { getMyReferral } from "../lib/api";

/// A participant's link, and what it has actually brought in.
///
/// Three numbers, never one. A sign-up is not a user: somebody who gets thirty people to create
/// an account and walk away has produced thirty rows, and a single score cannot tell that from
/// thirty people who come back every week. Showing all three is also the clearest possible
/// statement of what the campaign rewards - a participant reading this screen learns, without
/// being told, that getting somebody to the end matters more than getting them through the door.

export function ReferralPanel() {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const referral = useQuery({ queryKey: ["referral", "mine"], queryFn: getMyReferral });

  const copy = async (what: "code" | "link", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard refused - an insecure context, or permission denied. The code is on screen
      // and selectable, so nothing is lost but the convenience.
    }
  };

  if (referral.isLoading) return <section className="referral"><p className="referral__note">Fetching your link…</p></section>;

  if (referral.isError) {
    return (
      <section className="referral">
        <p className="referral__note">
          Could not fetch your referral link just now. Try again shortly — nothing you have
          already brought in is affected.
        </p>
      </section>
    );
  }

  // Checked rather than asserted. isLoading is isPending && isFetching, so an offline browser -
  // where the default network mode pauses the fetch while leaving it pending - is neither
  // loading nor errored, and the assertion handed the render undefined.
  if (!referral.data) return <section className="referral"><p className="referral__note">Loading your link…</p></section>;

  const mine = referral.data;
  const share = `I have been using Radar — it finds the news, research and opportunities that actually match what you are studying or working on. ${mine.link}`;

  return (
    <section className="referral">
      <h2 className="referral__title">Bring somebody to Radar</h2>

      {/* Both halves said, because for a while only the link worked: there was no field to type
          a code into anywhere in the app, so somebody who received the bare code in a group
          chat could not use it, beside a prominent button offering to copy it. */}
      <p className="referral__note">
        Anyone who signs up through your link is counted to you. If they already have Radar open,
        the code works too — there is a field for it on the sign-up screen.
      </p>

      <div className="referral__code" aria-label="Your referral code">{mine.code}</div>

      <div className="referral__actions">
        <button className="btn btn--primary btn--sm" onClick={() => copy("link", mine.link)}>
          <Icon name="copy" size={13} /> {copied === "link" ? "Copied" : "Copy your link"}
        </button>

        <button className="btn btn--sm" onClick={() => copy("code", mine.code)}>
          {copied === "code" ? "Copied" : "Copy the code"}
        </button>

        {/* A ready message, because the thing that stops somebody sharing is writing the
            sentence, not finding the button. */}
        <a
          className="btn btn--sm"
          href={`https://wa.me/?text=${encodeURIComponent(share)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="send" size={13} /> Share on WhatsApp
        </a>
      </div>

      {/* Three numbers rather than a score. The gap between them is the useful part: a large
          first column and a small third one means people are arriving and not staying, which
          is worth knowing before being told you are doing well. */}
      <div className="referral__counts">
        {([
          ["Signed up", mine.signedUp, "made an account through your link"],
          ["Got set up", mine.personalised, "answered the three questions, so Radar can show them something"],
          ["Came back", mine.cameBack, "returned on a later day — the one that really counts"],
        ] as const).map(([label, value, meaning]) => (
          <div className="referral__count" key={label}>
            <div className="referral__count-value">{value}</div>
            <div className="referral__count-label">{label}</div>
            <div className="referral__count-meaning">{meaning}</div>
          </div>
        ))}
      </div>

      {mine.signedUp === 0 && (
        <p className="referral__note">
          Nobody has joined through your link yet. Said plainly rather than shown as a zero that
          could mean anything.
        </p>
      )}

      {mine.signedUp > 0 && mine.cameBack === 0 && (
        <p className="referral__note">
          People are arriving but none have come back yet. Worth knowing: the person who
          introduced them is usually the reason they return.
        </p>
      )}
    </section>
  );
}
