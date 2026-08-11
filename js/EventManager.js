/**
 * 事件管理器（EventManager）
 * - 统一处理鼠标/键盘/自定义游戏事件
 * - 事件在游戏主循环内统一分发（稳定、可暂停）
 */
window.EventManager = (function () {
  "use strict";

  const listeners = new Map(); // 事件名 -> Set<fn>

  function on(evt, fn) {
    if (!listeners.has(evt)) listeners.set(evt, new Set());
    listeners.get(evt).add(fn);
    return () => off(evt, fn);
  }

  function off(evt, fn) {
    const s = listeners.get(evt);
    if (s) s.delete(fn);
  }

  function emit(evt, payload) {
    const s = listeners.get(evt);
    if (!s) return;
    for (const fn of s) {
      try { fn(payload); } catch (e) { console.error("[EventManager]", evt, e); }
    }
  }

  function clear(evt) {
    if (evt) listeners.delete(evt);
    else listeners.clear();
  }

  /** 在指定元素上挂接 DOM 事件（记录以便清理） */
  const domHandlers = [];

  function bindDom(target, evt, fn, options) {
    target.addEventListener(evt, fn, options);
    domHandlers.push({ target, evt, fn });
    return () => {
      target.removeEventListener(evt, fn, options);
    };
  }

  function unbindAllDom() {
    for (const h of domHandlers) {
      h.target.removeEventListener(h.evt, h.fn);
    }
    domHandlers.length = 0;
  }

  /** 键盘状态 */
  const keys = {};

  function keyDown(e) {
    keys[e.code] = true;
    emit("keydown", e);
  }

  function keyUp(e) {
    keys[e.code] = false;
    emit("keyup", e);
  }

  function isDown(code) {
    return !!keys[code];
  }

  /** 鼠标状态 */
  const mouse = {
    x: 0, y: 0,
    left: false,   // 左键按下
    right: false,  // 右键按下
  };

  function updateMouseFromEvent(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    mouse.x = (e.clientX - rect.left) * scaleX;
    mouse.y = (e.clientY - rect.top) * scaleY;
  }

  /** 统一初始化所有输入监听（传入 canvas 与游戏引用） */
  function initInput(canvas, game) {
    bindDom(canvas, "mousemove", (e) => {
      updateMouseFromEvent(e, canvas);
      emit("mousemove", { x: mouse.x, y: mouse.y });
    });

    bindDom(canvas, "mousedown", (e) => {
      if (e.button === 0) mouse.left = true;
      if (e.button === 2) mouse.right = true;
      updateMouseFromEvent(e, canvas);
      emit("mousedown", { button: e.button, x: mouse.x, y: mouse.y });
      e.preventDefault();
    });

    bindDom(window, "mouseup", (e) => {
      if (e.button === 0) mouse.left = false;
      if (e.button === 2) mouse.right = false;
      emit("mouseup", { button: e.button });
    });

    bindDom(canvas, "contextmenu", (e) => e.preventDefault());

    bindDom(window, "wheel", (e) => {
      emit("wheel", { delta: e.deltaY });
      e.preventDefault();
    }, { passive: false });

    bindDom(window, "keydown", keyDown);
    bindDom(window, "keyup", keyUp);

    // 失焦时清空按键，防止卡键
    bindDom(window, "blur", () => {
      for (const k in keys) keys[k] = false;
      mouse.left = mouse.right = false;
    });
  }

  return {
    on, off, emit, clear,
    bindDom, unbindAllDom,
    isDown, mouse, keys,
    initInput,
  };
})();
