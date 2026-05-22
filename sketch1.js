const sketch1 = (p) => {
  let W, H;
  let isVertical = false;
  let seed;

  // Topographic Configuration Variables
  const levels = 10;
  const scaleVal = 1.0;
  const octaves = 2;
  let mapCache;

  let instructionText = "Tap on the mountain to plant";
  let textAlpha = 255;
  let isFading = false;

  let trees = [];
  let leaves = [];
  let oxygenParticles = [];
  let animals = [];

  //This is the rain variable
  let rainLines = [];
  let maxRain = 60;
  let isRaining = false;
  let wasRaining = false;

  // Reset Star/Cursor Variables
  let glowLevel = 0;
  let glowTarget = 0;
  let pulseBoost = 0;
  let starScale = 1.0;

  // Audio Configuration Variables
  let currentOxygenVol = 0.3;
  let birdchirping,
    rustlingleaves,
    SoilSound,
    OxygenSound,
    SparklingSound,
    TakeinSound;
  let WindSound, LeafSnapSound, LeafFallSound, WaterLeavesSound, LeafRubSound;

  // Audio Fade Management Flags
  let activeFadeSound = null;
  let currentFadeVol = 1.0;
  let hasTriggeredOverlap = false;

  let activePlantX = 0;
  let activePlantY = 0;
  let activePlantRadius = 35;

  // Fullscreen button — shared constants used by draw and mousePressed
  const FS_BTN_SIZE = 56;
  const FS_BTN_PAD = 20;
  let canvasFullscreen = false;

  function fsBtnX() {
    return W - FS_BTN_PAD - FS_BTN_SIZE;
  }
  function fsBtnY() {
    return FS_BTN_PAD;
  }
  function mouseOverFsBtn() {
    return (
      p.mouseX >= fsBtnX() &&
      p.mouseX <= fsBtnX() + FS_BTN_SIZE &&
      p.mouseY >= fsBtnY() &&
      p.mouseY <= fsBtnY() + FS_BTN_SIZE
    );
  }

  // Expands/shrinks the canvas via CSS so it fills the viewport without touching W/H internals.
  // p5 remaps mouseX/mouseY via the canvas bounding rect so all hit-detection stays accurate.
  function toggleCanvasFullscreen() {
    canvasFullscreen = !canvasFullscreen;
    const cnv = p.canvas;
    if (canvasFullscreen) {
      cnv.style.position = "fixed";
      cnv.style.top = "0";
      cnv.style.left = "0";
      cnv.style.width = "100vw";
      cnv.style.height = "100vh";
      cnv.style.zIndex = "9999";
    } else {
      cnv.style.position = "";
      cnv.style.top = "";
      cnv.style.left = "";
      cnv.style.width = "";
      cnv.style.height = "";
      cnv.style.zIndex = "";
    }
  }

  // Dynamic Responsive Dimension Engine
  function updateCanvasDimensions() {
    let wasVertical = isVertical;
    isVertical = window.innerWidth <= 768;

    if (isVertical) {
      W = 1080;
      H = 1920;
    } else {
      W = 1920;
      H = 1080;
    }
    return wasVertical !== isVertical;
  }

  p.preload = () => {
    p.soundFormats("mp3", "wav");

    birdchirping = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-birdChirping.wav",
    );
    rustlingleaves = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-rustlingLeaves.wav",
    );
    SoilSound = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-soil.wav",
    );
    OxygenSound = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-oxygenSound.wav",
    );
    SparklingSound = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-sparklingSound.wav",
    );
    TakeinSound = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-takeInSound.wav",
    );
    WindSound = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-wind.wav",
    );
    LeafSnapSound = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-leavesSnap.wav",
    );
    LeafFallSound = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-dryLeavesFall.wav",
    );
    WaterLeavesSound = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-waterOnLeaves.wav",
    );
    LeafRubSound = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-twoLeavesRubTogther.wav",
    );
  };

  p.setup = () => {
    updateCanvasDimensions();
    let cnv = p.createCanvas(W, H);
    cnv.parent("sketch1");
    p.noCursor();

    seed = Math.random() * 10000;
    p.noiseSeed(seed);

    buildMapCache();

    if (SoilSound) SoilSound.onended(() => triggerWindSequence());
    if (WindSound) {
      WindSound.onended(() => {
        if (!hasTriggeredOverlap) triggerRustlingSequence();
      });
    }
    if (rustlingleaves) {
      rustlingleaves.onended(() => {
        let id = trees.length > 0 ? trees[trees.length - 1].id : null;
        triggerSnapAndFallSequence(id);
      });
    }

    if (LeafSnapSound) {
      LeafSnapSound.onended(() => {
        if (LeafFallSound && !LeafFallSound.isPlaying()) LeafFallSound.loop();
        let id = trees.length > 0 ? trees[trees.length - 1].id : null;
        let leafCount = p.floor(p.random(15, 25));
        for (let i = 0; i < leafCount; i++) {
          let angle = p.random(p.TWO_PI);
          let spawnDist = p.random(activePlantRadius * 0.8);
          leaves.push({
            parentId: id,
            x: activePlantX + p.cos(angle) * spawnDist,
            y: activePlantY + p.sin(angle) * spawnDist,
            sizeW: p.random(8, 14),
            sizeH: p.random(5, 9),
            speedY: p.random(1.5, 3.0),
            swaySpeed: p.random(0.02, 0.05),
            swayRange: p.random(10, 25),
            angleOffset: p.random(p.TWO_PI),
            alpha: 255,
            fadeSpeed: p.random(0.8, 2.0),
            colorR: p.random([76, 244, 139]),
            colorG: p.random([175, 208, 195]),
            colorB: p.random([80, 63, 74]),
          });
        }
      });
    }

    rainLines = [];
    for (let i = 0; i < maxRain; i++) {
      rainLines.push({
        x: p.random(W),
        y: p.random(-H, 0),
        length: p.random(15, 35),
        speed: p.random(12, 22),
        maxOpacity: p.random(10, 45),
        opacity: 0,
      });
    }
  };

  p.windowResized = () => {
    let layoutChanged = updateCanvasDimensions();
    if (layoutChanged) {
      p.resizeCanvas(W, H);
      buildMapCache();
    }
  };

  function buildMapCache() {
    mapCache = p.createGraphics(W, H);
    mapCache.background("#e9e7e1");
    mapCache.stroke("rgba(50,48,44,0.65)");
    mapCache.strokeWeight(1.5);
    mapCache.strokeCap(p.ROUND);
    mapCache.strokeJoin(p.ROUND);
    mapCache.noFill();

    const cols = 200,
      rows = 115;
    const field = new Float32Array(cols * rows);
    let mn = Infinity,
      mx = -Infinity;
    p.noiseDetail(octaves, 0.5);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const v = p.noise(
          (col / cols) * 5 * scaleVal,
          (row / rows) * 5 * scaleVal,
        );
        field[row * cols + col] = v;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
    }

    for (let i = 0; i < field.length; i++) {
      field[i] = (field[i] - mn) / (mx - mn);
    }

    for (let lv = 1; lv < levels; lv++) {
      const thresh = lv / levels;
      const segs = marchingSquares(field, cols, rows, thresh);
      const chains = chainSegments(segs);
      for (const chain of chains) {
        if (chain.length < 2) continue;
        mapCache.beginShape();
        mapCache.curveVertex(chain[0][0], chain[0][1]);
        for (let i = 0; i < chain.length; i++) {
          mapCache.curveVertex(chain[i][0], chain[i][1]);
        }
        mapCache.curveVertex(
          chain[chain.length - 1][0],
          chain[chain.length - 1][1],
        );
        mapCache.endShape();
      }
    }
  }

  p.draw = () => {
    let targetGlobalVolume =
      window.audioVolume !== undefined ? window.audioVolume : 1.0;
    let systemMuted =
      window.audioMuted !== undefined ? window.audioMuted : false;
    p.outputVolume(systemMuted ? 0.0 : targetGlobalVolume);

    p.background(255);
    p.image(mapCache, 0, 0);

    if (oxygenParticles.length > 0 && animals.length === 0) {
      isRaining = true;
      if (WaterLeavesSound && !WaterLeavesSound.isPlaying()) {
        WaterLeavesSound.loop();
        WaterLeavesSound.setVolume(0.25);
      }
    } else {
      isRaining = false;
      if (WaterLeavesSound && WaterLeavesSound.isPlaying()) {
        WaterLeavesSound.stop();
        if (wasRaining === true && LeafRubSound) {
          LeafRubSound.play();
        }
      }
    }
    wasRaining = isRaining;

    drawBackgroundRain();

    if (activeFadeSound && activeFadeSound.isPlaying()) {
      let curTime = activeFadeSound.currentTime();
      let dur = activeFadeSound.duration();
      if (dur > 1.5 && curTime > dur - 1.5) {
        if (activeFadeSound === WindSound && !hasTriggeredOverlap) {
          hasTriggeredOverlap = true;
          triggerRustlingSequence();
        }
        currentFadeVol = p.lerp(currentFadeVol, 0.0, 0.08);
        activeFadeSound.setVolume(currentFadeVol);
      }
    }

    for (let t of trees) {
      drawCustomTree(t);
      if (t.oxygenReady && Math.random() > 0.94) {
        let burstCount = p.floor(p.random(3, 8));
        for (let b = 0; b < burstCount; b++) {
          oxygenParticles.push({
            x: t.x + p.random(-12, 12),
            y: t.y + p.random(-5, 5),
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * -3 - 1.5,
            life: 255,
            fadeSpeed: p.random(1, 2.5),
            sizeFactor: Math.random() * 0.9 + 0.6,
          });
        }
        if (OxygenSound && !OxygenSound.isPlaying()) OxygenSound.play();
      }
    }

    if (birdchirping && birdchirping.isPlaying()) {
      if (SparklingSound && SparklingSound.isPlaying()) SparklingSound.stop();
      currentOxygenVol = p.lerp(currentOxygenVol, 0.01, 0.1);
      birdchirping.setVolume(0.3);
    } else {
      currentOxygenVol = p.lerp(currentOxygenVol, 0.3, 0.04);
    }

    if (OxygenSound) OxygenSound.setVolume(currentOxygenVol);

    updateAndDrawLeaves();
    updateAndDrawOxygen(p.mouseX, p.mouseY);
    updateAnimals();

    if (textAlpha > 0) drawInstructions();
    drawStarCursor(p.mouseX, p.mouseY);

    // Fullscreen button — drawn last so it always sits on top of everything
    drawFullscreenBtn();
  };

  // Draws the fullscreen toggle button in the top-right corner of the canvas
  function drawFullscreenBtn() {
    const x = fsBtnX();
    const y = fsBtnY();
    const s = FS_BTN_SIZE;
    const hovered = mouseOverFsBtn();

    p.push();

    // Background rounded square
    p.noStroke();
    p.fill(50, 48, 44, hovered ? 210 : 140);
    p.rect(x, y, s, s, 10);

    // Icon: corner bracket arrows indicating expand / collapse
    p.stroke(233, 231, 225);
    p.strokeWeight(3);
    p.noFill();
    p.strokeCap(p.SQUARE);

    const m = s * 0.22; // margin from edge of button
    const a = s * 0.22; // arm length of each corner bracket

    if (!canvasFullscreen) {
      // Expand icon — four outward-facing corner brackets
      // Top-left
      p.line(x + m, y + m + a, x + m, y + m);
      p.line(x + m, y + m, x + m + a, y + m);
      // Top-right
      p.line(x + s - m, y + m + a, x + s - m, y + m);
      p.line(x + s - m, y + m, x + s - m - a, y + m);
      // Bottom-left
      p.line(x + m, y + s - m - a, x + m, y + s - m);
      p.line(x + m, y + s - m, x + m + a, y + s - m);
      // Bottom-right
      p.line(x + s - m, y + s - m - a, x + s - m, y + s - m);
      p.line(x + s - m, y + s - m, x + s - m - a, y + s - m);
    } else {
      // Collapse icon — four inward-facing corner brackets
      const cx = x + s * 0.5;
      const cy = y + s * 0.5;
      // Top-left points toward center
      p.line(cx - m, cy - m, cx - m - a, cy - m);
      p.line(cx - m, cy - m, cx - m, cy - m - a);
      // Top-right points toward center
      p.line(cx + m, cy - m, cx + m + a, cy - m);
      p.line(cx + m, cy - m, cx + m, cy - m - a);
      // Bottom-left points toward center
      p.line(cx - m, cy + m, cx - m - a, cy + m);
      p.line(cx - m, cy + m, cx - m, cy + m + a);
      // Bottom-right points toward center
      p.line(cx + m, cy + m, cx + m + a, cy + m);
      p.line(cx + m, cy + m, cx + m, cy + m + a);
    }

    p.pop();
  }

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

  function drawBackgroundRain() {
    p.push();
    p.strokeWeight(1.2);
    for (let r of rainLines) {
      let targetAlpha = isRaining ? r.maxOpacity : 0;
      r.opacity = p.lerp(r.opacity, targetAlpha, 0.1);
      if (r.opacity > 0.5) {
        p.stroke(110, 140, 160, r.opacity);
        p.line(r.x, r.y, r.x, r.y + r.length);
      }
      r.y += r.speed;
      if (r.y > H) {
        r.y = p.random(-50, -10);
        r.x = p.random(W);
        r.speed = p.random(12, 22);
      }
    }
    p.pop();
  }

  function drawInstructions() {
    p.push();
    p.fill(35, 60, 45, textAlpha);
    p.noStroke();

    // Scale typography up on vertical high-res layouts to maintain visual balance
    p.textSize(isVertical ? 36 : 24);
    p.textFont("Courier New");
    p.textAlign(p.CENTER, p.CENTER);

    // Push tracking padding down on deep screens
    let bottomPadding = isVertical ? 100 : 60;
    p.text(instructionText, W / 2, H - bottomPadding);
    p.pop();

    if (isFading) {
      textAlpha -= 15;
      if (textAlpha < 0) textAlpha = 0;
    }
  }

  p.mousePressed = () => {
    // Fullscreen button takes priority — checked before any other interaction
    if (mouseOverFsBtn()) {
      toggleCanvasFullscreen();
      return;
    }

    if (
      p.mouseX < 0 ||
      p.mouseX > p.width ||
      p.mouseY < 0 ||
      p.mouseY > p.height
    )
      return;

    if (!isFading) isFading = true;
    activePlantX = p.mouseX;
    activePlantY = p.mouseY;
    activePlantRadius = p.random(35, 50);
    hasTriggeredOverlap = false;

    let uniqueTreeId = p.millis();
    trees.push({
      id: uniqueTreeId,
      x: activePlantX,
      y: activePlantY,
      radius: activePlantRadius,
      lobes: 8.0,
      spawnTime: p.millis(),
      oxygenReady: false,
    });

    if (SoilSound) {
      SoilSound.setVolume(0.2);
      SoilSound.play();
    }
  };

  function triggerWindSequence() {
    if (WindSound) {
      currentFadeVol = 0.5;
      WindSound.setVolume(0.5);
      WindSound.play();
      activeFadeSound = WindSound;
    } else {
      triggerRustlingSequence();
    }
  }

  function triggerRustlingSequence() {
    if (rustlingleaves) {
      currentFadeVol = 1.0;
      rustlingleaves.setVolume(1.0);
      rustlingleaves.play();
      if (activeFadeSound === WindSound || activeFadeSound === null) {
        activeFadeSound = rustlingleaves;
      }
    } else {
      let fallbackId = trees.length > 0 ? trees[trees.length - 1].id : null;
      triggerSnapAndFallSequence(fallbackId);
    }
  }

  function triggerSnapAndFallSequence(parentTreeId) {
    if (LeafSnapSound) LeafSnapSound.play();
  }

  function drawStarCursor(starX, starY) {
    p.push();
    p.translate(starX, starY);
    glowLevel = p.lerp(glowLevel, glowTarget, 0.05);
    pulseBoost *= 0.19;
    starScale = 1 + glowLevel * 0.8 + pulseBoost;
    if (glowLevel > 0.99) {
      if (TakeinSound && TakeinSound.isPlaying()) TakeinSound.stop();
      if (
        SparklingSound &&
        !SparklingSound.isPlaying() &&
        birdchirping &&
        !birdchirping.isPlaying()
      ) {
        SparklingSound.play();
      }
    }
    p.scale(starScale);
    p.noStroke();
    for (let i = 5; i > 0; i--) {
      let alpha = glowLevel * 180;
      p.fill(255, 220, 150, alpha / i);
      renderStarShape(0, 0, 20 + i * 6, 55 + i * 6, 8);
    }
    p.fill(p.lerpColor(p.color("#300000"), p.color("#ffffff"), glowLevel));
    renderStarShape(0, 0, 20, 55, 8);
    p.fill(0);
    renderStarShape(0, 0, 12, 38, 8);
    p.pop();
  }

  function renderStarShape(x, y, innerR, outerR, numPoints) {
    let angleStep = p.TWO_PI / (numPoints * 2);
    let startAngle = -p.HALF_PI;
    p.beginShape();
    for (let i = 0; i < numPoints * 2; i++) {
      let angle = startAngle + i * angleStep;
      let r = i % 2 === 0 ? outerR : innerR;
      p.vertex(x + p.cos(angle) * r, y + p.sin(angle) * r);
    }
    p.endShape(p.CLOSE);
  }

  function drawCustomTree(t) {
    p.push();
    p.noStroke();
    p.fill(76, 175, 80);
    generateScallopShape(t.x, t.y, t.radius, t.lobes);
    p.pop();
  }

  function generateScallopShape(xc, yc, radius, numLobes) {
    p.beginShape();
    let angleStep = p.TWO_PI / numLobes;
    for (let i = 0; i < numLobes; i++) {
      let baseAngle = i * angleStep;
      let nextAngle = (i + 1) * angleStep;
      let xStart = xc + p.cos(baseAngle) * (radius * 0.75);
      let yStart = yc + p.sin(baseAngle) * (radius * 0.75);
      let xEnd = xc + p.cos(nextAngle) * (radius * 0.75);
      let yEnd = yc + p.sin(nextAngle) * (radius * 0.75);
      let midAngle = baseAngle + angleStep / 2;
      let xControl = xc + p.cos(midAngle) * (radius * 1.35);
      let yControl = yc + p.sin(midAngle) * (radius * 1.35);
      if (i === 0) p.vertex(xStart, yStart);
      p.quadraticVertex(xControl, yControl, xEnd, yEnd);
    }
    p.endShape(p.CLOSE);
  }

  function updateAndDrawLeaves() {
    for (let i = leaves.length - 1; i >= 0; i--) {
      let l = leaves[i];
      l.y += l.speedY;
      let currentSway =
        p.sin(p.frameCount * l.swaySpeed + l.angleOffset) * l.swayRange * 0.1;
      l.x += currentSway;
      l.alpha -= l.fadeSpeed;
      if (l.alpha < 130 && l.parentId !== null) {
        for (let t of trees) {
          if (t.id === l.parentId) t.oxygenReady = true;
        }
      }
      if (l.alpha <= 0 || l.y > H) {
        leaves.splice(i, 1);
        if (leaves.length === 0 && LeafFallSound && LeafFallSound.isPlaying()) {
          LeafFallSound.stop();
        }
        continue;
      }
      p.push();
      p.translate(l.x, l.y);
      p.rotate(currentSway * 0.5);
      p.noStroke();
      p.fill(l.colorR, l.colorG, l.colorB, l.alpha);
      p.ellipse(0, 0, l.sizeW, l.sizeH);
      p.pop();
    }
  }

  function updateAndDrawOxygen(starX, starY) {
    for (let i = oxygenParticles.length - 1; i >= 0; i--) {
      let o = oxygenParticles[i];
      o.x += o.vx;
      o.y += o.vy;
      let d = p.dist(o.x, o.y, starX, starY);
      if (d < 66 * starScale) {
        glowTarget = p.constrain(glowTarget + 0.015, 0, 1);
        pulseBoost = 0.33;
        if (glowLevel < 0.9) {
          if (TakeinSound && !TakeinSound.isPlaying()) TakeinSound.play();
        } else {
          if (TakeinSound && TakeinSound.isPlaying()) TakeinSound.stop();
        }
        oxygenParticles.splice(i, 1);
        continue;
      }
      o.life -= o.fadeSpeed;
      if (o.life <= 0 || o.y < -50) {
        oxygenParticles.splice(i, 1);
        continue;
      }
      drawOxygen(o);
    }
  }

  function drawOxygen(o) {
    p.noStroke();
    let baseSize = 8;
    for (let i = 3; i > 0; i--) {
      p.fill(180, 220, 255, (o.life / 255) * 50);
      p.ellipse(o.x, o.y, (baseSize + i * 6) * o.sizeFactor);
    }
    p.fill(220, 245, 255, o.life);
    p.ellipse(o.x, o.y, baseSize * o.sizeFactor);
  }

  function updateAnimals() {
    if (
      Math.random() > 0.985 &&
      glowLevel > 0.2 &&
      leaves.length === 0 &&
      trees.length > 0
    ) {
      animals.push({
        x: -50,
        y: Math.random() * H * 0.4,
        vx: Math.random() * 1.5 + 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        offset: Math.random() * 1000,
        size: Math.random() * 8 + 7,
        lifespan: 1200,
      });
      if (Math.random() > 0.8 && birdchirping && !birdchirping.isPlaying()) {
        if (SparklingSound && SparklingSound.isPlaying()) SparklingSound.stop();
        birdchirping.play();
      }
    }
    for (let i = animals.length - 1; i >= 0; i--) {
      let a = animals[i];
      a.x += a.vx;
      a.y += a.vy + Math.sin(p.frameCount * 0.04 + a.offset) * 0.5;
      a.lifespan--;
      let alpha = p.map(glowLevel, 0.2, 1, 0, 255) * (a.lifespan / 1200);
      drawAnimal(a.x, a.y, a.size, alpha);
      if (a.lifespan <= 0 || a.x > W + 100) animals.splice(i, 1);
    }
  }

  function drawAnimal(x, y, size, alpha) {
    p.push();
    p.translate(x, y);
    p.stroke(0, 0, 0, alpha);
    p.strokeWeight(1.5);
    p.noFill();
    let flapSpeed = 0.6;
    let wing = Math.sin(p.frameCount * flapSpeed + x) * size * 0.9;
    p.beginShape();
    p.vertex(-size, 0);
    p.vertex(0, -size / 4 + wing);
    p.vertex(size, 0);
    p.endShape();
    p.pop();
  }
};

new window.p5(sketch1, "sketch1");
