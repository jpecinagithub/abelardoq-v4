/*!
 * Abelardo Q - Capa de mando (Gamepad API -> teclado) para la build WebGL.
 *
 * El juego en PC se controla con FLECHAS o WASD (segun sus propios textos:
 * "WASD mover", "FLECHAS: NAVEGAR") y en movil con giroscopio. Esta capa,
 * sin tocar el codigo Unity compilado, traduce un mando estandar
 * (DualSense / DualShock de PlayStation, Xbox, etc.) a los eventos de
 * teclado que el juego ya entiende:
 *
 *   Stick izquierdo / cruceta  ->  Flechas + WASD (a la vez)
 *   Boton X (Cross, boton 0)   ->  Enter (+ clic sintetico en el centro
 *                                   del canvas, para el boton INICIAR)
 *   Boton Circulo (boton 1)    ->  Escape (volver / pausa)
 *   Boton Options (boton 9)    ->  Escape
 *
 * Muestra una pastilla de estado cuando hay un mando conectado.
 * No hace nada si no hay mando: ni interfiere con teclado ni con movil.
 */
(function () {
  'use strict';

  var DEAD_ON = 0.5;   // el stick se considera pulsado a partir de aqui
  var DEAD_OFF = 0.35; // y soltado por debajo de aqui (histeresis)

  // code -> { key, keyCode }
  var KEYS = {
    ArrowUp:    { key: 'ArrowUp',    keyCode: 38 },
    ArrowDown:  { key: 'ArrowDown',  keyCode: 40 },
    ArrowLeft:  { key: 'ArrowLeft',  keyCode: 37 },
    ArrowRight: { key: 'ArrowRight', keyCode: 39 },
    KeyW: { key: 'w', keyCode: 87 },
    KeyA: { key: 'a', keyCode: 65 },
    KeyS: { key: 's', keyCode: 83 },
    KeyD: { key: 'd', keyCode: 68 },
    Enter:  { key: 'Enter',  keyCode: 13 },
    Escape: { key: 'Escape', keyCode: 27 }
  };

  // Direcciones logicas -> lista de codes a mantener pulsados
  var DIRS = {
    up:    ['ArrowUp', 'KeyW'],
    down:  ['ArrowDown', 'KeyS'],
    left:  ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD']
  };

  var pressed = {}; // code -> true si lo tenemos "pulsado" nosotros

  function dispatch(code, down) {
    var def = KEYS[code];
    if (!def) return;
    var ev = new KeyboardEvent(down ? 'keydown' : 'keyup', {
      key: def.key, code: code, bubbles: true, cancelable: true
    });
    // Unity (Input Manager e Input System) lee keyCode/which del evento.
    try {
      Object.defineProperty(ev, 'keyCode', { value: def.keyCode });
      Object.defineProperty(ev, 'which', { value: def.keyCode });
    } catch (e) { /* si no se puede, el code/key ya viajan en el evento */ }
    var canvas = document.querySelector('#unity-canvas');
    var targets = [window, document];
    if (canvas) targets.push(canvas);
    if (document.activeElement) targets.push(document.activeElement);
    targets.forEach(function (t) { try { t.dispatchEvent(ev); } catch (e) {} });
  }

  function setCode(code, down) {
    if (!!pressed[code] === down) return;
    pressed[code] = down;
    dispatch(code, down);
  }

  function setDir(dir, down) {
    DIRS[dir].forEach(function (code) { setCode(code, down); });
  }

  function tapCode(code) {
    dispatch(code, true);
    setTimeout(function () { dispatch(code, false); }, 60);
  }

  function clickCanvasCenter() {
    var canvas = document.querySelector('#unity-canvas');
    if (!canvas) return;
    var r = canvas.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (type) {
      var opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 };
      var ev = type.indexOf('pointer') === 0 && window.PointerEvent
        ? new PointerEvent(type, opts) : new MouseEvent(type, opts);
      canvas.dispatchEvent(ev);
    });
  }

  // ---------- Pastilla de estado ----------
  var pill = null, pillTimer = null;
  function showPill(text, sticky) {
    if (!pill) {
      pill = document.createElement('div');
      pill.id = 'gamepad-pill';
      pill.style.cssText = [
        'position:fixed', 'left:14px', 'bottom:14px', 'z-index:60',
        'background:rgba(12,14,18,.88)', 'color:#eee',
        'font:600 13px/1.35 Inter,Arial,sans-serif',
        'padding:8px 13px', 'border-radius:999px',
        'border:1px solid rgba(255,255,255,.25)',
        'display:flex', 'align-items:center', 'gap:8px',
        'pointer-events:none', 'opacity:0', 'transition:opacity .25s'
      ].join(';');
      var dot = document.createElement('span');
      dot.style.cssText = 'width:9px;height:9px;border-radius:50%;background:#57e389;flex:none';
      pill.appendChild(dot);
      pill.appendChild(document.createElement('span'));
      document.body.appendChild(pill);
    }
    pill.lastChild.textContent = text;
    pill.style.opacity = '1';
    if (pillTimer) { clearTimeout(pillTimer); pillTimer = null; }
    if (!sticky) pillTimer = setTimeout(function () { pill.style.opacity = '0'; }, 3500);
  }

  function shortId(id) {
    if (!id) return 'Mando';
    // Los id de navegador suelen traer el nombre y el VID:PID; lo recortamos.
    return id.replace(/\s*\(.*?\)\s*/g, '').trim().slice(0, 42) || 'Mando';
  }

  window.addEventListener('gamepadconnected', function (e) {
    showPill('Mando conectado: ' + shortId(e.gamepad && e.gamepad.id), true);
  });
  window.addEventListener('gamepaddisconnected', function () {
    Object.keys(DIRS).forEach(function (d) { setDir(d, false); });
    showPill('Mando desconectado', false);
  });

  // ---------- Bucle de lectura ----------
  var state = { up: false, down: false, left: false, right: false };
  var btnPrev = {};

  function poll() {
    var pads = (navigator.getGamepads && navigator.getGamepads()) || [];
    var gp = null;
    for (var i = 0; i < pads.length; i++) { if (pads[i]) { gp = pads[i]; break; } }

    if (gp) {
      var ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
      var b = gp.buttons || [];
      var btn = function (n) { return !!(b[n] && (b[n].pressed || b[n].value > 0.5)); };

      var want = {
        up:    ay < -DEAD_ON  || state.up && ay < -DEAD_OFF    || btn(12),
        down:  ay >  DEAD_ON  || state.down && ay >  DEAD_OFF  || btn(13),
        left:  ax < -DEAD_ON  || state.left && ax < -DEAD_OFF  || btn(14),
        right: ax >  DEAD_ON  || state.right && ax >  DEAD_OFF || btn(15)
      };
      // La histeresis de arriba mezcla stick y cruceta; si la cruceta manda,
      // el estado queda fijado aunque el stick vuelva a la zona muerta.
      ['up', 'down', 'left', 'right'].forEach(function (d) {
        if (want[d] !== state[d]) { state[d] = want[d]; setDir(d, want[d]); }
      });

      // Botones con flanco de subida
      var actions = [
        { n: 0, run: function () { tapCode('Enter'); clickCanvasCenter(); } }, // X / Cross
        { n: 1, run: function () { tapCode('Escape'); } },                        // Circulo
        { n: 9, run: function () { tapCode('Escape'); } }                         // Options
      ];
      actions.forEach(function (a) {
        var now = btn(a.n);
        if (now && !btnPrev[a.n]) a.run();
        btnPrev[a.n] = now;
      });
    }
    requestAnimationFrame(poll);
  }
  requestAnimationFrame(poll);

  // Gancho de depuracion/pruebas
  window.__abelardoGamepad = {
    state: state, pressed: pressed,
    version: '1.0.0'
  };
})();
