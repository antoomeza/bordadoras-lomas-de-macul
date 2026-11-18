/* El archivo: vista "explorar" (lienzo que se arrastra) y vista "categorías" (rejilla con filtros). */
(function () {
  'use strict';

  var TODOS = (window.BORDADOS || []).filter(function (b) { return b.img; });
  var ORDEN = window.ORDEN_CATEGORIAS || {};
  var EJES = [
    { k: 'a', clave: 'autora', nombre: 'autora' },
    { k: 'd', clave: 'decada', nombre: 'año' },
    { k: 't', clave: 'tematica', nombre: 'temática' },
    { k: 'l', clave: 'localidad', nombre: 'localidad' }
  ];
  var $ = function (id) { return document.getElementById(id); };
  var body = document.body, plano = $('plano'), explorar = $('explorar'), rejilla = $('rejilla'), vacio = $('vacio');
  var catsEl = $('cats'), subsEl = $('subs');
  var modo = 'explorar';
  var filtros = {}; EJES.forEach(function (e) { filtros[e.k] = []; });
  var abierta = null;

  /* ---------- fichas de los bordados (dos juegos: explorar y categorías) ---------- */
  function crear(b) {
    var t = document.createElement('button');
    t.type = 'button'; t.className = 'bordado'; t.setAttribute('data-c', b.c);
    t.setAttribute('aria-label', (b.n || 'Sin título') + (b.a ? ', ' + b.a : ''));
    var im = new Image(); im.alt = ''; im.decoding = 'async'; im.draggable = false;
    im.src = 'assets/archivo/miniatura/' + b.c + '.webp';
    t.appendChild(im); return t;
  }
  var celdas = {};
  TODOS.forEach(function (b) {
    var t = crear(b);
    t.style.left = b.e[0] + 'px'; t.style.top = b.e[1] + 'px'; t.style.width = b.e[2] + 'px'; t.style.height = b.e[3] + 'px';
    plano.appendChild(t);
    var g = crear(b); rejilla.appendChild(g); celdas[b.c] = g;
  });
  var porCodigo = {}; TODOS.forEach(function (b) { porCodigo[b.c] = b; });

  /* ---------- EXPLORAR: lienzo de 2905 x 1874 que se recorre arrastrando ---------- */
  var ANCHO = 2905, ALTO = 1874, esc = 1, px = 0, py = 0, vx = 0, vy = 0, inercia = 0, yaCentrado = false;
  function calcularEscala() { esc = Math.max(0.55, Math.min(1.25, window.innerWidth / 1440)); }
  function limites() { return { x: Math.max(0, ANCHO * esc - window.innerWidth), y: Math.max(0, ALTO * esc - window.innerHeight) }; }
  function aplicar() {
    var l = limites();
    px = Math.max(0, Math.min(l.x, px)); py = Math.max(0, Math.min(l.y, py));
    plano.style.transform = 'translate3d(' + (-px) + 'px,' + (-py) + 'px,0) scale(' + esc + ')';
  }
  function centrar() { calcularEscala(); px = limites().x / 2; py = 0; aplicar(); yaCentrado = true; }

  var arr = null, hubo = false;
  explorar.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    cancelAnimationFrame(inercia);
    arr = { x: e.clientX, y: e.clientY, px: px, py: py, id: e.pointerId, t: performance.now(), mx: e.clientX, my: e.clientY, mover: false };
    hubo = false; vx = vy = 0;
  });
  explorar.addEventListener('pointermove', function (e) {
    if (!arr || e.pointerId !== arr.id) return;
    var dx = e.clientX - arr.x, dy = e.clientY - arr.y;
    if (!arr.mover && Math.hypot(dx, dy) > 6) {
      arr.mover = true; hubo = true; explorar.classList.add('arrastrando');
      try { explorar.setPointerCapture(e.pointerId); } catch (_) {}
    }
    if (!arr.mover) return;
    var ahora = performance.now(), dt = Math.max(1, ahora - arr.t);
    vx = (arr.mx - e.clientX) / dt * 16; vy = (arr.my - e.clientY) / dt * 16;
    arr.mx = e.clientX; arr.my = e.clientY; arr.t = ahora;
    px = arr.px - dx; py = arr.py - dy; aplicar();
  });
  function soltar(e) {
    if (!arr || e.pointerId !== arr.id) return;
    var movio = arr.mover; arr = null; explorar.classList.remove('arrastrando');
    if (movio) deslizar();
  }
  explorar.addEventListener('pointerup', soltar);
  explorar.addEventListener('pointercancel', soltar);
  function deslizar() {
    vx *= 0.96; vy *= 0.96;
    if (Math.abs(vx) < 0.15 && Math.abs(vy) < 0.15) return;
    px += vx; py += vy; aplicar(); vx *= 0.94; vy *= 0.94;
    inercia = requestAnimationFrame(deslizar);
  }
  explorar.addEventListener('wheel', function (e) {
    e.preventDefault(); cancelAnimationFrame(inercia);
    var k = e.deltaMode === 1 ? 16 : 1;
    px += e.deltaX * k; py += e.deltaY * k; aplicar();
  }, { passive: false });
  explorar.addEventListener('click', function (e) {
    if (hubo) { hubo = false; e.preventDefault(); return; }
    var t = e.target.closest('.bordado'); if (!t) return;
    abrir(t.getAttribute('data-c'));
  });

  /* ---------- CATEGORÍAS: filtros y rejilla ---------- */
  var LECTURA = TODOS.slice().sort(function (a, b) {
    return (Math.round(a.f[1] / 25) - Math.round(b.f[1] / 25)) || (a.f[0] - b.f[0]);
  });
  function pasa(b) {
    for (var i = 0; i < EJES.length; i++) {
      var s = filtros[EJES[i].k];
      if (s.length && s.indexOf(b[EJES[i].k]) < 0) return false;
    }
    return true;
  }
  function visibles() { return LECTURA.filter(pasa); }

  function disponer() {
    var W = document.documentElement.clientWidth;
    var mg = W >= 1440 ? (W - 1232) / 2 : (W >= 900 ? 60 : 20);
    var disp = W - 2 * mg, GAP = 16;
    var cols = W >= 1440 ? 6 : Math.max(2, Math.round((disp + GAP) / 208));
    var tw = (disp - GAP * (cols - 1)) / cols;
    var alto = []; for (var i = 0; i < cols; i++) alto.push(0);
    var vis = {}; visibles().forEach(function (b) { vis[b.c] = true; });
    LECTURA.forEach(function (b) {
      var g = celdas[b.c];
      g.style.width = tw + 'px'; g.style.height = (tw / b.r) + 'px';
      if (!vis[b.c]) { g.classList.add('oculto'); g.tabIndex = -1; return; }
      var c = 0; for (var j = 1; j < cols; j++) if (alto[j] < alto[c]) c = j;
      g.classList.remove('oculto'); g.tabIndex = 0;
      g.style.transform = 'translate(' + (mg + c * (tw + GAP)) + 'px,' + alto[c] + 'px)';
      alto[c] += tw / b.r + 22;
    });
    rejilla.style.height = Math.max.apply(null, alto) + 'px';
    var n = Object.keys(vis).length;
    vacio.hidden = n > 0;
    return n;
  }

  /* barra: categorías, subcategorías y contador */
  var chips = {}, estadoNum, btnLimpiar;
  function chip(texto, clase) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'chip' + (clase ? ' ' + clase : '');
    var s = document.createElement('span'); s.textContent = texto; b.appendChild(s); return b;
  }
  EJES.forEach(function (e) {
    var c = chip(e.nombre); c.setAttribute('aria-expanded', 'false');
    c.addEventListener('click', function () { abierta = (abierta === e.k) ? null : e.k; actualizar(); });
    chips[e.k] = c; catsEl.appendChild(c);
  });
  var estado = document.createElement('div'); estado.className = 'estado';
  estadoNum = document.createElement('span');
  btnLimpiar = chip('limpiar'); btnLimpiar.hidden = true;
  btnLimpiar.addEventListener('click', function () { EJES.forEach(function (e) { filtros[e.k] = []; }); actualizar(); });
  estado.appendChild(estadoNum); estado.appendChild(btnLimpiar); catsEl.appendChild(estado);

  function pintarSubs() {
    subsEl.innerHTML = '';
    if (!abierta) { subsEl.classList.remove('abierta'); return; }
    var e = EJES.filter(function (x) { return x.k === abierta; })[0];
    (ORDEN[e.clave] || []).forEach(function (v) {
      if (!TODOS.some(function (b) { return b[e.k] === v; })) return;      // solo categorías que tienen bordados
      var c = chip(v, filtros[e.k].indexOf(v) >= 0 ? 'sel' : '');
      c.addEventListener('click', function () {
        var i = filtros[e.k].indexOf(v);
        if (i >= 0) filtros[e.k].splice(i, 1); else filtros[e.k].push(v);
        actualizar();
      });
      subsEl.appendChild(c);
    });
    subsEl.classList.add('abierta');
  }
  function actualizar() {
    EJES.forEach(function (e) {
      chips[e.k].setAttribute('aria-expanded', abierta === e.k ? 'true' : 'false');
      chips[e.k].classList.toggle('tiene', filtros[e.k].length > 0 && abierta !== e.k);
    });
    pintarSubs();
    var n = disponer();
    estadoNum.textContent = n + (n === 1 ? ' bordado' : ' bordados');
    btnLimpiar.hidden = !EJES.some(function (e) { return filtros[e.k].length; });
  }

  /* ---------- modos ---------- */
  function irA(m) {
    modo = m; body.setAttribute('data-modo', m);
    [].forEach.call(document.querySelectorAll('.tab[data-modo]'), function (t) {
      t.setAttribute('aria-pressed', t.getAttribute('data-modo') === m ? 'true' : 'false');
    });
    if (m === 'explorar') { if (!yaCentrado) centrar(); }
    else { window.scrollTo(0, 0); actualizar(); }
    history.replaceState(null, '', '#' + m);
  }
  [].forEach.call(document.querySelectorAll('.tab[data-modo]'), function (t) {
    t.addEventListener('click', function () { irA(t.getAttribute('data-modo')); });
  });
  rejilla.addEventListener('click', function (e) {
    var t = e.target.closest('.bordado'); if (!t || t.classList.contains('oculto')) return;
    abrir(t.getAttribute('data-c'));
  });

  /* ---------- ficha individual (página propia dentro del archivo) ---------- */
  var enFicha = false, volverA = 'explorar', guardadoY = 0;
  function fila(rotulo, valor) { return '<div class="f-fila"><b>' + rotulo + '</b><span>' + valor + '</span></div>'; }
  var ONDA = '<div class="f-onda" aria-hidden="true"></div>';
  function txt(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
  function pintarFicha(b) {
    var x = b.x || {}, anio = (b.y.match(/\d{4}/) || [''])[0];
    var aut = b.a && b.a !== 'Sin autora confirmada' ? b.a : '';
    var im = $('f-img'); im.src = 'assets/archivo/grande/' + b.c + '.webp'; im.alt = (b.n || 'Bordado') + (b.a ? ', de ' + b.a : '');
    $('f-imgbox').classList.remove('zoom', 'sigue');
    $('f-nombre').textContent = b.n || '-';
    var cita = $('f-cita'); cita.hidden = !x.q;
    $('f-q').textContent = x.q || ''; $('f-qa').textContent = x.qa || '';
    var rep = x.rep || ''; $('f-rep').textContent = rep; $('f-rep').hidden = !rep;
    $('f-col1').innerHTML = fila('Bordadora', txt(aut || '-')) + ONDA + fila('Técnica', txt(x.tec || '-'));
    $('f-col2').innerHTML = fila('Medidas', txt(x.med || '-')) + ONDA + fila('Año', txt(anio || '-'));
    var cont = $('f-chips'); cont.innerHTML = '';
    [['d', b.d], ['a', b.a], ['l', b.l], ['t', b.t]].forEach(function (par) {
      if (!par[1]) return;
      var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'f-chip';
      btn.textContent = par[0] === 'd' ? par[1].replace(/^(\d{4})s$/, '$1´s') : par[1];
      btn.addEventListener('click', function () { irAFiltro(par[0], par[1]); });
      cont.appendChild(btn);
    });
  }
  function abrir(cod) {
    var b = porCodigo[cod]; if (!b) return;
    guardadoY = window.scrollY; volverA = modo; enFicha = true;
    body.setAttribute('data-vista', 'ficha');
    pintarFicha(b); window.scrollTo(0, 0);
    history.replaceState(null, '', '#' + modo + '/' + cod);
  }
  function salirFicha() { enFicha = false; body.removeAttribute('data-vista'); }
  function volver() {
    salirFicha(); irA(volverA);
    if (volverA === 'categorias') window.scrollTo(0, guardadoY);
  }
  function irAFiltro(k, v) {                       // un chip de la ficha lleva a la vista categorías con ese filtro
    EJES.forEach(function (e) { filtros[e.k] = []; });
    filtros[k] = [v]; abierta = k; salirFicha(); irA('categorias');
  }
  $('f-volver').addEventListener('click', volver);

  /* ---------- lupa sobre la foto de la ficha ---------- */
  (function () {
    var caja = $('f-imgbox'), img = $('f-img'), tactil = false;
    function origen(e) {
      var r = img.getBoundingClientRect();                       // la imagen crece desde el punto donde está el cursor
      var px = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), py = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      img.style.transformOrigin = (px * 100) + '% ' + (py * 100) + '%';
    }
    caja.addEventListener('pointerenter', function (e) { if (e.pointerType !== 'mouse') return; origen(e); caja.classList.add('zoom'); setTimeout(function () { caja.classList.add('sigue'); }, 320); });
    caja.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' && caja.classList.contains('zoom')) origen(e); });
    caja.addEventListener('pointerleave', function (e) { if (e.pointerType !== 'mouse') return; caja.classList.remove('zoom', 'sigue'); });
    caja.addEventListener('pointerdown', function (e) { tactil = e.pointerType !== 'mouse'; });
    caja.addEventListener('click', function (e) {                // en pantallas táctiles: un toque acerca, otro aleja (y mover el dedo recorre la foto)
      if (!tactil) return;
      if (caja.classList.toggle('zoom')) { caja.classList.add('sigue'); origen(e); } else caja.classList.remove('sigue');
    });
    caja.addEventListener('pointermove', function (e) { if (tactil && e.pointerType !== 'mouse' && caja.classList.contains('zoom')) origen(e); });
  })();

  document.addEventListener('keydown', function (e) {
    if (aviso.classList.contains('abierto')) return;
    if (enFicha) { if (e.key === 'Escape') volver(); return; }
    if (modo !== 'explorar') return;
    var paso = 160, ok = true;
    if (e.key === 'ArrowLeft') px -= paso; else if (e.key === 'ArrowRight') px += paso;
    else if (e.key === 'ArrowUp') py -= paso; else if (e.key === 'ArrowDown') py += paso; else ok = false;
    if (ok) { e.preventDefault(); aplicar(); }
  });
  /* ---------- invitación a aportar ---------- */
  var aviso = $('aviso-aportar'), btnAportar = $('b-aportar');
  function abrirAviso() { aviso.hidden = false; aviso.classList.add('abierto'); $('a-ir').focus(); }
  function cerrarAviso() { aviso.classList.remove('abierto'); aviso.hidden = true; btnAportar.focus(); }
  btnAportar.addEventListener('click', abrirAviso);
  $('a-cerrar').addEventListener('click', cerrarAviso);
  aviso.addEventListener('click', function (e) { if (e.target === aviso) cerrarAviso(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && aviso.classList.contains('abierto')) cerrarAviso(); });

  var espera = false;
  window.addEventListener('resize', function () {
    if (espera) return; espera = true;
    requestAnimationFrame(function () { espera = false; calcularEscala(); aplicar(); if (modo === 'categorias') actualizar(); });
  });

  /* ---------- inicio ---------- */
  centrar();
  var partes = location.hash.replace('#', '').split('/');
  irA(partes[0] === 'categorias' ? 'categorias' : 'explorar');
  if (partes[1]) { var c = partes[1].toUpperCase(); if (porCodigo[c]) abrir(c); }
})();
