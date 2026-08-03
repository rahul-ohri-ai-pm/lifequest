import { cn } from '../../lib/utils';
import { colors } from '../../constants/theme';

// The framed cell a category mark sits in — an inventory slot, effectively.
//
// The reference gives every row a dedicated icon column with a large, full-colour mark in it,
// and that column is what makes the list scannable: you find the row by its picture, not by
// reading six titles. Those marks are 3D-rendered illustrations, which §5 rules out and §3
// prices out (they would be the app's first image asset and the start of a growing one).
//
// The transferable part is the *treatment*, not the artwork: give the glyph room, give it a
// frame, and let it carry the category's own colour instead of the neutral text colour. A
// tinted fill and a 1px edge in the same hue do for a code-drawn icon what a soft-shaded
// render does for an illustrated one — they give it mass, so it reads as an object rather
// than as a hairline.

interface Props {
  children: React.ReactNode;
  /** The skill's stored colour. Falls back to the §5 primary for untagged quests. */
  color?: string | null;
  size?: number;
  /** Drains the colour without changing the layout — used for cleared or skipped quests. */
  dim?: boolean;
  className?: string;
}

export function CategorySlot({ children, color, size = 40, dim = false, className }: Props) {
  const tint = color ?? colors.accent;
  return (
    <span
      aria-hidden
      className={cn('notch [--notch:6px] grid shrink-0 place-items-center', className)}
      style={{
        width: size,
        height: size,
        color: dim ? colors.textSecondary : tint,
        backgroundColor: dim ? 'transparent' : `${tint}1f`,
        boxShadow: dim ? undefined : `inset 0 0 12px ${tint}26`,
        outline: `1px solid ${dim ? colors.panelBorder : `${tint}59`}`,
        outlineOffset: -1,
      }}
    >
      {children}
    </span>
  );
}
