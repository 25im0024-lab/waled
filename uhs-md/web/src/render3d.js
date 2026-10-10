/* UHS Pore Lab - minimal WebGL2 sphere renderer (no dependencies).
 * Draws atoms as shaded sphere impostors (point sprites with correct depth),
 * plus box edges. Orbit camera: drag to rotate, wheel / pinch to zoom,
 * double-click to reset. */
(function (root) {
  'use strict';

  const VS = `#version 300 es
  in vec3 aPos; in float aRad; in vec3 aCol;
  uniform mat4 uView, uProj; uniform float uScale;
  out vec3 vCol; out vec3 vC; out float vR;
  void main() {
    vec4 pv = uView * vec4(aPos, 1.0);
    gl_Position = uProj * pv;
    gl_PointSize = max(2.0, 2.0 * aRad * uScale / -pv.z);
    vCol = aCol; vC = pv.xyz; vR = aRad;
  }`;
  const FS = `#version 300 es
  precision highp float;
  in vec3 vCol; in vec3 vC; in float vR;
  uniform mat4 uProj;
  out vec4 o;
  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot(p, p);
    if (r2 > 1.0) discard;
    vec3 nrm = vec3(p.x, -p.y, sqrt(1.0 - r2));
    vec3 L = normalize(vec3(0.4, 0.6, 1.0));
    float dif = max(dot(nrm, L), 0.0);
    float spec = pow(max(dot(reflect(-L, nrm), vec3(0.0, 0.0, 1.0)), 0.0), 24.0);
    vec3 c = vCol * (0.28 + 0.78 * dif) + vec3(0.35) * spec;
    o = vec4(c, 1.0);
    vec4 cp = uProj * vec4(vC + vec3(0.0, 0.0, nrm.z * vR), 1.0);
    gl_FragDepth = 0.5 * cp.z / cp.w + 0.5;
  }`;
  const LVS = `#version 300 es
  in vec3 aPos; uniform mat4 uView, uProj;
  void main() { gl_Position = uProj * uView * vec4(aPos, 1.0); }`;
  const LFS = `#version 300 es
  precision mediump float; uniform vec4 uCol; out vec4 o;
  void main() { o = uCol; }`;

  function compile(gl, vs, fs) {
    const p = gl.createProgram();
    for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
      const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      gl.attachShader(p, s);
    }
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  // column-major 4x4 helpers
  function perspective(fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
    return new Float32Array([f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0]);
  }
  function lookAt(e, c, up) {
    let zx = e[0] - c[0], zy = e[1] - c[1], zz = e[2] - c[2];
    let l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    let xx = up[1] * zz - up[2] * zy, xy = up[2] * zx - up[0] * zz, xz = up[0] * zy - up[1] * zx;
    l = Math.hypot(xx, xy, xz); xx /= l; xy /= l; xz /= l;
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * e[0] + xy * e[1] + xz * e[2]), -(yx * e[0] + yy * e[1] + yz * e[2]), -(zx * e[0] + zy * e[1] + zz * e[2]), 1]);
  }

  function hexRGB(h) {
    const v = parseInt(h.slice(1), 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }

  function createRenderer(canvas) {
    const gl = canvas.getContext('webgl2', { antialias: true });
    if (!gl) return null;
    const prog = compile(gl, VS, FS), lprog = compile(gl, LVS, LFS);
    const loc = {
      aPos: gl.getAttribLocation(prog, 'aPos'), aRad: gl.getAttribLocation(prog, 'aRad'), aCol: gl.getAttribLocation(prog, 'aCol'),
      uView: gl.getUniformLocation(prog, 'uView'), uProj: gl.getUniformLocation(prog, 'uProj'), uScale: gl.getUniformLocation(prog, 'uScale'),
      lPos: gl.getAttribLocation(lprog, 'aPos'), lView: gl.getUniformLocation(lprog, 'uView'), lProj: gl.getUniformLocation(lprog, 'uProj'),
      lCol: gl.getUniformLocation(lprog, 'uCol'),
    };
    const bPos = gl.createBuffer(), bRad = gl.createBuffer(), bCol = gl.createBuffer(), bLine = gl.createBuffer();
    const vao = gl.createVertexArray(), lvao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    for (const [b, l, k] of [[bPos, loc.aPos, 3], [bRad, loc.aRad, 1], [bCol, loc.aCol, 3]]) {
      gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, k, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(lvao);
    gl.bindBuffer(gl.ARRAY_BUFFER, bLine); gl.enableVertexAttribArray(loc.lPos); gl.vertexAttribPointer(loc.lPos, 3, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);

    let count = 0, lineCount = 0;
    const box = { cx: 0, cy: 0, cz: 0, size: 50 };
    const cam = { theta: -0.75, phi: 1.2, dist: 1, tdist: 1 };

    function setBox(Lx, Ly, Lz, z0) {
      z0 = z0 || 0;
      box.cx = Lx / 2; box.cy = Ly / 2; box.cz = z0 + Lz / 2; box.size = Math.hypot(Lx, Ly, Lz);
      const p = [[0, 0, z0], [Lx, 0, z0], [Lx, Ly, z0], [0, Ly, z0], [0, 0, z0 + Lz], [Lx, 0, z0 + Lz], [Lx, Ly, z0 + Lz], [0, Ly, z0 + Lz]];
      const e = [0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7];
      const a = new Float32Array(e.length * 3);
      e.forEach((k, i) => a.set(p[k], 3 * i));
      gl.bindBuffer(gl.ARRAY_BUFFER, bLine); gl.bufferData(gl.ARRAY_BUFFER, a, gl.STATIC_DRAW);
      lineCount = e.length;
      cam.dist = cam.tdist = 1.5 * box.size;
    }
    function setAtoms(pos, rad, col, n) {
      count = n;
      gl.bindBuffer(gl.ARRAY_BUFFER, bPos); gl.bufferData(gl.ARRAY_BUFFER, pos.subarray(0, 3 * n), gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, bRad); gl.bufferData(gl.ARRAY_BUFFER, rad.subarray(0, n), gl.DYNAMIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, bCol); gl.bufferData(gl.ARRAY_BUFFER, col.subarray(0, 3 * n), gl.DYNAMIC_DRAW);
    }
    function draw() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl.viewport(0, 0, w, h);
      gl.clearColor(0.024, 0.07, 0.14, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      const fov = 0.75, proj = perspective(fov, w / h, 1, 20 * box.size);
      const sp = Math.sin(cam.phi), e = [box.cx + cam.dist * sp * Math.cos(cam.theta), box.cy + cam.dist * sp * Math.sin(cam.theta), box.cz + cam.dist * Math.cos(cam.phi)];
      const view = lookAt(e, [box.cx, box.cy, box.cz], [0, 0, 1]);
      if (count) {
        gl.useProgram(prog); gl.bindVertexArray(vao);
        gl.uniformMatrix4fv(loc.uView, false, view); gl.uniformMatrix4fv(loc.uProj, false, proj);
        gl.uniform1f(loc.uScale, h / (2 * Math.tan(fov / 2)));
        gl.drawArrays(gl.POINTS, 0, count);
      }
      if (lineCount) {
        gl.useProgram(lprog); gl.bindVertexArray(lvao);
        gl.uniformMatrix4fv(loc.lView, false, view); gl.uniformMatrix4fv(loc.lProj, false, proj);
        gl.uniform4f(loc.lCol, 0.35, 0.6, 0.85, 1);
        gl.drawArrays(gl.LINES, 0, lineCount);
      }
      gl.bindVertexArray(null);
    }

    // orbit controls
    const pts = new Map();
    let pinch0 = 0;
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    canvas.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) {
        cam.theta -= (e.clientX - prev[0]) * 0.008;
        cam.phi = Math.min(3.1, Math.max(0.05, cam.phi - (e.clientY - prev[1]) * 0.008));
      } else if (pts.size === 2) {
        const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (pinch0) cam.dist = Math.min(4 * box.size, Math.max(0.3 * box.size, cam.dist * pinch0 / d));
        pinch0 = d;
      }
    });
    const up = e => { pts.delete(e.pointerId); pinch0 = 0; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.min(4 * box.size, Math.max(0.3 * box.size, cam.dist * Math.exp(e.deltaY * 0.001))); }, { passive: false });
    canvas.addEventListener('dblclick', () => { cam.theta = -0.75; cam.phi = 1.2; cam.dist = 1.5 * box.size; });

    return { setBox, setAtoms, draw, hexRGB, cam,
      reset() { cam.theta = -0.75; cam.phi = 1.2; cam.dist = 1.5 * box.size; },
      view(name) {
        if (name === 'side') { cam.theta = -Math.PI / 2; cam.phi = Math.PI / 2; }
        else if (name === 'top') { cam.theta = -Math.PI / 2; cam.phi = 0.05; }
        else { cam.theta = -0.75; cam.phi = 1.2; }
      } };
  }

  root.UHSRender = { createRenderer, hexRGB };
})(typeof window !== 'undefined' ? window : this);
