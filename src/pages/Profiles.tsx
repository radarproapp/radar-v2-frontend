import { ProfileSwitcher } from "../components/ProfileSwitcher";
import { useAuth } from "../auth/AuthContext";
import { useNavigate } from "react-router-dom";

/// Switching between who you are on this account.
///
/// A page rather than only a popup. Switching lived two taps inside the account menu — on a phone
/// that is the "You" tab, then a panel — which is far enough out of the way that it read as
/// missing. "Once you are a Graduate you cannot switch back" was partly this and partly the
/// profile editor, which used to change the persona on the profile you were in and clear its
/// answers, leaving nothing to switch back to.
///
/// Each profile keeps its own path, feed, saved items and history, because everything is already
/// keyed by profile id. A graduate is not a student with a different label.

export function Profiles() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="r-page" style={{ maxWidth: 620 }}>
      <div className="r-page-head">
        <h1 className="r-page-title">Your profiles</h1>
        <p className="r-page-sub">
          Student, graduate and professional are separate profiles on one account. Each keeps its
          own learning path, feed and history, and you can move between them whenever you like.
        </p>
      </div>

      <div className="profiles-page">
        <ProfileSwitcher onDone={() => navigate("/")} />
      </div>

      {profile && (
        <p className="profiles-page__note">
          You are currently on your{" "}
          <strong>{profile.persona.replace("YoungProfessional", "professional")}</strong> profile.
          Switching does not delete anything — the one you leave is waiting where you left it.
        </p>
      )}
    </div>
  );
}
