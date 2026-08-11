/**
 * 炮台实体（Cannon）
 * - 鼠标控制角度（带最大旋转速度）
 * - 倍率切换（滚轮）：speedLevels 档位
 * - 自动开火模式（右键切换）
 * - 多角度序列帧 / 单图旋转 两种渲染模式
 */
window.Cannon = class Cannon {
  constructor(opts) {
    this.cfg = opts.cfg;          // GameConfig.cannon
    this.worldW = opts.worldW;
    this.worldH = opts.worldH;

    this.x = this.worldW * this.cfg.xRatio;
    this.y = this.worldH * this.cfg.yRatio;

    this.angle = -90;              // 当前角度(度)，默认朝上
    this.speedLevel = 0;           // 当前档位下标（对应 cfg.speedLevels）
    this.autoFire = false;         // 右键开启

    this.lastFireAt = 0;           // 上次开火时间戳（性能时间，防连点吞弹）
    this.frenzy = 0;               // 狂暴剩余时间(秒)

    this.asset = opts.asset;       // {image, frames}
    this.pointRadius = 0;          // 炮口距中心距离，由渲染器计算
  }

  get multiplier() {
    return this.cfg.speedLevels[this.speedLevel] || 1;
  }

  /** 设置目标角度（平滑跟随，限制最大旋转速度） */
  setTargetAngle(target, dt) {
    let diff = Utils.normalizeAngle(target - this.angle);
    const maxStep = this.cfg.rotationSpeed * dt;
    diff = Math.max(-maxStep, Math.min(maxStep, diff));
    this.angle += diff;
  }

  /**
   * 尝试开火（爽游模式：单发子弹，命中后扩散成网）
   * 用时间戳判断冷却：无论调用频率多高，快速连点都不会吞弹
   * @param {number} gold 当前金币
   * @returns {{angle:number, cost:number} | null} 子弹角度与金币成本，金币不足或冷却中返回 null
   */
  tryFire(gold, now) {
    const interval = this.cfg.fireInterval * (this.frenzy > 0 ? 0.5 : 1);
    if (now - this.lastFireAt < interval * 1000) return null;

    const mult = this.multiplier;
    if (gold < mult) return null;

    this.lastFireAt = now;
    return { angle: this.angle, cost: mult };
  }

  /** 切换倍率档位 */
  cycleSpeed(dir) {
    const n = this.cfg.speedLevels.length;
    this.speedLevel = (this.speedLevel + (dir > 0 ? 1 : n - 1)) % n;
    return this.multiplier;
  }

  /** 当前使用的角度帧下标（多角度序列帧模式） */
  frameIndex() {
    const n = this.cfg.angleFrames;
    if (n <= 0) return -1;
    const deg = 360 / n;
    let idx = Math.round(((this.angle % 360) + 360) % 360 / deg) % n;
    return idx;
  }
};
