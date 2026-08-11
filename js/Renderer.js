/**
 * 渲染层（Renderer）
 * - 负责所有绘制：背景、鱼、子弹、炮台、金币、特效、UI
 * - 不包含游戏逻辑，只读取状态绘制
 * - 全部使用 ctx.drawImage / 基础图形，无外部依赖
 */
window.Renderer = (function () {
  "use strict";

  /** 绘制背景：贴图自适应 或 程序化海底渐变 */
  function drawBackground(ctx, assets, w, h) {
    const bg = assets.get("bg");
    if (bg) {
      // 等比缩放居中，不变形（cover 裁剪效果）
      const r = Math.max(w / bg.width, h / bg.height);
      const dw = bg.width * r, dh = bg.height * r;
      ctx.drawImage(bg, (w - dw) / 2, (h - dh) / 2, dw, dh);
      return;
    }
    const t = (performance.now() / 1000);
    // 深海渐变
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#08334f");
    g.addColorStop(0.45, "#0a4a6f");
    g.addColorStop(0.78, "#0e5f8e");
    g.addColorStop(1, "#0b3d63");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 丁达尔光线（斜射光柱）
    ctx.save();
    ctx.globalAlpha = 0.07;
    for (let i = 0; i < 4; i++) {
      const lx = w * (0.12 + i * 0.26) + Math.sin(t * 0.3 + i * 2.1) * 30;
      ctx.fillStyle = "#bfe8ff";
      ctx.beginPath();
      ctx.moveTo(lx, -20);
      ctx.lineTo(lx + 90, -20);
      ctx.lineTo(lx - 40, h * 0.85);
      ctx.lineTo(lx - 130, h * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 背景浮尘/光斑
    for (let i = 0; i < 9; i++) {
      const bx = (i * 211 + t * 6) % (w + 240) - 120;
      const by = (i * 157 + Math.sin(t * 0.5 + i) * 14) % h;
      const rr = 34 + (i % 3) * 26;
      const rg = ctx.createRadialGradient(bx, by, 0, bx, by, rr);
      rg.addColorStop(0, "rgba(255,255,255,0.09)");
      rg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = rg;
      ctx.fillRect(bx - rr, by - rr, rr * 2, rr * 2);
    }

    // 摇曳的海草
    ctx.save();
    for (let i = 0; i < 10; i++) {
      const gx = ((i * 317 + 140) % (w + 80)) - 40;
      const sway = Math.sin(t * 1.1 + i * 1.7) * 14;
      const gh = 60 + (i % 4) * 26;
      const col = i % 2 === 0 ? "rgba(18,120,80,0.55)" : "rgba(30,150,105,0.45)";
      ctx.strokeStyle = col;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(gx, h - 6);
      ctx.quadraticCurveTo(gx + sway, h - gh * 0.6, gx + sway * 1.6, h - gh);
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = i % 2 === 0 ? "rgba(40,160,110,0.5)" : "rgba(60,190,130,0.4)";
      ctx.beginPath();
      ctx.moveTo(gx - 10, h - 8);
      ctx.quadraticCurveTo(gx - 10 + sway * 0.8, h - gh * 0.45, gx - 12 + sway * 1.3, h - gh * 0.72);
      ctx.stroke();
    }
    ctx.restore();

    // 上升气泡
    ctx.save();
    for (let i = 0; i < 7; i++) {
      const br = 2 + (i % 3) * 1.6;
      const bx = (i * 199 + 60) % w;
      const by = h - ((t * (14 + (i % 4) * 7) + i * 173) % (h + 40)) + 20;
      const bob = Math.sin(t * 1.8 + i * 2.4) * 4;
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(bx + bob, by, br, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.12)";
      ctx.beginPath();
      ctx.arc(bx + bob - br * 0.3, by - br * 0.3, br * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 远处暗礁剪影
    ctx.fillStyle = "rgba(10,32,54,0.5)";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h - 46);
    ctx.quadraticCurveTo(w * 0.16, h - 90, w * 0.3, h - 52);
    ctx.quadraticCurveTo(w * 0.44, h - 18, w * 0.6, h - 60);
    ctx.quadraticCurveTo(w * 0.78, h - 96, w * 0.9, h - 44);
    ctx.quadraticCurveTo(w * 0.96, h - 26, w, h - 34);
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fill();

    // 底部沙地
    const g2 = ctx.createLinearGradient(0, h * 0.84, 0, h);
    g2.addColorStop(0, "rgba(214,188,150,0)");
    g2.addColorStop(0.35, "rgba(214,188,150,0.4)");
    g2.addColorStop(1, "rgba(216,190,152,0.68)");
    ctx.fillStyle = g2;
    ctx.fillRect(0, h * 0.84, w, h * 0.16);
    // 沙地颗粒
    ctx.fillStyle = "rgba(255,235,200,0.3)";
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97) % w;
      const sy = h * 0.88 + ((i * 53) % (h * 0.11));
      ctx.beginPath();
      ctx.arc(sx, sy, 1.2 + (i % 3) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** 绘制鱼（单图或序列帧） */
  function drawFish(ctx, fish, assets) {
    const img = fish.firstImage();
    const frames = fish.frames && fish.frames.length > 0 ? fish.frames : null;

    ctx.save();
    ctx.globalAlpha = Math.max(0.05, fish.alpha || 1);

    // 未捕获闪白
    if (fish.escapedFlash > 0) {
      const blink = 0.5 + 0.5 * Math.sin(fish.escapedFlash * 60);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = blink * 0.6;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(fish.x, fish.y, fish.renderSize() * 0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = Math.max(0.05, fish.alpha || 1);
    }

    if (img) {
      let source = img;
      if (frames) {
        const f = frames[Math.floor(fish.animT * 1000 / (fish.asset.frameMs || 120)) % frames.length];
        if (f) source = f;
      }
      const sw = source.width, sh = source.height;
      const dw = sw * fish.scale, dh = sh * fish.scale;
      ctx.translate(fish.x, fish.y);
      if (fish.dir < 0) ctx.scale(-1, 1);
      // 朝游动方向旋转
      const pt = Utils.pointAt(fish.path, Math.min(fish.progress, 1));
      ctx.rotate(pt.angle * Math.PI / 180);
      ctx.drawImage(source, -dw / 2, -dh / 2, dw, dh);
    } else {
      // 无素材兜底：绘制一条简单鱼
      const size = 44 * fish.scale;
      ctx.translate(fish.x, fish.y);
      const pt = Utils.pointAt(fish.path, Math.min(fish.progress, 1));
      ctx.rotate(pt.angle * Math.PI / 180);
      const body = ctx.createLinearGradient(-size / 2, 0, size / 2, 0);
      body.addColorStop(0, "#2e8b57");
      body.addColorStop(1, "#66cdaa");
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 0, size / 2, size / 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#20b2aa";
      ctx.beginPath();
      ctx.moveTo(size / 2 - 4, 0);
      ctx.lineTo(-size / 6, -size / 3);
      ctx.lineTo(-size / 6, size / 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(size / 5, -size / 10, size / 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(size / 5 + 1, -size / 10, size / 30, 0, Math.PI * 2);
      ctx.fill();
    }

    // 锁定标记（锁定技能激活时显示在目标鱼身上）
    if (fish.locked) {
      const s = fish.renderSize() * 0.7;
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = "#ff3b3b";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#ff3b3b";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(fish.x, fish.y, s, 0, Math.PI * 2);
      ctx.stroke();
      const rot = fish.animT * 3;
      ctx.beginPath();
      ctx.moveTo(fish.x + Math.cos(rot) * s, fish.y + Math.sin(rot) * s);
      ctx.lineTo(fish.x - Math.cos(rot) * s, fish.y - Math.sin(rot) * s);
      ctx.moveTo(fish.x + Math.cos(rot + Math.PI / 2) * s, fish.y + Math.sin(rot + Math.PI / 2) * s);
      ctx.lineTo(fish.x - Math.cos(rot + Math.PI / 2) * s, fish.y - Math.sin(rot + Math.PI / 2) * s);
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.restore();
  }

  /** 倍率→子弹颜色（辨识度：1绿 2蓝 5紫 10金） */
  function bulletColor(mult) {
    const map = { 1: "#4dff9e", 2: "#4da6ff", 5: "#c77dff", 10: "#ffd84d" };
    return map[mult] || "#ffe08a";
  }

  /** 绘制子弹 */
  function drawBullet(ctx, bullet) {
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    let col = bulletColor(bullet.mult);
    if (bullet.lockMode) col = "#ff6a00"; // 锁定技能子弹保持橙色
    ctx.fillStyle = col;
    ctx.shadowColor = col;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, bullet.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    // 弹头
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(0, 0, bullet.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /**
   * 绘制炮台
   * 三种模式：
   *  a. angleFrames>0 且帧图存在：按角度切换帧
   *  b. 单图模式：旋转到当前角度
   *  c. 无素材：程序化绘制炮塔
   */
  function drawCannon(ctx, cannon, assets, worldW, worldH) {
    ctx.save();
    ctx.translate(cannon.x, cannon.y);

    const frames = assets.get("cannon_frames");
    const single = assets.get("cannon_single");

    if (Array.isArray(frames)) {
      const idx = cannon.frameIndex();
      const f = frames[idx];
      if (f) {
        const size = cannon.cfg.size;
        ctx.drawImage(f, -size / 2, -size / 2, size, size);
      } else {
        drawCannonFallback(ctx, cannon);
      }
    } else if (single) {
      ctx.rotate(cannon.angle * Math.PI / 180);
      const size = cannon.cfg.size;
      // 炮口朝右（素材约定炮口向右，与 0 度一致）
      ctx.drawImage(single, -size / 2, -size / 2, size, size);
    } else {
      drawCannonFallback(ctx, cannon);
    }

    // 炮口位置（供子弹出生点）
    const muzzleR = cannon.cfg.size * 0.45;
    cannon.muzzleX = cannon.x + Math.cos(cannon.angle * Math.PI / 180) * muzzleR;
    cannon.muzzleY = cannon.y + Math.sin(cannon.angle * Math.PI / 180) * muzzleR;

    ctx.restore();
  }

  function drawCannonFallback(ctx, cannon) {
    const size = cannon.cfg.size;
    ctx.rotate(cannon.angle * Math.PI / 180);
    // 底座圆盘
    ctx.fillStyle = "#5b3a1e";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8b5a2b";
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
    ctx.fill();
    // 炮管（向右）
    ctx.fillStyle = "#a0522d";
    ctx.fillRect(0, -size * 0.09, size * 0.5, size * 0.18);
    ctx.fillStyle = "#d2691e";
    ctx.fillRect(size * 0.38, -size * 0.12, size * 0.14, size * 0.24);
  }

  /** 绘制金币（贴图或程序化） */
  function drawCoin(ctx, coin, assets) {
    const img = assets.get("coin");
    ctx.save();
    ctx.translate(coin.x, coin.y);
    const pulse = 1 + Math.sin(coin.animT * 14) * 0.12;
    ctx.scale(pulse, pulse);
    if (img) {
      const s = 26;
      ctx.drawImage(img, -s / 2, -s / 2, s, s);
    } else {
      ctx.fillStyle = "#ffd700";
      ctx.shadowColor = "#ffd700";
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff3b0";
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  /** 绘制特效 */
  function drawEffect(ctx, fx) {
    ctx.save();
    const alpha = fx.opacity();
    ctx.globalAlpha = alpha;

    if (fx.type === "net") {
      drawNet(ctx, fx, alpha);
    } else if (fx.frameImages) {
      const f = fx.frameImages[fx.frameIndex];
      if (f) {
        const s = Math.max(f.width, f.height) * fx.scale;
        ctx.drawImage(f, fx.x - s / 2, fx.y - s / 2, s, s);
      }
    } else if (fx.particles) {
      for (const p of fx.particles) {
        if (p.life <= 0) continue;
        const pa = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = alpha * pa;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * pa, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  /** 绘制扩散的渔网状范围圈 */
  function drawNet(ctx, fx, alpha) {
    // 扩散进度 0→1，网从命中点向外张开
    const t = 1 - fx.life / fx.maxLife;
    const r = fx.netRadius * (0.3 + 0.7 * t);
    const fade = alpha * (1 - t * 0.5);

    ctx.globalAlpha = fade;
    ctx.strokeStyle = "rgba(190, 235, 255, 1)";
    ctx.shadowColor = "#6ad7ff";
    ctx.shadowBlur = 8;
    ctx.lineWidth = 2;

    // 外圈（最亮）
    ctx.beginPath();
    ctx.arc(fx.x, fx.y, r, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = fade * 0.7;
    ctx.lineWidth = 1.4;

    // 同心圆环（网眼）
    for (let i = 1; i <= fx.netMesh; i++) {
      ctx.beginPath();
      ctx.arc(fx.x, fx.y, r * i / (fx.netMesh + 1), 0, Math.PI * 2);
      ctx.stroke();
    }

    // 放射线（网筋）
    const rot = fx.animT * 1.5;
    for (let i = 0; i < fx.netRays; i++) {
      const a = rot + i * Math.PI * 2 / fx.netRays;
      ctx.beginPath();
      ctx.moveTo(fx.x + Math.cos(a) * r * 0.06, fx.y + Math.sin(a) * r * 0.06);
      ctx.lineTo(fx.x + Math.cos(a) * r, fx.y + Math.sin(a) * r);
      ctx.stroke();
    }

    ctx.shadowBlur = 0;
  }

  /** 技能全屏特效：冰冻=边缘蓝色涟漪，狂暴=边缘红色泛光脉冲 */
  function drawSkillAura(ctx, skills, w, h, time) {
    const freezeT = skills.freeze.active > 0 ? skills.freeze.active / 3.0 : 0;
    const frenzyT = skills.frenzy.active > 0 ? skills.frenzy.active / 5.0 : 0;
    if (freezeT <= 0 && frenzyT <= 0) return;

    ctx.save();
    ctx.lineWidth = 3;

    // 冰冻：边缘向内扩散的蓝色涟漪（3 层错峰）
    if (freezeT > 0) {
      for (let i = 0; i < 3; i++) {
        const p = ((time * 0.5 + i / 3) % 1);
        const alpha = (1 - p) * 0.7 * Math.min(1, freezeT);
        ctx.strokeStyle = `rgba(80, 180, 255, ${alpha.toFixed(3)})`;
        ctx.shadowColor = "#4ab8ff";
        ctx.shadowBlur = 14;
        const inset = 24 + p * 120;
        ctx.beginPath();
        ctx.moveTo(inset, inset);
        ctx.lineTo(w - inset, inset);
        ctx.lineTo(w - inset, h - inset);
        ctx.lineTo(inset, h - inset);
        ctx.closePath();
        ctx.stroke();
      }
      // 淡蓝色蒙层
      ctx.fillStyle = `rgba(60, 150, 255, ${(0.10 * Math.min(1, freezeT)).toFixed(3)})`;
      ctx.fillRect(0, 0, w, h);
    }

    // 狂暴：边缘红色脉冲光晕
    if (frenzyT > 0) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 8);
      const a = (0.25 + 0.25 * pulse) * Math.min(1, frenzyT);
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75);
      g.addColorStop(0, "rgba(255,80,30,0)");
      g.addColorStop(1, `rgba(255,80,30,${a.toFixed(3)})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // 边缘锯齿光带
      ctx.strokeStyle = `rgba(255,120,50,${(0.5 * Math.min(1, frenzyT)).toFixed(3)})`;
      ctx.shadowColor = "#ff5a1f";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(10, 10);
      ctx.lineTo(w - 10, 10);
      ctx.lineTo(w - 10, h - 10);
      ctx.lineTo(10, h - 10);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.restore();
  }

  return {
    drawBackground, drawFish, drawBullet, drawCannon, drawCoin, drawEffect, drawSkillAura,
  };
})();
