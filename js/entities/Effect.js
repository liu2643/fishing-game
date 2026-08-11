/**
 * 特效实体（Effect）
 * 支持两类：
 *  1. 贴图序列帧（爆炸等）—— assetFrames 数组
 *  2. 粒子系统（水花/火花/爆炸粒子）—— 纯 Canvas 绘制
 * 所有特效带生命期，到期自动销毁
 */
window.Effect = class Effect {
  constructor(opts) {
    this.type = opts.type;              // 'explosion' | 'splash' | 'spark' | 'coin_burst'
    this.x = opts.x;
    this.y = opts.y;

    this.frameImages = opts.frameImages || null;  // 序列帧贴图（允许 null 元素）
    this.frameMs = opts.frameMs || 50;
    this.frameIndex = 0;
    this.animT = 0;

    this.life = opts.life || 0.4;
    this.maxLife = this.life;
    this.dead = false;

    // 网特效参数（type='net' 时使用）
    this.netRadius = opts.netRadius || 60;
    this.netMesh = opts.netMesh || 3;
    this.netRays = opts.netRays || 8;

    // 粒子参数
    this.particles = null;
    this.scale = opts.scale || 1;
    this.color = opts.color || "#ffd700";
    this.angle = opts.angle || 0;

    if (!this.frameImages && opts.particles !== 0 && this.type !== "net") {
      this._initParticles(opts);
    }
  }

  _initParticles(opts) {
    const count = opts.count || 10;
    const ps = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Utils.rand(60, opts.speed || 260);
      ps.push({
        x: this.x, y: this.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        size: Utils.rand(2, 6) * this.scale,
        life: Utils.rand(0.2, this.life),
        maxLife: this.life,
        color: opts.colors ? Utils.pick(opts.colors) : this.color,
      });
    }
    this.particles = ps;
  }

  update(dt) {
    this.animT += dt;
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    // 帧推进
    if (this.frameImages) {
      const totalFrames = this.frameImages.length;
      if (totalFrames > 1) {
        this.frameIndex = Math.min(totalFrames - 1, Math.floor(this.animT * 1000 / this.frameMs));
      }
    }

    if (this.particles) {
      for (const p of this.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += (this.type === 'coin_burst' ? 400 : 200) * dt; // 重力
        p.life -= dt;
      }
    }
  }

  /** 贴图帧是否有效（非 null） */
  hasValidFrame() {
    if (!this.frameImages) return false;
    const f = this.frameImages[this.frameIndex];
    return !!f;
  }

  opacity() {
    const t = this.life / this.maxLife;
    return Math.max(0, Math.min(1, t));
  }
};
