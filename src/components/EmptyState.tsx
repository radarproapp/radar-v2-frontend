import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: string;
  compact?: boolean;
  children?: ReactNode;
}

export function EmptyState({ icon, title, description, compact, children }: EmptyStateProps) {
  return (
    <div className={`r-empty-state ${compact ? "r-empty-state--compact" : ""}`}>
      {icon && (
        <div className="r-empty-state__icon">
          <Icon name={icon} size={28} strokeWidth={1.5} />
        </div>
      )}
      <div className="r-empty-state__title">{title}</div>
      {description && <p className="r-empty-state__desc">{description}</p>}
      {children && <div className="r-empty-state__actions">{children}</div>}
    </div>
  );
}
