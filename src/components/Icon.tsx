import { ICONS, type IconName } from "./icon-map";

/// Renders one of the named icons in `icon-map.ts`.
///
/// The map lives in its own module so this file exports only a component: a file that exports
/// both a component and a constant silently disables fast refresh for everything importing it.
export type { IconName };
export interface IconProps {
  name: IconName;
  /// Pixel size. Matches the surrounding text size by default rather than the 24px lucide
  /// default, which towers over body copy.
  size?: number;
  /// Defaults to the inherited text colour, so an icon tracks its context the way emoji never
  /// could — including in a disabled or error state.
  color?: string;
  className?: string;
  /// Supply when the icon carries meaning the surrounding text does not. Omit for decoration:
  /// an icon next to the word "Search" is announced twice if both are labelled.
  label?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 16, color = "currentColor", className, label, strokeWidth = 2 }: IconProps) {
  const Glyph = ICONS[name];

  return (
    <Glyph
      size={size}
      color={color}
      className={className}
      strokeWidth={strokeWidth}
      // Decorative by default. A screen reader reading "rocket" mid-sentence was one of the
      // concrete problems with emoji; repeating a visible label is the same problem with a nicer
      // glyph, so the caller has to opt in.
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
      style={{ flexShrink: 0, verticalAlign: "text-bottom" }}
    />
  );
}
