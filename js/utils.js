/**
 * 工具函数：随机数、数学、贝塞尔曲线
 */
window.Utils = (function () {
  "use strict";

  /** 随机 [min, max) 浮点数 */
  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  /** 随机 [min, max] 整数 */
  function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
  }

  /** 从数组随机取一项 */
  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** 按权重随机取下标（weights 数组） */
  function pickWeighted(weights) {
    let total = 0;
    for (const w of weights) total += w;
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }

  /** 角度归一化到 (-180, 180] */
  function normalizeAngle(a) {
    while (a > 180) a -= 360;
    while (a <= -180) a += 360;
    return a;
  }

  /** 两点距离 */
  function dist(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** 线性插值 */
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /**
   * 三次贝塞尔曲线点计算
   * p0..p3 = [{x,y}]，t ∈ [0,1]
   */
  function cubicBezier(p0, p1, p2, p3, t) {
    const u = 1 - t;
    const x = u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x;
    const y = u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y;
    return { x, y };
  }

  /**
   * 预计算一条三次贝塞尔曲线的采样点（含每点角度）
   * 返回 [{x, y, angle}]，len = 采样数量
   */
  function bezierPath(p0, p1, p2, p3, len) {
    const pts = [];
    const N = Math.max(8, len || 64);
    let prev = null;
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const pt = cubicBezier(p0, p1, p2, p3, t);
      let angle = 0;
      if (prev) {
        angle = Math.atan2(pt.y - prev.y, pt.x - prev.x) * 180 / Math.PI;
      }
      pts.push({ x: pt.x, y: pt.y, angle });
      prev = pt;
    }
    return pts;
  }

  /** 根据百分比(0~1)取路径点（带插值） */
  function pointAt(pts, percent) {
    const t = Math.max(0, Math.min(1, percent)) * (pts.length - 1);
    const i = Math.floor(t);
    const frac = t - i;
    const a = pts[i], b = pts[Math.min(i + 1, pts.length - 1)];
    return {
      x: a.x + (b.x - a.x) * frac,
      y: a.y + (b.y - a.y) * frac,
      angle: a.angle + (b.angle - a.angle) * frac,
    };
  }

  /** 加载图片（Promise） */
  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("加载失败: " + src));
      img.src = src;
    });
  }

  /** 保留两位 */
  function fmt(n) {
    return Math.round(n * 100) / 100;
  }

  return {
    rand, randInt, pick, pickWeighted, normalizeAngle, dist, lerp,
    cubicBezier, bezierPath, pointAt, loadImage, fmt,
  };
})();
