/**
 * 金币实体（Coin）
 * - 从鱼死亡位置飞向炮台（贝塞尔或直线+缓动）
 * - 到达炮台后加金币并销毁
 */
window.Coin = class Coin {
  /**
   * @param {object} opts
   *  opts.x,y     - 出生点
   *  opts.targetX,targetY - 炮台位置（吸金币终点）
   *  opts.value    - 面值
   *  opts.speed    - 飞行速度 px/s
   */
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.targetX = opts.targetX;
    this.targetY = opts.targetY;
    this.value = opts.value;
    this.speed = opts.speed;

    this.dead = false;
    this.arrived = false;          // 是否到达炮台（到达才结算金币）
    this.life = opts.life || 0.9;
    this.animT = 0;

    // 起始速度：略微向炮台方向
    const a = Math.atan2(this.targetY - this.y, this.targetX - this.x);
    this.vx = Math.cos(a) * this.speed * 0.6;
    this.vy = Math.sin(a) * this.speed * 0.6 - 120; // 先向上抛
  }

  update(dt) {
    this.animT += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    // 向目标加速（吸引力）
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 24) {
      this.dead = true; // 到达炮台
      this.arrived = true;
      return;
    }
    const accel = 900;
    const nx = dx / d, ny = dy / d;
    this.vx += nx * accel * dt;
    this.vy += ny * accel * dt;

    // 限速
    const sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (sp > this.speed) {
      this.vx = this.vx / sp * this.speed;
      this.vy = this.vy / sp * this.speed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }
};
