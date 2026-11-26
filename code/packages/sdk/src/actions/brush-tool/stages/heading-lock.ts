// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/** Distance, in screen pixels, the pointer must travel from the anchor before a heading is chosen. */
export const HEADING_LOCK_THRESHOLD_PX = 16;

/** Angle between two neighbouring headings: there are eight, one every 45 degrees. */
const HEADING_STEP = Math.PI / 4;

type Point = { x: number; y: number };

/** State of a lock: where it started and the heading it chose, if any. */
export type HeadingLock = {
  anchor: Point;
  /** Chosen heading in radians, a multiple of 45 degrees; `null` until chosen. */
  heading: number | null;
};

export const createHeadingLock = (anchor: Point): HeadingLock => ({
  anchor: { x: anchor.x, y: anchor.y },
  heading: null,
});

/**
 * Locks a pointer position to one of eight headings from an anchor.
 *
 * While the pointer is closer than `threshold` (in the unit of the points) to
 * the anchor nothing is locked and the position is returned as it is. Once it
 * is farther, the heading nearest to the direction of the pointer is chosen
 * and kept, and every position, that one included, is projected onto the line
 * through the anchor along that heading. The state is returned, not changed.
 */
export function lockToHeading(
  lock: HeadingLock,
  point: Point,
  threshold: number
): { point: Point; lock: HeadingLock } {
  const dx = point.x - lock.anchor.x;
  const dy = point.y - lock.anchor.y;

  let heading = lock.heading;
  if (heading === null) {
    if (!(Math.hypot(dx, dy) >= threshold)) return { point, lock };
    heading = Math.round(Math.atan2(dy, dx) / HEADING_STEP) * HEADING_STEP;
  }

  const ux = Math.cos(heading);
  const uy = Math.sin(heading);
  const along = dx * ux + dy * uy;

  return {
    point: { x: lock.anchor.x + ux * along, y: lock.anchor.y + uy * along },
    lock: heading === lock.heading ? lock : { anchor: lock.anchor, heading },
  };
}
