import { useId, useState } from "react";
import { Icon } from "./Icon";
import { canAddCustom, suggestionsFor } from "../lib/personalisation";

/// One of the three personalisation boxes: type, pick a suggestion, or use your own words.
///
/// All three boxes are the same interaction, so they are one component. The guide's rule is that
/// suggestions exist to save keystrokes and never to constrain — "do not force users to choose
/// from fixed options when their own wording is more appropriate" — so anything typed can be
/// added, and the option to add it is visible rather than hidden behind knowing to press Enter.

interface TagInputProps {
  label: string;
  hint: string;
  placeholder: string;
  pool: string[];
  value: string[];
  onChange: (next: string[]) => void;
  /// Held still while the answer is being saved, so nothing typed into a box mid-request is
  /// thrown away when the panel that contains it closes.
  disabled?: boolean;
}

export function TagInput({ label, hint, placeholder, pool, value, onChange, disabled = false }: TagInputProps) {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const listId = useId();

  const suggestions = suggestionsFor(pool, query, value);
  const offerCustom = canAddCustom(query, value, suggestions);

  const add = (entry: string) => {
    const trimmed = entry.trim();
    if (!trimmed) return;
    if (value.some((v) => v.toLowerCase() === trimmed.toLowerCase())) return;

    onChange([...value, trimmed]);
    setQuery("");
  };

  const remove = (entry: string) => onChange(value.filter((v) => v !== entry));

  return (
    <div className="tagbox">
      <label className="tagbox__label" htmlFor={listId}>
        {label}
      </label>
      <p className="tagbox__hint">{hint}</p>

      {value.length > 0 && (
        <div className="tagbox__chosen">
          {value.map((entry) => (
            <button key={entry} className="tagbox__chip" onClick={() => remove(entry)} disabled={disabled}>
              {entry}
              <Icon name="close" size={12} />
            </button>
          ))}
        </div>
      )}

      <div className="tagbox__field">
        <Icon name="search" size={15} />
        <input
          id={listId}
          className="tagbox__input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          // Delayed, or the blur fires before a click on a suggestion registers and the list
          // disappears from under the cursor.
          onBlur={() => window.setTimeout(() => setFocused(false), 120)}
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            add(offerCustom || suggestions.length === 0 ? query : suggestions[0]);
          }}
        />
      </div>

      {focused && (suggestions.length > 0 || offerCustom) && (
        <div className="tagbox__suggestions" role="listbox">
          {offerCustom && (
            <button className="tagbox__suggestion tagbox__suggestion--own" onClick={() => add(query)}>
              <Icon name="add" size={13} />
              Use &ldquo;{query.trim()}&rdquo;
            </button>
          )}

          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              role="option"
              aria-selected="false"
              className="tagbox__suggestion"
              onClick={() => add(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
