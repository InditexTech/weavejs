// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

export type CompletionPoint = { x: number; y: number };

const distance = (a: CompletionPoint, b: CompletionPoint) =>
  Math.hypot(a.x - b.x, a.y - b.y);

/**
 * The points that complete a stabilized stroke where the pen was lifted.
 *
 * A stabilizer keeps the end of the line behind the pen. Completing the stroke
 * with one straight segment to the pen's last position changes the line where
 * it matters most: the segment has a direction the pen never went in, and a
 * nib or a taper, which follow the direction and the end of the line, draw it
 * as a different stroke. Instead the line goes on along the way the pen went
 * since the point of its path nearest to the end of the line. That way is a
 * little off the line, by what the stabilizer cut off a turn, so it is moved
 * by that much at first and less and less, to be exact at the last position.
 *
 * `tip` is the end of the line and `trail` the positions the pen reported, the
 * newest last, in the same space. Samples closer than `minStep` to the one
 * before are dropped, and the last one is always kept. When no sample of the
 * trail is within `maxOffset` of the end of the line, the trail does not go
 * back as far as the line, and the result is the straight segment to the pen's
 * last position.
 */
export function completionTail(
  tip: CompletionPoint,
  trail: CompletionPoint[],
  { minStep = 1, maxOffset = Infinity } = {}
): CompletionPoint[] {
  const end = trail.at(-1);
  if (!end) return [];
  if (end.x === tip.x && end.y === tip.y) return [];

  // the sample nearest to the end of the line, the newest of equally near ones
  let from = 0;
  let nearest = Infinity;
  for (let i = 0; i < trail.length; i++) {
    const d = distance(trail[i], tip);
    if (d <= nearest) {
      nearest = d;
      from = i;
    }
  }

  const rest = trail.slice(from + 1);
  if (rest.length === 0 || nearest > maxOffset) {
    return [{ x: end.x, y: end.y }];
  }

  const way = [trail[from], ...rest];
  const along = [0];
  for (let i = 1; i < way.length; i++) {
    along.push(along[i - 1] + distance(way[i - 1], way[i]));
  }
  const length = along[along.length - 1];
  if (length <= 0) return [{ x: end.x, y: end.y }];

  const offset = { x: tip.x - trail[from].x, y: tip.y - trail[from].y };

  const out: CompletionPoint[] = [];
  for (let i = 1; i < way.length; i++) {
    const last = i === way.length - 1;
    const fade = last ? 0 : 1 - along[i] / length;
    const point = {
      x: way[i].x + offset.x * fade,
      y: way[i].y + offset.y * fade,
    };
    const before = out.at(-1) ?? tip;
    if (!last && distance(point, before) < minStep) continue;
    out.push(point);
  }
  return out;
}
