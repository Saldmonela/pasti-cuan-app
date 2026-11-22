// Fisika pegas 3-axis + squash-and-stretch untuk kapsul aktif navigasi melayang (.nav).

export interface PillFrame {
  position: number;
  liftX: number;
  liftY: number;
  material: number;
  deviation: number;
  glassPresence: number;
  rimAlpha: number;
  isFlat: boolean;
  isDragging: boolean;
}

const TRAVEL_STIFFNESS = 230.0;
const TRAVEL_DAMPING = 29.0;
const FLAT_DAMPING = 36.0;

const LIFT_STIFFNESS = 250.0;
const LIFT_DAMPING_X = 19.0;
const LIFT_DAMPING_Y = 22.1;

const MATERIAL_STIFFNESS = 1000.0;
const MATERIAL_DAMPING = 63.3;

const HANDOVER_START = 0.97;
const HANDOVER_TAU = 0.11;
const GLASS_RETURN_TAU = 0.045;
const FOLLOW_TAU = 0.045;
const SIGN_TAU = 0.25;

const SAMPLE_WINDOW = 0.28;
const SENSITIVITY = 0.000072;
const MAX_DEFORMATION = 0.115;
const RESPONSE_TIME = 0.16;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function springStep(
  x: number,
  vel: number,
  target: number,
  dt: number,
  stiffness: number,
  damping: number
): [number, number] {
  let t = dt;
  let px = x;
  let pv = vel;
  while (t > 0) {
    const step = t > 1 / 240 ? 1 / 240 : t;
    const accel = -stiffness * (px - target) - damping * pv;
    pv += accel * step;
    px += pv * step;
    t -= step;
  }
  return [px, pv];
}

function stepLift(
  x: number,
  vel: number,
  target: number,
  dt: number,
  stiffness: number,
  damping: number
): [number, number] {
  const [nx, nv] = springStep(x, vel, target, dt, stiffness, damping);
  if (Math.abs(nx - target) < 0.0008 && Math.abs(nv) < 0.01) {
    return [target, 0];
  }
  return [nx, nv];
}

function rimOf(presence: number): number {
  return clamp((presence - 0.42) / 0.58, 0, 1);
}

class PillSquashModel {
  private history: Array<[number, number]> = [];
  public isTracking = false;
  private value = 0;

  start() {
    this.history = [];
    this.value = 0;
    this.isTracking = true;
  }

  stop() {
    this.isTracking = false;
    this.history = [];
    this.value = 0;
  }

  track(xPx: number, nowSec: number, dtSec: number): number {
    if (!this.isTracking) return this.value;
    this.history.push([xPx, nowSec]);
    const cutoff = nowSec - SAMPLE_WINDOW;
    while (this.history.length > 0 && this.history[0][1] < cutoff) {
      this.history.shift();
    }
    const raw = clamp(this.averageAcceleration() * SENSITIVITY, -MAX_DEFORMATION, MAX_DEFORMATION);
    const ease = clamp(dtSec / RESPONSE_TIME, 0, 1);
    this.value += (raw - this.value) * ease;
    return this.value;
  }

  private averageAcceleration(): number {
    const n = this.history.length;
    if (n < 3) return 0;
    const velocities: Array<[number, number]> = [];
    for (let i = 1; i < n; i++) {
      const dt = this.history[i][1] - this.history[i - 1][1];
      if (dt <= 0) continue;
      velocities.push([
        (this.history[i][0] - this.history[i - 1][0]) / dt,
        (this.history[i][1] + this.history[i - 1][1]) / 2,
      ]);
    }
    if (velocities.length < 2) return 0;
    let total = 0;
    let count = 0;
    for (let i = 1; i < velocities.length; i++) {
      const dt = velocities[i][1] - velocities[i - 1][1];
      if (dt <= 0) continue;
      total += (velocities[i][0] - velocities[i - 1][0]) / dt;
      count++;
    }
    return count === 0 ? 0 : total / count;
  }
}

export class GlassPillMotion {
  public index: number;
  public stepPx = 84;
  public physicsEnabled = true;
  public reduceMotion = false;

  private travelPos: number;
  private travelVel = 0;
  private travelTarget: number;
  private travelFrom: number;
  private travelActive = false;

  private lifted = false;
  private liftXPos = 0;
  private liftXVel = 0;
  private liftYPos = 0;
  private liftYVel = 0;
  private liftPos = 0;
  private liftVel = 0;

