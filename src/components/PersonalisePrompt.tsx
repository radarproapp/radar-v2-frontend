import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

/// What Intelligence shows before it has been told what matters to you.
///
/// Not a card among many — on an unpersonalised feed this *is* the content. A handful of general
/// items sits beneath it as a sample of what Radar carries, clearly labelled as a sample.
///
/// The reason is stated rather than assumed. "For Radar to serve you better" is the whole
/// argument for asking: a feed ranked on nothing is a list of whatever published most recently,
/// and on any source mix that is not what anybody came for.
export function PersonalisePrompt({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();

  return (
    <section className={`personalise-prompt ${compact ? "compact" : ""}`}>
      <div className="personalise-prompt__icon">
        <Icon name="radar" size={compact ? 18 : 24} />
      </div>

      <h2 className="personalise-prompt__title">For Radar to serve you better</h2>

      <p className="personalise-prompt__text">
        Three short questions — what you follow, what you want, what you are looking for — and
        your feed becomes yours.
      </p>

      <button className="btn btn--primary" onClick={() => navigate("/personalise")}>
        Personalise my Radar
      </button>
    </section>
  );
}
