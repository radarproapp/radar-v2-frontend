import { useEffect } from "react";

/// A long legal document, rendered readably.
///
/// Both the Terms and the Privacy Policy were `href="#terms"` and `href="#privacy"` — anchors
/// pointing at nothing, on a page that has no such sections. The links looked live and did
/// nothing, which for the two documents a user is told they have agreed to is the worst kind of
/// broken.
///
/// The text is held as data rather than JSX so the two pages are the same component with
/// different content, and so a clause can be corrected without touching markup.

export interface LegalSection {
  heading: string;
  /// Paragraphs and bullet lists, in the order they appear. A bare string is a paragraph; an
  /// array is a bulleted list.
  body: (string | string[])[];
}

export interface LegalDocumentProps {
  title: string;
  intro?: string;
  sections: LegalSection[];
  /// Shown at the end. Placeholders the business still has to fill are marked, not invented.
  contact?: { label: string; value: string | null }[];
}

export function LegalDocument({ title, intro, sections, contact }: LegalDocumentProps) {
  // A legal page opened from a footer should start at the top, not wherever the previous page
  // was scrolled to.
  useEffect(() => window.scrollTo(0, 0), []);

  return (
    <div className="r-page legal">
      <div className="r-page-head">
        <h1 className="r-page-title">{title}</h1>
        {intro && <p className="r-page-sub">{intro}</p>}
      </div>

      {/* Numbered from the document itself rather than by position, so a section referenced as
          "section 12" in the text is the one headed 12 on screen. */}
      <nav className="legal__toc" aria-label="Sections">
        {sections.map((section) => (
          <a key={section.heading} href={`#${slug(section.heading)}`}>
            {section.heading}
          </a>
        ))}
      </nav>

      {sections.map((section) => (
        <section key={section.heading} id={slug(section.heading)} className="legal__section">
          <h2 className="legal__heading">{section.heading}</h2>

          {section.body.map((block, i) =>
            Array.isArray(block) ? (
              <ul key={i} className="legal__list">
                {block.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i} className="legal__para">
                {block}
              </p>
            ),
          )}
        </section>
      ))}

      {contact && contact.length > 0 && (
        <section className="legal__section">
          <h2 className="legal__heading">Contact</h2>
          <dl className="legal__contact">
            {contact.map((row) => (
              <div key={row.label}>
                <dt>{row.label}</dt>
                {/* Blank in the source document. Shown as outstanding rather than filled with an
                    address nobody has set up — an invented privacy contact is worse than a
                    visible gap, because a user would write to it. */}
                <dd className={row.value ? "" : "legal__pending"}>
                  {row.value ?? "To be published"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
    </div>
  );
}

function slug(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