  private dragging = false;
  private dragTarget = 0;
  private dragFollow = 0;

  private travelSign = 0;
  private travelSignEased = 0;
  private handover = 1;
  private squash = 0;
  private squashModel = new PillSquashModel();

  private rafId = 0;
  private lastMs = -1;
  private onFrame: (frame: PillFrame) => void;

  constructor(initialIndex: number, onFrame: (frame: PillFrame) => void) {
    this.index = initialIndex;
    this.travelPos = initialIndex;
    this.travelTarget = initialIndex;
    this.travelFrom = initialIndex;
    this.onFrame = onFrame;
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  get isAnimating(): boolean {
    return this.rafId !== 0;
  }

  animateTo(next: number) {
    if (next === this.index && !this.dragging) return;
    if (this.reduceMotion) {
      this.snapTo(next);
      return;
    }
    this.index = next;
    this.travelActive = true;
    this.lifted = this.physicsEnabled;
    this.travelFrom = this.travelPos;
    this.travelTarget = next;
    const span = this.travelTarget - this.travelFrom;
    this.travelSign = Math.abs(span) < 1e-6 ? 0 : Math.sign(span);
    this.startLoop();
  }

  snapTo(target: number) {
    this.stopLoop();
    this.index = target;
    this.travelPos = target;
    this.travelTarget = target;
    this.travelFrom = target;
    this.travelVel = 0;
    this.travelActive = false;
    this.dragging = false;
    this.lifted = false;
    this.liftXPos = 0;
    this.liftXVel = 0;
    this.liftYPos = 0;
    this.liftYVel = 0;
    this.liftPos = 0;
    this.liftVel = 0;
    this.handover = 1;
    this.squash = 0;
    this.squashModel.stop();
    this.travelSign = 0;
    this.travelSignEased = 0;
    this.emit(true);
  }

  startDrag(initialPos?: number) {
    if (!this.physicsEnabled) return;
    this.dragging = true;
    this.travelActive = false;
    this.lifted = !this.reduceMotion;
    this.travelSign = 0;
    const start = initialPos ?? this.travelPos;
    this.dragFollow = this.travelPos;
    this.dragTarget = start;
    this.travelVel = 0;
    this.startLoop();
  }

  dragTo(pos: number, maxIndex: number) {
    if (!this.dragging) return;
    const over = pos < 0 ? pos : pos > maxIndex ? pos - maxIndex : 0;
    const base = clamp(pos, 0, maxIndex);
    this.dragTarget = base + Math.tanh(over * 1.25) * 0.16;
  }

  release(next: number) {
    if (!this.dragging) return;
    const from = this.dragFollow;
    this.dragging = false;
    this.index = next;
    if (this.reduceMotion) {
      this.snapTo(next);
      return;
    }
    this.travelActive = true;
    this.travelPos = from;
    this.travelVel = 0;
    this.travelFrom = from;
    this.travelTarget = next;
    const span = this.travelTarget - this.travelFrom;
    this.travelSign = Math.abs(span) < 1e-6 ? 0 : Math.sign(span);
    this.startLoop();
  }

  destroy() {
    this.stopLoop();
  }

  private startLoop() {
    if (this.rafId !== 0) return;
    this.lastMs = -1;
    const step = (nowMs: number) => {
      const rawDt = this.lastMs < 0 ? 1 / 60 : (nowMs - this.lastMs) / 1000;
      const dt = clamp(rawDt, 0.001, 0.05);
      this.lastMs = nowMs;
      const keepGoing = this.tick(dt, nowMs / 1000);
      if (keepGoing) {
        this.rafId = requestAnimationFrame(step);
      } else {
        this.rafId = 0;
        this.lastMs = -1;
      }
    };
    this.rafId = requestAnimationFrame(step);
  }

  private stopLoop() {
    if (this.rafId !== 0) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }
    this.lastMs = -1;
  }

  private travelProgress(): number {
    const span = Math.abs(this.travelTarget - this.travelFrom);
    if (span < 1e-6) return 1;
    return clamp(1 - Math.abs(this.travelTarget - this.travelPos) / span, 0, 1);
  }

