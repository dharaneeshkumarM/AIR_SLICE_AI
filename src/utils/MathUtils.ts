// AirSlice AI - Math & Geometric Utilities
import type { Point2D } from '../types.js';

export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.hypot(dx, dy);
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Checks if line segment (p1 -> p2) intersects circle at (c, radius).
 * Returns true if there is an intersection, along with normal and intersection point.
 */
export function lineSegmentCircleIntersection(
  p1: Point2D,
  p2: Point2D,
  center: Point2D,
  radius: number
): { hit: boolean; closestPoint: Point2D; normal: Point2D; distanceToCenter: number } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    const dist = distance(p1, center);
    return {
      hit: dist <= radius,
      closestPoint: { ...p1 },
      normal: { x: 0, y: -1 },
      distanceToCenter: dist,
    };
  }

  // Projection scalar t of center onto segment p1->p2
  const t = clamp(((center.x - p1.x) * dx + (center.y - p1.y) * dy) / lenSq, 0, 1);
  const closestPoint: Point2D = {
    x: p1.x + t * dx,
    y: p1.y + t * dy,
  };

  const distToCenter = distance(closestPoint, center);
  const hit = distToCenter <= radius;

  // Blade direction normal
  const segmentLength = Math.sqrt(lenSq);
  // Unit normal perpendicular to blade path
  const normal: Point2D = {
    x: -dy / segmentLength,
    y: dx / segmentLength,
  };

  return {
    hit,
    closestPoint,
    normal,
    distanceToCenter: distToCenter,
  };
}
