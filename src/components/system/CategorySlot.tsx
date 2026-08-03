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
    // Two layers because `clip-path` clips box-shadow: an outer shadow on the chamfered tile
    // simply would not paint. The outer span is unclipped and carries the cast shadow as a
    // `drop-shadow` filter (which follows the clipped silhouette); the inner one is clipped and
    // carries the bevel, whose shadows are all inset and therefore survive the clip.
    <span
      aria-hidden
      className={cn('grid shrink-0 place-items-center', className)}
      style={{
        width: size,
        height: size,
        filter: dim ? undefined : 'drop-shadow(0 2px 5px rgb(0 0 0 / 0.55))',
      }}
    >
      <span
        className="notch [--notch:6px] grid size-full place-items-center"
        style={{
          color: dim ? colors.textSecondary : tint,
          // Lit from the top-left, like the reference's renders. The gradient, the bright inner
          // top edge and the dark inner bottom are what make a flat tile read as an extruded
          // chip — the same three cues a 3D render gives you, at zero bytes.
          background: dim
            ? 'transparent'
            : `linear-gradient(145deg, ${tint}4d 0%, ${tint}1f 46%, ${tint}0a 100%)`,
          boxShadow: dim
            ? undefined
            : `inset 0 1px 0 ${tint}8c, inset 0 -3px 7px rgb(0 0 0 / 0.5), inset 0 0 12px ${tint}26`,
          outline: `1px solid ${dim ? colors.panelBorder : `${tint}66`}`,
          outlineOffset: -1,
        }}
      >
        {children}
      </span>
    </span>
  );
}
