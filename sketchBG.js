const topoBackground = (p) => {
  let W, H;
  let seed;

  // Topographic Configuration Variables
  const levels = 13;
  const scaleVal = 2.0;
  const octaves = 2;

  p.setup = () => {
    // Set parameters to the exact size of the browser viewport
    W = p.windowWidth;
    H = p.windowHeight;

    let cnv = p.createCanvas(W, H);
    cnv.addClass("bg-topo-canvas"); // Applies the explicit fixed positioning layout

    p.noLoop();

    seed = Math.random() * 10000;
    p.noiseSeed(seed);
  };

  p.draw = () => {
    // UPDATED: New background color
    p.background("#2d4b48");

    // 1. Generate Terrain Field
    const cols = 200,
      rows = 115;
    const field = new Float32Array(cols * rows);
    let mn = Infinity,
      mx = -Infinity;

    p.noiseDetail(octaves, 0.5);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const nx = (col / cols) * 5 * scaleVal;
        const ny = (row / rows) * 5 * scaleVal;
        const v = p.noise(nx, ny);
        field[row * cols + col] = v;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    }

    // Normalize
    for (let i = 0; i < field.length; i++) {
      field[i] = (field[i] - mn) / (mx - mn);
    }

    // 2. Render Settings
    // UPDATED: New line color with a splash of alpha transparency (66) for smoothness
    // Use "#7bb497" directly if you want them completely solid!
    p.stroke("#7bb49766");
    p.strokeWeight(1.2);
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
    p.noFill();

    // 3. Process Levels & Render Contour Chains
    for (let lv = 1; lv < levels; lv++) {
      const thresh = lv / levels;

      const segs = marchingSquares(field, cols, rows, thresh);
      const chains = chainSegments(segs);

      for (const chain of chains) {
        if (chain.length < 2) continue;

        p.beginShape();
        p.curveVertex(chain[0][0], chain[0][1]);
        for (let i = 0; i < chain.length; i++) {
          p.curveVertex(chain[i][0], chain[i][1]);
        }
        p.curveVertex(chain[chain.length - 1][0], chain[chain.length - 1][1]);
        p.endShape();
      }
    }
  };

  p.windowResized = () => {
    W = p.windowWidth;
    H = p.windowHeight;
    p.resizeCanvas(W, H);
    p.redraw(); // Forces p5 to recalculate marching squares for the new viewport shape
  };

  // --- Marching Squares Engine Core ---
  function interp(v1, v2, thresh) {
    if (Math.abs(v2 - v1) < 1e-9) return 0.5;
    return (thresh - v1) / (v2 - v1);
  }

  function marchingSquares(field, cols, rows, thresh) {
    const segs = [];
    for (let row = 0; row < rows - 1; row++) {
      for (let col = 0; col < cols - 1; col++) {
        const tl = field[row * cols + col],
          tr = field[row * cols + col + 1];
        const br = field[(row + 1) * cols + col + 1],
          bl = field[(row + 1) * cols + col];
        const idx =
          (tl > thresh ? 8 : 0) |
          (tr > thresh ? 4 : 0) |
          (br > thresh ? 2 : 0) |
          (bl > thresh ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const t = interp(tl, tr, thresh),
          r = interp(tr, br, thresh),
          b = interp(br, bl, thresh),
          l = interp(tl, bl, thresh);
        const pt = (cx, cy) => [
          ((col + cx) / (cols - 1)) * W,
          ((row + cy) / (rows - 1)) * H,
        ];
        const top = pt(t, 0),
          right = pt(1, r),
          bot = pt(1 - b, 1),
          left = pt(0, l);
        const pushSeg = (a, b) => segs.push([a, b]);
        switch (idx) {
          case 1:
            pushSeg(left, bot);
            break;
          case 2:
            pushSeg(bot, right);
            break;
          case 3:
            pushSeg(left, right);
            break;
          case 4:
            pushSeg(top, right);
            break;
          case 5:
            pushSeg(left, top);
            pushSeg(bot, right);
            break;
          case 6:
            pushSeg(top, bot);
            break;
          case 7:
            pushSeg(left, top);
            break;
          case 8:
            pushSeg(left, top);
            break;
          case 9:
            pushSeg(top, bot);
            break;
          case 10:
            pushSeg(top, right);
            pushSeg(left, bot);
            break;
          case 11:
            pushSeg(top, right);
            break;
          case 12:
            pushSeg(left, right);
            break;
          case 13:
            pushSeg(bot, right);
            break;
          case 14:
            pushSeg(left, bot);
            break;
        }
      }
    }
    return segs;
  }

  function chainSegments(segs) {
    const EPS = 1.5;
    const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    const used = new Uint8Array(segs.length);
    const chains = [];
    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = 1;
      let chain = [segs[i][0], segs[i][1]];
      let extended = true;
      while (extended) {
        extended = false;
        const head = chain[0],
          tail = chain[chain.length - 1];
        for (let j = 0; j < segs.length; j++) {
          if (used[j]) continue;
          const [a, b] = segs[j];
          if (dist2(tail, a) < EPS * EPS) {
            chain.push(b);
            used[j] = 1;
            extended = true;
            break;
          }
          if (dist2(tail, b) < EPS * EPS) {
            chain.push(a);
            used[j] = 1;
            extended = true;
            break;
          }
          if (dist2(head, a) < EPS * EPS) {
            chain.unshift(b);
            used[j] = 1;
            extended = true;
            break;
          }
          if (dist2(head, b) < EPS * EPS) {
            chain.unshift(a);
            used[j] = 1;
            extended = true;
            break;
          }
        }
      }
      if (chain.length > 1) chains.push(chain);
    }
    return chains;
  }
};

new window.p5(topoBackground);