  private tick(dt: number, nowSec: number): boolean {
    let travelSettled = true;
    if (this.travelActive) {
      const damping = this.physicsEnabled ? TRAVEL_DAMPING : FLAT_DAMPING;
      const [np, nv] = springStep(
        this.travelPos,
        this.travelVel,
        this.travelTarget,
        dt,
        TRAVEL_STIFFNESS,
        damping
      );
      this.travelPos = np;
      this.travelVel = nv;
      travelSettled = Math.abs(this.travelPos - this.travelTarget) < 0.0025 && Math.abs(this.travelVel) < 0.04;
      if (travelSettled) {
        this.travelPos = this.travelTarget;
        this.travelVel = 0;
      }
    }

    if (this.dragging) {
      if (this.reduceMotion) {
        this.dragFollow = this.dragTarget;
      } else {
        this.dragFollow += (this.dragTarget - this.dragFollow) * (1 - Math.exp(-dt / FOLLOW_TAU));
      }
    }

    if (!this.physicsEnabled) {
      this.lifted = false;
    } else if (!this.dragging && (travelSettled || this.travelProgress() >= HANDOVER_START)) {
      this.lifted = false;
    }

    const liftTarget = this.lifted ? 1 : 0;
    [this.liftXPos, this.liftXVel] = stepLift(
      this.liftXPos,
      this.liftXVel,
      liftTarget,
      dt,
      LIFT_STIFFNESS,
      LIFT_DAMPING_X
    );
    [this.liftYPos, this.liftYVel] = stepLift(
      this.liftYPos,
      this.liftYVel,
      liftTarget,
      dt,
      LIFT_STIFFNESS,
      LIFT_DAMPING_Y
    );
    [this.liftPos, this.liftVel] = stepLift(
      this.liftPos,
      this.liftVel,
      liftTarget,
      dt,
      MATERIAL_STIFFNESS,
      MATERIAL_DAMPING
    );

    const liftSettled = !this.lifted && this.liftXPos === 0 && this.liftYPos === 0 && this.liftPos === 0;

    if (this.travelActive && travelSettled && liftSettled && !this.dragging) {
      this.travelActive = false;
    }

    const frac = this.dragging ? this.dragFollow : this.travelPos;
    if (this.physicsEnabled && this.stepPx > 0) {
      if (!this.squashModel.isTracking) this.squashModel.start();
      let sq = this.squashModel.track(frac * this.stepPx, nowSec, dt);
      if (this.travelSignEased === 0) {
        this.travelSignEased = this.travelSign;
      } else if (this.travelSignEased !== this.travelSign) {
        this.travelSignEased += (this.travelSign - this.travelSignEased) * (1 - Math.exp(-dt / SIGN_TAU));
        if (Math.abs(this.travelSign - this.travelSignEased) < 0.01) {
          this.travelSignEased = this.travelSign;
        }
      }
      const key = this.travelSignEased;
      if (key !== 0) {
        sq = sq * (1 - Math.abs(key)) - key * Math.abs(sq);
      }
      this.squash = sq;
    } else {
      this.squashModel.stop();
      this.squash = 0;
    }

    const handoverTarget = this.lifted ? 0 : 1;
    const tau = handoverTarget > this.handover ? HANDOVER_TAU : GLASS_RETURN_TAU;
    this.handover += (handoverTarget - this.handover) * (1 - Math.exp(-dt / tau));
    if (Math.abs(handoverTarget - this.handover) < 0.002) {
      this.handover = handoverTarget;
    }

    const settled =
      !this.travelActive &&
      !this.dragging &&
      liftSettled &&
      Math.abs(this.squash) < 0.0005 &&
      this.handover >= 1;

    if (settled) {
      this.squashModel.stop();
      this.squash = 0;
      this.travelSign = 0;
      this.travelSignEased = 0;
    }

    this.emit(settled);
    return !settled;
  }

  private emit(settled: boolean) {
    const pos = this.dragging ? this.dragFollow : this.travelPos;
    const material = this.physicsEnabled ? clamp(this.liftPos, 0, 1) : 0;
    const glassPresence = this.physicsEnabled ? clamp(1 - this.handover, 0, 1) : 0;
    const rimAlpha = material * rimOf(glassPresence);
    this.onFrame({
      position: pos,
      liftX: this.physicsEnabled ? this.liftXPos : 0,
      liftY: this.physicsEnabled ? this.liftYPos : 0,
      material,
      deviation: this.physicsEnabled ? this.squash : 0,
      glassPresence,
      rimAlpha,
      isFlat: settled,
      isDragging: this.dragging,
    });
  }
}
