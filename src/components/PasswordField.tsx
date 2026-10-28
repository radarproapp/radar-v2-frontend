import { useId, useState } from "react";

/// A password box you can read back.
///
/// Every password field in the product was a bare `type="password"` with no way to see what had
/// been typed. On a phone keyboard, with autocorrect and a shifted number row, that turns a
/// mistyped character into a failed login the user cannot diagnose — they can only try again and
/// fail the same way.
///
/// The toggle is a button rather than a checkbox so it sits inside the field, and it says what it
/// will do rather than what the state is: "Show password" when hidden is the action, which is
/// what a screen reader should announce.

interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: "current-password" | "new-password";
  id?: string;
  required?: boolean;
  onEnter?: () => void;
}

export function PasswordField({
  value,
  onChange,
  placeholder = "Password",
  autoComplete = "current-password",
  id,
  required,
  onEnter,
}: PasswordFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;
  const [visible, setVisible] = useState(false);

  return (
    <div className="pwfield">
      <input
        id={fieldId}
        className="r-input pwfield__input"
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        onKeyDown={(e) => {
          if (e.key === "Enter" && onEnter) onEnter();
        }}
      />

      <button
        type="button"
        className="pwfield__toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        // Kept out of the tab order between the field and the submit button: somebody tabbing
        // through a login form is going for the button, not the toggle.
        tabIndex={-1}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M3 3l18 18" strokeLinecap="round" />
            <path d="M10.6 5.2A9.8 9.8 0 0 1 12 5c5 0 9 4.5 9 7a11 11 0 0 1-2.4 3.4M6.5 6.9A12 12 0 0 0 3 12c0 2.5 4 7 9 7a9.6 9.6 0 0 0 4-.9" strokeLinecap="round" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M3 12s3.6-7 9-7 9 7 9 7-3.6 7-9 7-9-7-9-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
