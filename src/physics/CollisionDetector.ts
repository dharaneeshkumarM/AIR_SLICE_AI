// AirSlice AI - Continuous Line-Segment Collision Engine
import type { Point2D, CutResult } from '../types.js';
import { Fruit } from './Fruit.js';
import { Bomb } from './Bomb.js';
import { lineSegmentCircleIntersection } from '../utils/MathUtils.js';

export class CollisionDetector {
  // Slicing velocity threshold: prevents lingering hands from slicing without a slash gesture
  private readonly minSliceSpeed = 160; // px/sec
  private readonly minSegmentDistance = 8; // px

  public checkFruitSlice(
    prevPoint: Point2D,
    currPoint: Point2D,
    speed: number,
    fruit: Fruit
  ): CutResult {
    if (fruit.sliceState !== 'whole') {
      return {
        hit: false,
        cutAngle: 0,
        cutNormal: { x: 0, y: 0 },
        entryPoint: { x: 0, y: 0 },
        exitPoint: { x: 0, y: 0 },
        speed: 0,
      };
    }

    const dx = currPoint.x - prevPoint.x;
    const dy = currPoint.y - prevPoint.y;
    const moveDist = Math.hypot(dx, dy);

    // Require intentional movement speed
    if (speed < this.minSliceSpeed && moveDist < this.minSegmentDistance * 2.5) {
      return {
        hit: false,
        cutAngle: 0,
        cutNormal: { x: 0, y: 0 },
        entryPoint: { x: 0, y: 0 },
        exitPoint: { x: 0, y: 0 },
        speed,
      };
    }

    const intersect = lineSegmentCircleIntersection(prevPoint, currPoint, fruit.position, fruit.radius);

    if (intersect.hit) {
      const cutAngle = Math.atan2(dy, dx);
      return {
        hit: true,
        cutAngle,
        cutNormal: intersect.normal,
        entryPoint: intersect.closestPoint,
        exitPoint: currPoint,
        speed,
      };
    }

    return {
      hit: false,
      cutAngle: 0,
      cutNormal: { x: 0, y: 0 },
      entryPoint: { x: 0, y: 0 },
      exitPoint: { x: 0, y: 0 },
      speed,
    };
  }

  public checkBombHit(
    prevPoint: Point2D,
    currPoint: Point2D,
    speed: number,
    bomb: Bomb
  ): boolean {
    if (bomb.isExploded) return false;

    const dx = currPoint.x - prevPoint.x;
    const dy = currPoint.y - prevPoint.y;
    const moveDist = Math.hypot(dx, dy);

    if (speed < this.minSliceSpeed && moveDist < this.minSegmentDistance) {
      return false;
    }

    const intersect = lineSegmentCircleIntersection(prevPoint, currPoint, bomb.position, bomb.radius * 0.9);
    return intersect.hit;
  }
}
