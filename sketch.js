const destructionSketch = (p) => {
  // --- Global Variables ---
  let W, H;
  let isVertical = false;
  let seed;

  const levels = 10; // These control the terrain detail, I put them here for easy tweaking
  const scaleVal = 1.0;
  const octaves = 2;

  let stars = [];
  let trees = [];
  let terrainChains = [];

  let clickedTreeIds = new Set();
  let massFadeTriggered = false;

  let allTreesFaded = false;
  let pauseTimer = 0;
  let starsFalling = false;

  let soundSpawn;
  let soundWood;
  let soundWind;
  let soundRustle;
  let soundBird;
  let soundFall;
  let soundFade;

  let leafSounds = [];
  let nextLeafRustleTime = 0;
  let nextWindTime = 0;
  let nextRustleTime = 0;
  let nextBirdTime = 0;

  // Fullscreen button dimensions — defined once so draw and mousePressed share the same values
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

  function updateCanvasDimensions() {
    // Responsive layout adjustment, because it is easy to just have the canvas flip dimensions on a smaller screen instead of trying to scale everything
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
    soundSpawn = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-spawn.wav",
    );
    soundWood = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-wood.wav",
    );
    soundWind = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-wind.wav",
    );
    soundRustle = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-rustlingLeaves.wav",
    );
    soundBird = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-birdChirping.wav",
    );
    soundFall = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-fall.wav",
    );
    soundFade = p.loadSound(
      "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-fade.wav",
    );

    leafSounds.push(
      p.loadSound(
        "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-leafGenerative1.wav",
      ),
    );
    leafSounds.push(
      p.loadSound(
        "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-leafGenerative2.wav",
      ),
    );
    leafSounds.push(
      p.loadSound(
        "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-leafGenerative3.wav",
      ),
    );
    leafSounds.push(
      p.loadSound(
        "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-leafGenerative4.wav",
      ),
    );
    leafSounds.push(
      p.loadSound(
        "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-leafGenerative5.wav",
      ),
    );
    leafSounds.push(
      p.loadSound(
        "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-leafGenerative6.wav",
      ),
    );
    leafSounds.push(
      p.loadSound(
        "Sound/COMM2754-2026-S1-A3w12-StrawberrySweets-leafGenerative7.wav",
      ),
    );
  };

  p.setup = () => {
    updateCanvasDimensions();
    let cnv = p.createCanvas(W, H);
    cnv.parent("sketch");

    soundSpawn.setVolume(0.3);
    soundWood.setVolume(0.4);
    soundWind.setVolume(0.25);
    soundRustle.setVolume(0.2);
    soundBird.setVolume(0.3);
    soundFall.setVolume(0.4);
    soundFade.setVolume(0.45);

    soundSpawn.playMode("sustain");
    soundWood.playMode("sustain");
    soundWind.playMode("sustain");
    soundRustle.playMode("sustain");
    soundBird.playMode("sustain");
    soundFall.playMode("sustain");
    soundFade.playMode("sustain");

    initializeSimulation();
  };

  p.windowResized = () => {
    let layoutChanged = updateCanvasDimensions();
    if (layoutChanged) {
      p.resizeCanvas(W, H);
      initializeSimulation();
    }
  };

  function initializeSimulation() {
    seed = Math.random() * 10000;
    p.noiseSeed(seed);

    stars = [];
    trees = [];
    terrainChains = [];
    clickedTreeIds.clear();
    massFadeTriggered = false;
    allTreesFaded = false;
    pauseTimer = 0;
    starsFalling = false;

    nextLeafRustleTime = p.millis() + p.random(1000, 3000);
    nextWindTime = p.millis() + p.random(3000, 7000);
    nextRustleTime = p.millis() + p.random(2000, 5000);
    nextBirdTime = p.millis() + p.random(1500, 4000);

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

    for (let i = 0; i < field.length; i++)
      field[i] = (field[i] - mn) / (mx - mn);

    for (let lv = 1; lv < levels; lv++) {
      const thresh = lv / levels;
      const segs = marchingSquares(field, cols, rows, thresh);
      const chains = chainSegments(segs);
      for (const chain of chains) {
        if (chain.length >= 2) {
          terrainChains.push(chain);
        }
      }
    }

    const totalTrees = 150;
    for (let i = 0; i < totalTrees; i++) {
      trees.push({
        id: i,
        x: p.random(0, W),
        y: p.random(0, H),
        radius: p.random(15, 35),
        lobes: p.floor(p.random(5, 9)),
        opacity: 230,
        isFading: false,
        fadeDelay: 0,
        fadeSpeed: 2,
      });
    }
  }

  p.draw = () => {
    p.outputVolume(window.audioMuted ? 0.0 : window.audioVolume);
    p.background("#e9e7e1");

    if (!allTreesFaded) {
      if (p.millis() > nextLeafRustleTime) {
        let randomLeaf = p.random(leafSounds);
        if (randomLeaf && randomLeaf.isLoaded()) {
          randomLeaf.setVolume(p.random(0.05, 0.25));
          randomLeaf.pan(p.random(-0.8, 0.8));
          randomLeaf.play();
        }
        nextLeafRustleTime = p.millis() + p.random(200, 800);
      }

      if (p.millis() > nextWindTime) {
        if (soundWind && soundWind.isLoaded()) {
          soundWind.setVolume(p.random(0.15, 0.35));
          soundWind.pan(p.random(-0.4, 0.4));
          soundWind.play();
        }
        nextWindTime = p.millis() + p.random(8000, 20000);
      }

      if (p.millis() > nextRustleTime) {
        if (soundRustle && soundRustle.isLoaded()) {
          soundRustle.setVolume(p.random(0.1, 0.25));
          soundRustle.pan(p.random(-0.6, 0.6));
          soundRustle.play();
        }
        nextRustleTime = p.millis() + p.random(4000, 12000);
      }

      if (p.millis() > nextBirdTime) {
        if (soundBird && soundBird.isLoaded()) {
          soundBird.setVolume(p.random(0.15, 0.35));
          soundBird.pan(p.random(-0.7, 0.7));
          soundBird.play();
        }
        nextBirdTime = p.millis() + p.random(6000, 15000);
      }
    }

    p.stroke("rgba(50,48,44,0.65)");
    p.strokeWeight(1.5);
    p.strokeCap(p.ROUND);
    p.strokeJoin(p.ROUND);
    p.noFill(); // the terrain line style

    for (const chain of terrainChains) {
      // render terrain lines
      p.beginShape();
      p.curveVertex(chain[0][0], chain[0][1]);
      for (let i = 0; i < chain.length; i++) {
        p.curveVertex(chain[i][0], chain[i][1]);
      }
      p.curveVertex(chain[chain.length - 1][0], chain[chain.length - 1][1]);
      p.endShape();
    }

    let activeFadingTreesCount = 0; // tree fade logic
    for (let t of trees) {
      if (t.isFading) {
        if (t.fadeDelay > 0) {
          t.fadeDelay--;
          activeFadingTreesCount++;
        } else if (t.opacity > 10) {
          t.opacity -= t.fadeSpeed;
          if (t.opacity < 10) t.opacity = 10;
          activeFadingTreesCount++;
        }
      }
    }

    for (let t of trees) {
      // render trees
      drawCustomTree(t);
    }

    if (massFadeTriggered && activeFadingTreesCount === 0 && !allTreesFaded) {
      allTreesFaded = true;
      pauseTimer = 180;

      soundFade.stop();
      soundWind.stop();
      soundRustle.stop();
      soundBird.stop();
      for (let leaf of leafSounds) {
        leaf.stop();
      }
    }

    if (allTreesFaded && pauseTimer > 0) {
      pauseTimer--;
      if (pauseTimer === 0) {
        starsFalling = true;
        if (soundFall && soundFall.isLoaded()) {
          soundFall.play();
        }
      }
    }

    const HOVER_RADIUS = 40; // it needs a hover radius because we need to know how close the mouse is. And the mouse needs to be close enough to the star to trigger it or else all the other stars will also trigger

    for (let star of stars) {
      // this is the main star rendering and interaction logic, it handles the movement of the stars, the falling animation, and the hover text display
      let renderX, renderY;

      if (starsFalling) {
        star.gravitySpeed += 0.3;
        star.y += star.gravitySpeed;
        renderX = star.x;
        renderY = star.y;
        drawStar(renderX, renderY, 10, 25, 8);
      } else if (allTreesFaded) {
        renderX = star.currentRenderX;
        renderY = star.currentRenderY;
        drawStar(renderX, renderY, 10, 25, 8);
      } else {
        if (star.mode === "target") {
          star.x = p.lerp(star.x, star.targetX, 0.05);
          star.y = p.lerp(star.y, star.targetY, 0.05);
          star.currentRenderX = star.x;
          star.currentRenderY = star.y;
          renderX = star.x;
          renderY = star.y;
          drawStar(renderX, renderY, 10, 25, 8);

          if (p.dist(star.x, star.y, star.targetX, star.targetY) < 5) {
            star.mode = "drift";
            let targetTree = trees.find((t) => t.id === star.targetTreeId);
            if (targetTree) {
              targetTree.isFading = true;
              targetTree.fadeDelay = 0;
              targetTree.fadeSpeed = 2;
            }
          }
        } else {
          let offsetX = p.map(p.noise(star.tx), 0, 1, -50, 50);
          let offsetY = p.map(p.noise(star.ty), 0, 1, -50, 50);
          star.currentRenderX = star.x + offsetX;
          star.currentRenderY = star.y + offsetY;
          renderX = star.currentRenderX;
          renderY = star.currentRenderY;
          drawStar(renderX, renderY, 10, 25, 8);
          star.tx += 0.005;
          star.ty += 0.005;
        }
      }

      if (
        renderX !== undefined &&
        p.dist(p.mouseX, p.mouseY, renderX, renderY) < HOVER_RADIUS
      ) {
        p.push();
        p.noStroke();
        p.fill(30, 30, 30, 200);
        p.textFont("Courier New, monospace");
        p.textSize(24);
        p.textAlign(p.CENTER, p.BOTTOM);
        p.text("Human", renderX, renderY - 30);
        p.pop();
      }
    }

    if (!massFadeTriggered) {
      p.push();
      p.noStroke();
      p.fill(50, 48, 44);
      p.textFont("Courier New, monospace");
      p.textSize(26);
      p.textAlign(p.CENTER, p.CENTER);

      // Toggle text content based on state
      let hudMessage =
        stars.length === 0
          ? "Press on the map to spawn a Human"
          : "Press on a tree to destroy it";

      p.text(hudMessage, W / 2, H - 45);
      p.pop();
    }

    // Fullscreen button — drawn last so it always sits on top of everything
    drawFullscreenBtn();
  };

  // Draws the fullscreen toggle button in the top-right corner of the canvas
  function drawFullscreenBtn() {
    const x = fsBtnX();
    const y = fsBtnY();
    const s = FS_BTN_SIZE;
    const hovered = mouseOverFsBtn();
    const isFS = canvasFullscreen;

    p.push();

    // Background rounded square
    p.noStroke();
    p.fill(50, 48, 44, hovered ? 210 : 140);
    p.rect(x, y, s, s, 10);

    // Icon: two arrows pointing outward (expand) or inward (collapse)
    // Drawn as four corner L-shapes
    p.stroke(233, 231, 225);
    p.strokeWeight(3);
    p.noFill();
    p.strokeCap(p.SQUARE);

    const m = s * 0.22; // margin from edge of button
    const a = s * 0.22; // arm length of each corner arrow

    if (!isFS) {
      // Expand icon — corners pointing outward
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
      // Collapse icon — corners pointing inward
      const cx = x + s / 2;
      const cy = y + s / 2;
      // Top-left (points toward center)
      p.line(x + m, y + m, x + m + a, y + m);
      p.line(x + m, y + m, x + m, y + m + a);
      // Arrows point inward: shift by small offset toward center
      p.line(x + m + a, y + m, x + m + a, y + m + a);
      p.line(x + m, y + m + a, x + m + a, y + m + a);
      // Top-right
      p.line(x + s - m, y + m, x + s - m - a, y + m);
      p.line(x + s - m, y + m, x + s - m, y + m + a);
      p.line(x + s - m - a, y + m, x + s - m - a, y + m + a);
      p.line(x + s - m, y + m + a, x + s - m - a, y + m + a);
      // Bottom-left
      p.line(x + m, y + s - m, x + m + a, y + s - m);
      p.line(x + m, y + s - m, x + m, y + s - m - a);
      p.line(x + m + a, y + s - m, x + m + a, y + s - m - a);
      p.line(x + m, y + s - m - a, x + m + a, y + s - m - a);
      // Bottom-right
      p.line(x + s - m, y + s - m, x + s - m - a, y + s - m);
      p.line(x + s - m, y + s - m, x + s - m, y + s - m - a);
      p.line(x + s - m - a, y + s - m, x + s - m - a, y + s - m - a);
      p.line(x + s - m, y + s - m - a, x + s - m - a, y + s - m - a);
    }

    p.pop();
  }

  // Spawn a star at the given canvas coordinates
  function spawnStar(cx, cy) {
    // a function for spawning stars, it is called when the user clicks on an empty area of the canvas
    p.userStartAudio();
    soundSpawn.play();

    stars.push({
      x: cx,
      y: cy,
      tx: p.random(1000),
      ty: p.random(10000, 20000),
      mode: "drift",
      targetX: 0,
      targetY: 0,
      targetTreeId: -1,
      gravitySpeed: 0,
      currentRenderX: cx,
      currentRenderY: cy,
    });
  }

  p.mousePressed = () => {
    // Fullscreen button takes priority — checked before any other interaction
    if (mouseOverFsBtn()) {
      toggleCanvasFullscreen();
      return;
    }

    if (allTreesFaded) return;
    if (p.mouseX < 0 || p.mouseX > W || p.mouseY < 0 || p.mouseY > H) return;

    p.userStartAudio();

    // Check if a tree was clicked
    let hitTree = null;
    for (let i = trees.length - 1; i >= 0; i--) {
      let t = trees[i];
      if (p.dist(p.mouseX, p.mouseY, t.x, t.y) <= t.radius) {
        hitTree = t;
        break;
      }
    }

    if (hitTree) {
      soundWood.play();
      clickedTreeIds.add(hitTree.id);

      if (clickedTreeIds.size >= 10 && !massFadeTriggered) {
        massFadeTriggered = true;
        if (soundFade && soundFade.isLoaded()) {
          soundFade.play();
        }
        for (let tree of trees) {
          if (!clickedTreeIds.has(tree.id)) {
            tree.isFading = true;
            tree.fadeDelay = p.random(0, 180);
            tree.fadeSpeed = p.random(0.5, 3.0);
          }
        }
      }

      for (let star of stars) {
        if (p.random(1) < 0.5) {
          star.mode = "target";
          star.targetX = hitTree.x;
          star.targetY = hitTree.y;
          star.targetTreeId = hitTree.id;
        }
      }
    } else {
      spawnStar(p.mouseX, p.mouseY);
    }
  };

  function drawCustomTree(t) {
    // this tree drawing function is made by lianna
    p.push();
    p.noStroke();
    p.fill(76, 175, 80, t.opacity);
    generateScallopShape(t.x, t.y, t.radius, t.lobes);
    p.pop();
  }

  function generateScallopShape(xc, yc, radius, numLobes) {
    // this tree shape is made by lianna
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

  function drawStar(x, y, innerR, outerR, numPoints) {
    // Using math to generate a star shape, because I wanted to have more control over the amount of points and I can easily change the points
    p.push();
    p.fill("#300000");
    p.noStroke();

    let angleStep = p.TWO_PI / (numPoints * 2);
    let startAngle = -p.HALF_PI;
    p.beginShape();
    for (let i = 0; i < numPoints * 2; i++) {
      let angle = startAngle + i * angleStep;
      let r = i % 2 === 0 ? outerR : innerR;
      p.vertex(x + p.cos(angle) * r, y + p.sin(angle) * r);
    }
    p.endShape(p.CLOSE);
    p.pop();
  }

  function interp(v1, v2, thresh) {
    if (Math.abs(v2 - v1) < 1e-9) return 0.5;
    return (thresh - v1) / (v2 - v1);
  }

  function marchingSquares(field, cols, rows, thresh) {
    // This is the marching squares algorithm, i chosed this because it acts like a contour generator and it can generate nice terrain lines based on the noise field
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
    // an algorithm for chaining the line generated by marching squares. I chosed it because it works and it is fast.
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

new p5(destructionSketch);
