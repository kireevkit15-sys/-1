async function createMainScreen(page) {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  await figma.loadFontAsync({ family: "Inter", style: "Medium" });
  await figma.loadFontAsync({ family: "Inter", style: "Bold" });

  // === PALETTE ===
  var bg = { r: 12/255, g: 21/255, b: 25/255 };
  var surface = { r: 22/255, g: 33/255, b: 39/255 };
  var surfaceLight = { r: 58/255, g: 53/255, b: 52/255 };
  var accent = { r: 207/255, g: 157/255, b: 123/255 };
  var accentWarm = { r: 114/255, g: 75/255, b: 57/255 };
  var accentGold = { r: 185/255, g: 141/255, b: 52/255 };
  var accentRed = { r: 137/255, g: 53/255, b: 42/255 };
  var textPrimary = { r: 232/255, g: 221/255, b: 211/255 };
  var textSecondary = { r: 135/255, g: 117/255, b: 106/255 };
  var textMuted = { r: 86/255, g: 69/255, b: 58/255 };
  var border = { r: 40/255, g: 35/255, b: 33/255 };

  function rgba(c, a) { return { r: c.r, g: c.g, b: c.b, a: a }; }

  function createText(parent, opts) {
    var t = figma.createText();
    parent.appendChild(t);
    t.fontName = { family: "Inter", style: opts.style || "Regular" };
    t.characters = opts.text;
    t.fontSize = opts.size || 14;
    t.fills = [{ type: "SOLID", color: opts.color || textPrimary }];
    if (opts.letterSpacing) {
      t.letterSpacing = typeof opts.letterSpacing === "number"
        ? { value: opts.letterSpacing, unit: "PIXELS" }
        : opts.letterSpacing;
    }
    t.x = opts.x || 0;
    t.y = opts.y || 0;
    if (opts.width) {
      t.resize(opts.width, t.height);
      t.textAutoResize = "HEIGHT";
    }
    if (opts.textAlignHorizontal) t.textAlignHorizontal = opts.textAlignHorizontal;
    return t;
  }

  // === MAIN FRAME (375x812 iPhone SE) ===
  var main = figma.createFrame();
  main.name = "RAZUM — Dark Academia Theme";
  main.resize(375, 812);
  main.fills = [{ type: "SOLID", color: bg }];
  page.appendChild(main);

  // ============================================================
  // SECTION 1: HEADER (y: 48–90)
  // ============================================================

  var sep = figma.createRectangle();
  main.appendChild(sep);
  sep.resize(375, 1); sep.x = 0; sep.y = 44;
  sep.fills = [{ type: "SOLID", color: accent }]; sep.opacity = 0.05;

  createText(main, {
    text: "РАЗУМ", style: "Bold", size: 28, color: accent,
    x: 16, y: 52, letterSpacing: { value: 4, unit: "PIXELS" }
  });

  // Streak pill — added fire icon context
  var pill = figma.createFrame();
  main.appendChild(pill);
  pill.name = "StreakPill";
  pill.resize(90, 32); pill.x = 269; pill.y = 52;
  pill.cornerRadius = 16;
  pill.fills = [{
    type: "GRADIENT_LINEAR", gradientTransform: [[1,0,0],[0,1,0]],
    gradientStops: [
      { position: 0, color: rgba(accentWarm, 0.3) },
      { position: 1, color: rgba(surface, 1) }
    ]
  }];
  pill.strokes = [{ type: "SOLID", color: border }]; pill.strokeWeight = 1;
  pill.clipsContent = true;

  // Fire icon — bright, visible
  var flame = figma.createVector();
  pill.appendChild(flame);
  flame.resize(14, 18); flame.x = 8; flame.y = 7;
  flame.vectorPaths = [{
    windingRule: "NONZERO",
    data: "M 7 0 C 7 0 10 4 10 4 C 12 6 14 8 14 11 C 14 15 11 18 7 18 C 3 18 0 15 0 11 C 0 8 2 6 4 4 C 4 4 4 7 5.5 8 C 5.5 8 7 0 7 0 Z"
  }];
  flame.fills = [{ type: "SOLID", color: accentGold }]; flame.strokes = [];

  createText(pill, {
    text: "7 дней", size: 13, color: textPrimary,
    x: 24, y: 8, width: 60, textAlignHorizontal: "CENTER"
  });

  // ============================================================
  // SECTION 2: WARMUP CARD (y: 100–240)
  // ============================================================

  var warmupCard = figma.createFrame();
  main.appendChild(warmupCard);
  warmupCard.name = "WarmupCard";
  warmupCard.resize(343, 140); warmupCard.x = 16; warmupCard.y = 100;
  warmupCard.cornerRadius = 16;
  warmupCard.fills = [{
    type: "GRADIENT_LINEAR", gradientTransform: [[0.8,-0.6,0.3],[0.6,0.8,0]],
    gradientStops: [
      { position: 0, color: rgba(accentWarm, 0.2) },
      { position: 0.6, color: rgba(surface, 1) },
      { position: 1, color: rgba(surface, 1) }
    ]
  }];
  warmupCard.strokes = [{ type: "SOLID", color: border }]; warmupCard.strokeWeight = 1;
  warmupCard.effects = [{
    type: "DROP_SHADOW", visible: true, blendMode: "NORMAL",
    color: rgba(accent, 0.06), offset: { x: 0, y: -1 }, radius: 20, spread: 0
  }];
  warmupCard.clipsContent = true;

  // Top accent line
  var topLine = figma.createRectangle();
  warmupCard.appendChild(topLine);
  topLine.resize(343, 1); topLine.x = 0; topLine.y = 0;
  topLine.fills = [{
    type: "GRADIENT_LINEAR", gradientTransform: [[1,0,0],[0,1,0]],
    gradientStops: [
      { position: 0, color: rgba(accent, 0) },
      { position: 0.5, color: rgba(accent, 0.3) },
      { position: 1, color: rgba(accent, 0) }
    ]
  }];

  createText(warmupCard, { text: "Ежедневная разминка", style: "Medium", size: 17, color: textPrimary, x: 16, y: 18 });
  createText(warmupCard, { text: "5 вопросов на логику и мышление", size: 13, color: textSecondary, x: 16, y: 44 });

  var ctaBtn = figma.createFrame();
  warmupCard.appendChild(ctaBtn);
  ctaBtn.name = "CTAButton";
  ctaBtn.resize(311, 44); ctaBtn.x = 16; ctaBtn.y = 80;
  ctaBtn.cornerRadius = 12;
  ctaBtn.fills = [{ type: "SOLID", color: accent }];
  ctaBtn.effects = [{
    type: "DROP_SHADOW", visible: true, blendMode: "NORMAL",
    color: rgba(accent, 0.25), offset: { x: 0, y: 4 }, radius: 16, spread: 0
  }];

  createText(ctaBtn, {
    text: "Начать разминку", style: "Medium", size: 14, color: bg,
    x: 0, y: 13, width: 311, textAlignHorizontal: "CENTER"
  });

  // ============================================================
  // SECTION 3: BATTLE CARD (y: 258–388)
  // ============================================================

  var divider = figma.createRectangle();
  main.appendChild(divider);
  divider.resize(100, 1); divider.x = 137; divider.y = 252;
  divider.fills = [{ type: "SOLID", color: accent }]; divider.opacity = 0.08;

  var battleCard = figma.createFrame();
  main.appendChild(battleCard);
  battleCard.name = "BattleCard";
  battleCard.resize(343, 130); battleCard.x = 16; battleCard.y = 265;
  battleCard.cornerRadius = 16;
  battleCard.fills = [{ type: "SOLID", color: surface }];
  battleCard.strokes = [{ type: "SOLID", color: border }]; battleCard.strokeWeight = 1;
  battleCard.clipsContent = true;

  var leftBar = figma.createRectangle();
  battleCard.appendChild(leftBar);
  leftBar.resize(3, 98); leftBar.x = 0; leftBar.y = 16;
  leftBar.cornerRadius = 2;
  leftBar.fills = [{ type: "SOLID", color: accentRed }];

  createText(battleCard, { text: "Интеллект-батл", style: "Bold", size: 18, color: textPrimary, x: 20, y: 18 });
  createText(battleCard, { text: "Сразись с соперником в 5 раундах", size: 13, color: textSecondary, x: 20, y: 46 });

  var ghostBtn = figma.createFrame();
  battleCard.appendChild(ghostBtn);
  ghostBtn.name = "GhostButton";
  ghostBtn.resize(120, 36); ghostBtn.x = 20; ghostBtn.y = 80;
  ghostBtn.cornerRadius = 10;
  ghostBtn.fills = [];
  ghostBtn.strokes = [{ type: "SOLID", color: accent }]; ghostBtn.strokeWeight = 1;

  createText(ghostBtn, {
    text: "В бой", style: "Medium", size: 13, color: accent,
    x: 0, y: 10, width: 120, textAlignHorizontal: "CENTER"
  });

  // Decorative circles — far right, no overlap with text
  var outerC = figma.createEllipse();
  battleCard.appendChild(outerC);
  outerC.resize(48, 48); outerC.x = 282; outerC.y = 41;
  outerC.fills = [{ type: "SOLID", color: accentRed }]; outerC.opacity = 0.08;

  var innerC = figma.createEllipse();
  battleCard.appendChild(innerC);
  innerC.resize(24, 24); innerC.x = 294; innerC.y = 53;
  innerC.fills = [{ type: "SOLID", color: accentRed }]; innerC.opacity = 0.15;

  // ============================================================
  // SECTION 4: STATS GRID (y: 415–590)
  // ============================================================

  createText(main, {
    text: "Статистика", size: 12, color: textMuted,
    x: 16, y: 415, letterSpacing: { value: 2, unit: "PIXELS" }
  });

  function createStatCard(x, y, num, numColor, numSize, label) {
    var card = figma.createFrame();
    main.appendChild(card);
    card.name = "Stat_" + label;
    card.resize(167, 80); card.x = x; card.y = y;
    card.cornerRadius = 14;
    card.fills = [{ type: "SOLID", color: surface }];
    card.strokes = [{ type: "SOLID", color: border }]; card.strokeWeight = 1;
    card.effects = [{
      type: "DROP_SHADOW", visible: true, blendMode: "NORMAL",
      color: rgba(accent, 0.05), offset: { x: 0, y: -2 }, radius: 12, spread: 0
    }];
    card.clipsContent = true;
    createText(card, { text: num, style: "Bold", size: numSize, color: numColor, x: 16, y: 14 });
    createText(card, { text: label, size: 12, color: textSecondary, x: 16, y: 50 });
    return card;
  }

  var c1 = createStatCard(16, 438, "42", accent, 26, "Батлов");
  var dot1 = figma.createRectangle(); c1.appendChild(dot1);
  dot1.resize(4, 4); dot1.x = 147; dot1.y = 16; dot1.cornerRadius = 2;
  dot1.fills = [{ type: "SOLID", color: accent }]; dot1.opacity = 0.4;

  var c2 = createStatCard(192, 438, "68%", accentGold, 26, "Побед");
  var dot2 = figma.createRectangle(); c2.appendChild(dot2);
  dot2.resize(4, 4); dot2.x = 147; dot2.y = 16; dot2.cornerRadius = 2;
  dot2.fills = [{ type: "SOLID", color: accentGold }]; dot2.opacity = 0.4;

  var c3 = createStatCard(16, 527, "Lvl 12", accent, 24, "Уровень");
  var miniProg = figma.createRectangle(); c3.appendChild(miniProg);
  miniProg.resize(60, 3); miniProg.x = 16; miniProg.y = 70; miniProg.cornerRadius = 2;
  miniProg.fills = [{
    type: "GRADIENT_LINEAR", gradientTransform: [[1,0,0],[0,1,0]],
    gradientStops: [{ position: 0, color: rgba(accent, 1) }, { position: 1, color: rgba(accent, 0) }]
  }];

  var c4 = createStatCard(192, 527, "Стратег", accentGold, 20, "Класс");
  var rankDot = figma.createRectangle(); c4.appendChild(rankDot);
  rankDot.resize(8, 8); rankDot.x = 147; rankDot.y = 16; rankDot.cornerRadius = 4;
  rankDot.fills = [{ type: "SOLID", color: accentGold }]; rankDot.opacity = 0.5;

  // ============================================================
  // SECTION 5: XP PROGRESS (y: 625–700)
  // ============================================================

  createText(main, {
    text: "Прогресс", size: 12, color: textMuted,
    x: 16, y: 627, letterSpacing: { value: 2, unit: "PIXELS" }
  });

  var xpCard = figma.createFrame();
  main.appendChild(xpCard);
  xpCard.name = "XPProgress";
  xpCard.resize(343, 58); xpCard.x = 16; xpCard.y = 650;
  xpCard.cornerRadius = 14;
  xpCard.fills = [{ type: "SOLID", color: surface }];
  xpCard.strokes = [{ type: "SOLID", color: border }]; xpCard.strokeWeight = 1;
  xpCard.effects = [{
    type: "DROP_SHADOW", visible: true, blendMode: "NORMAL",
    color: rgba(accent, 0.04), offset: { x: 0, y: -1 }, radius: 8, spread: 0
  }];
  xpCard.clipsContent = true;

  createText(xpCard, { text: "Опыт", size: 13, color: textSecondary, x: 16, y: 8 });
  createText(xpCard, { text: "2450 / 3000 XP", size: 11, color: textMuted, x: 220, y: 10, width: 107, textAlignHorizontal: "RIGHT" });

  var track = figma.createRectangle(); xpCard.appendChild(track);
  track.resize(311, 10); track.x = 16; track.y = 34; track.cornerRadius = 5;
  track.fills = [{ type: "SOLID", color: surfaceLight }];

  var xpFill = figma.createRectangle(); xpCard.appendChild(xpFill);
  xpFill.resize(254, 10); xpFill.x = 16; xpFill.y = 34; xpFill.cornerRadius = 5;
  xpFill.fills = [{
    type: "GRADIENT_LINEAR", gradientTransform: [[1,0,0],[0,1,0]],
    gradientStops: [
      { position: 0, color: rgba(accentWarm, 1) },
      { position: 0.5, color: rgba(accent, 1) },
      { position: 1, color: rgba(accentGold, 1) }
    ]
  }];
  xpFill.effects = [{
    type: "DROP_SHADOW", visible: true, blendMode: "NORMAL",
    color: rgba(accent, 0.3), offset: { x: 0, y: 2 }, radius: 8, spread: 0
  }];

  var endCap = figma.createEllipse(); xpCard.appendChild(endCap);
  endCap.resize(6, 6); endCap.x = 267; endCap.y = 36;
  endCap.fills = [{ type: "SOLID", color: accent }];
  endCap.effects = [{
    type: "DROP_SHADOW", visible: true, blendMode: "NORMAL",
    color: rgba(accent, 0.5), offset: { x: 0, y: 0 }, radius: 6, spread: 0
  }];

  // ============================================================
  // SECTION 6: BOTTOM NAVIGATION (y: 728–812)
  // XP ends at 708, nav starts at 728 = 20px gap (clean)
  // Nav height 84 = 50 content + 34 safe area
  // ============================================================

  var navBar = figma.createFrame();
  main.appendChild(navBar);
  navBar.name = "BottomNav";
  navBar.resize(375, 84); navBar.x = 0; navBar.y = 728;
  navBar.clipsContent = false;
  navBar.fills = [{
    type: "GRADIENT_LINEAR", gradientTransform: [[0,1,0],[-1,0,1]],
    gradientStops: [
      { position: 0, color: rgba(surface, 0.95) },
      { position: 1, color: { r: 16/255, g: 26/255, b: 32/255, a: 1 } }
    ]
  }];

  var navBorder = figma.createRectangle(); navBar.appendChild(navBorder);
  navBorder.resize(375, 1); navBorder.x = 0; navBorder.y = 0;
  navBorder.fills = [{
    type: "GRADIENT_LINEAR", gradientTransform: [[1,0,0],[0,1,0]],
    gradientStops: [
      { position: 0, color: rgba(accent, 0) },
      { position: 0.5, color: rgba(accent, 0.15) },
      { position: 1, color: rgba(accent, 0) }
    ]
  }];

  var tabs = [
    { label: "Главная", active: true },
    { label: "Батл", active: false },
    { label: "Обучение", active: false },
    { label: "Профиль", active: false }
  ];
  var tabW = 93;

  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    var tabFrame = figma.createFrame();
    navBar.appendChild(tabFrame);
    tabFrame.name = "Tab_" + tab.label;
    tabFrame.resize(tabW, 56); tabFrame.x = i * tabW + (i === 3 ? 3 : 0); tabFrame.y = 0;
    tabFrame.fills = []; tabFrame.clipsContent = false;

    var iconColor = tab.active ? accent : textMuted;
    var iconX = (tabW - 22) / 2;
    var iconY = tab.active ? 8 : 10;

    if (tab.active) {
      var ind = figma.createRectangle(); tabFrame.appendChild(ind);
      ind.resize(40, 2); ind.x = (tabW - 40) / 2; ind.y = 0; ind.cornerRadius = 1;
      ind.fills = [{ type: "SOLID", color: accent }];
    }

    // === ICONS (all 22x22 bounding box) ===
    if (i === 0) {
      // HOME
      var homeIcon = figma.createVector(); tabFrame.appendChild(homeIcon);
      homeIcon.resize(22, 22); homeIcon.x = iconX; homeIcon.y = iconY;
      homeIcon.vectorPaths = [{
        windingRule: "EVENODD",
        data: "M 11 1.5 L 1 9.5 L 4 9.5 L 4 19.5 L 9 19.5 L 9 14 C 9 13.45 9.45 13 10 13 L 12 13 C 12.55 13 13 13.45 13 14 L 13 19.5 L 18 19.5 L 18 9.5 L 21 9.5 Z"
      }];
      homeIcon.fills = []; homeIcon.strokes = [{ type: "SOLID", color: iconColor }];
      homeIcon.strokeWeight = 1.5; homeIcon.strokeCap = "ROUND"; homeIcon.strokeJoin = "ROUND";
    } else if (i === 1) {
      // BATTLE — lightning bolt (scaled to 22x22)
      var bolt = figma.createVector(); tabFrame.appendChild(bolt);
      bolt.resize(22, 22); bolt.x = iconX; bolt.y = iconY;
      bolt.vectorPaths = [{
        windingRule: "NONZERO",
        data: "M 12.5 1 L 4 12.5 L 10 12.5 L 9.5 21 L 18 9.5 L 12 9.5 Z"
      }];
      bolt.fills = []; bolt.strokes = [{ type: "SOLID", color: iconColor }];
      bolt.strokeWeight = 1.5; bolt.strokeCap = "ROUND"; bolt.strokeJoin = "ROUND";
    } else if (i === 2) {
      // LEARN — open book (scaled to 22x22)
      var book = figma.createVector(); tabFrame.appendChild(book);
      book.resize(22, 22); book.x = iconX; book.y = iconY;
      book.vectorPaths = [{
        windingRule: "NONZERO",
        data: "M 11 4 C 11 4 8.5 1.5 1.5 2 L 1.5 17.5 C 8.5 17 11 19 11 19 M 11 4 C 11 4 13.5 1.5 20.5 2 L 20.5 17.5 C 13.5 17 11 19 11 19 M 11 4 L 11 19"
      }];
      book.fills = []; book.strokes = [{ type: "SOLID", color: iconColor }];
      book.strokeWeight = 1.5; book.strokeCap = "ROUND"; book.strokeJoin = "ROUND";
    } else {
      // PROFILE — head + body arc
      var profileHead = figma.createEllipse(); tabFrame.appendChild(profileHead);
      profileHead.resize(8, 8); profileHead.x = iconX + 7; profileHead.y = iconY + 1.5;
      profileHead.fills = []; profileHead.strokes = [{ type: "SOLID", color: iconColor }]; profileHead.strokeWeight = 1.5;

      var profileBody = figma.createVector(); tabFrame.appendChild(profileBody);
      profileBody.resize(22, 22); profileBody.x = iconX; profileBody.y = iconY;
      profileBody.vectorPaths = [{
        windingRule: "NONZERO",
        data: "M 1.5 20.5 C 1.5 15.25 5.75 11 11 11 C 16.25 11 20.5 15.25 20.5 20.5"
      }];
      profileBody.fills = []; profileBody.strokes = [{ type: "SOLID", color: iconColor }];
      profileBody.strokeWeight = 1.5; profileBody.strokeCap = "ROUND";
    }

    createText(tabFrame, {
      text: tab.label, size: 10, color: iconColor,
      x: 0, y: tab.active ? 34 : 36, width: tabW, textAlignHorizontal: "CENTER"
    });
  }

  figma.viewport.scrollAndZoomIntoView([main]);
  return main;
}

// === RUN ===
createMainScreen(figma.currentPage).then(function() {
  figma.closePlugin("RAZUM Dark Academia mockup created!");
}).catch(function(err) {
  figma.closePlugin("Error: " + err.message);
});
