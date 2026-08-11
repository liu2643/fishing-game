/**
 * 子弹实体（Bullet）
 * - 直线飞行（默认）
 * - 锁定技能开启时：自动追踪最近未死鱼（lockMode=true）
 * - 圆形碰撞体，命中即消失
 */
window.Bullet = class Bullet {
  /**
   * @param {object} opts
   *  opts.x,y     - 出生点（炮口）
   *  opts.angle   - 初始角度(度)
   *  opts.speed   - 速度 px/s
   *  opts.radius  - 碰撞半径
   *  opts.damage  - 伤害
   */
  constructor(opts) {
    this.x = opts.x;
    this.y = opts.y;
    this.angle = opts.angle;
    this.speed = opts.speed;
    this.radius = opts.radius;
    this.damage = opts.damage;
    this.mult = opts.mult || 1;   // 倍率（决定子弹颜色，辨识度）

    this.vx = Math.cos(this.angle * Math.PI / 180) * this.speed;
    this.vy = Math.sin(this.angle * Math.PI / 180) * this.speed;

    this.dead = false;
    this.lockMode = !!opts.lockMode; // 锁定技能：追踪模式
    this.lockTarget = null;          // 锁定技能：指定追踪目标（只打这条鱼）
    this.turnSpeed = 540;    // 追踪转向速度 度/秒
    this.life = 3.2;         // 存活上限(秒)，防无限飞
    this.animT = 0;
  }

  /**
   * @param {number} dt 秒
   * @param {Fish[]} fishes 用于追踪的目标列表
   */
  update(dt, fishes) {
    this.animT += dt;
    this.life -= dt;
    if (this.life <= 0) {
      this.dead = true;
      return;
    }

    if (this.lockMode) {
      // 有指定目标（锁定技能）：只追这条鱼，越过其他鱼群
      if (this.lockTarget && !this.lockTarget.dead) {
        const want = Math.atan2(this.lockTarget.y - this.y, this.lockTarget.x - this.x) * 180 / Math.PI;
        this.angle = want;
        this.vx = Math.cos(this.angle * Math.PI / 180) * this.speed;
        this.vy = Math.sin(this.angle * Math.PI / 180) * this.speed;
      } else {
        // 无指定目标：追踪最近存活且已进屏的鱼（跳过屏幕外刚出生的，避免追出屏幕）
        let target = null, best = Infinity;
        for (const f of fishes) {
          if (f.dead) continue;
          if (f.x < -20 || f.x > this.worldW + 20 || f.y < -20 || f.y > this.worldH + 20) continue;
          const d = Utils.dist(this.x, this.y, f.x, f.y);
          if (d < best) { best = d; target = f; }
        }
        if (target) {
          // 瞬间追踪（无转向速度限制，子弹几乎必中）
          const want = Math.atan2(target.y - this.y, target.x - this.x) * 180 / Math.PI;
          this.angle = want;
          this.vx = Math.cos(this.angle * Math.PI / 180) * this.speed;
          this.vy = Math.sin(this.angle * Math.PI / 180) * this.speed;
        }
      }
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // 出屏销毁（留一点余量）
    if (this.x < -30 || this.x > this.worldW + 30 || this.y < -30 || this.y > this.worldH + 30) {
      this.dead = true;
    }
  }

  setWorld(w, h) {
    this.worldW = w;
    this.worldH = h;
  }
};
