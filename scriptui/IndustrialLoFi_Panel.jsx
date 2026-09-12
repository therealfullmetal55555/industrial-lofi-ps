// INDUSTRIAL LO-FI — Photoshop Panel v3.0
// PS 27 (2026) compatible
// v2.9: event loop не полагается на возвращаемое значение w.show() — используем флаги
#target photoshop

var c = charIDToTypeID;
var s = stringIDToTypeID;

function checkDoc() {
    if (!app.documents.length) { alert("Open a document first!"); return false; }
    return true;
}

// ── BASE UTILITIES ───────────────────────────────────────────
function stampVisible() {
    var d = new ActionDescriptor();
    d.putBoolean(c("Dplc"), true);
    executeAction(c("MrgV"), d, DialogModes.NO);
}

function applyGaussianBlur(radius) {
    if (radius < 0.05) return;
    var d = new ActionDescriptor();
    d.putUnitDouble(c("Rds "), c("#Pxl"), radius);
    executeAction(s("gaussianBlur"), d, DialogModes.NO);
}

// FIX 1: was c("AddMsk") — 6 chars, crashes charIDToTypeID
function addLayerMask(revealAll) {
    var d = new ActionDescriptor();
    d.putEnumerated(c("Usng"), c("UsrM"), revealAll ? c("RvlA") : c("HdAl"));
    executeAction(s("addLayerMask"), d, DialogModes.NO);
}

function makeEllipticalSelection(l, t, r, b, f) {
    var d = new ActionDescriptor();
    d.putEnumerated(c("Styl"), c("Styl"), c("Nrml"));
    d.putUnitDouble(c("Ftr "), c("#Pxl"), f);
    d.putBoolean(c("AntA"), true);
    var bn = new ActionDescriptor();
    bn.putUnitDouble(c("Top "), c("#Pxl"), t);
    bn.putUnitDouble(c("Left"), c("#Pxl"), l);
    bn.putUnitDouble(c("Btom"), c("#Pxl"), b);
    bn.putUnitDouble(c("Rght"), c("#Pxl"), r);
    d.putObject(c("Bnd "), c("Rctn"), bn);
    executeAction(c("MrqE"), d, DialogModes.NO);
}

function fillWithColor(r, g, b) {
    var savedR = app.foregroundColor.rgb.red;
    var savedG = app.foregroundColor.rgb.green;
    var savedB = app.foregroundColor.rgb.blue;
    var col = new SolidColor();
    col.rgb.red = r; col.rgb.green = g; col.rgb.blue = b;
    app.foregroundColor = col;
    var d = new ActionDescriptor();
    d.putEnumerated(c("Usng"), c("FlCn"), c("FrgC"));
    d.putUnitDouble(c("Opct"), c("#Prc"), 100);
    d.putEnumerated(c("Md  "), c("BlnM"), c("Nrml"));
    d.putBoolean(c("Prsv"), false);
    executeAction(c("Fl  "), d, DialogModes.NO);
    var restore = new SolidColor();
    restore.rgb.red = savedR;
    restore.rgb.green = savedG;
    restore.rgb.blue = savedB;
    app.foregroundColor = restore;
}

function activateLayerMask() {
    var d = new ActionDescriptor(), r = new ActionReference();
    r.putEnumerated(c("Chnl"), c("Chnl"), c("Msk "));
    d.putReference(c("null"), r);
    d.putBoolean(c("MkVs"), false);
    executeAction(c("slct"), d, DialogModes.NO);
}

// ── PIXEL-BASED ADJUSTMENTS ──────────────────────────────────
// FIX 5: was val || default — breaks when slider = 0 (falsy). Use explicit null check.
function applyBW(reds, yellows, greens, blues) {
    var d = new ActionDescriptor();
    d.putDouble(s("reds"),    (reds    != null ? reds    : 45));
    d.putDouble(s("yellows"), (yellows != null ? yellows : 50));
    d.putDouble(s("greens"),  (greens  != null ? greens  : 30));
    d.putDouble(s("cyans"),   40);
    d.putDouble(s("blues"),   (blues   != null ? blues   : 15));
    d.putDouble(s("magentas"), 60);
    d.putBoolean(s("useTint"), false);
    executeAction(s("blackAndWhite"), d, DialogModes.NO);
}

function applyCurves(points) {
    var desc = new ActionDescriptor();
    var adj  = new ActionList();
    var cd   = new ActionDescriptor();
    var cr   = new ActionReference();
    cr.putEnumerated(c("Chnl"), c("Chnl"), c("Cmps"));
    cd.putReference(c("Chnl"), cr);
    var pl = new ActionList();
    for (var i = 0; i < points.length; i++) {
        var pd = new ActionDescriptor();
        pd.putDouble(c("Hrzn"), points[i][0]);
        pd.putDouble(c("Vrtc"), points[i][1]);
        pl.putObject(c("Pnt "), pd);
    }
    cd.putList(c("Crv "), pl);
    adj.putObject(c("CrvA"), cd);
    desc.putList(c("Adjs"), adj);
    executeAction(c("Crv "), desc, DialogModes.NO);
}

// FIX 6: was ml(val || 0, ...) — val || 0 corrupts any negative value (falsy). Removed.
function applyColorBalance(shadCR, shadMG, shadYB, midCR, midMG, midYB, hiCR, hiMG, hiYB) {
    function ml(a, b, cc) {
        var l = new ActionList();
        l.putDouble(a); l.putDouble(b); l.putDouble(cc);
        return l;
    }
    var d = new ActionDescriptor();
    d.putList(c("Shds"), ml(shadCR, shadMG, shadYB));
    d.putList(c("Mdtn"), ml(midCR,  midMG,  midYB));
    d.putList(c("Hghl"), ml(hiCR,   hiMG,   hiYB));
    d.putBoolean(c("PrsL"), true);
    executeAction(c("ClrB"), d, DialogModes.NO);
}

function applySaturation(sat) {
    var d = new ActionDescriptor();
    d.putDouble(s("hue"), 0);
    d.putDouble(s("saturation"), sat);
    d.putDouble(s("lightness"), 0);
    d.putBoolean(s("colorize"), false);
    executeAction(s("hueSaturation"), d, DialogModes.NO);
}

// ── FX EFFECTS ───────────────────────────────────────────────
function crushedNoir() {
    if (!checkDoc()) return;
    stampVisible();
    app.activeDocument.activeLayer.name = "Crushed Noir";
    applyCurves([[0,0],[30,0],[80,40],[128,148],[200,230],[255,255]]);
}

function xeroxScan() {
    if (!checkDoc()) return;
    stampVisible();
    app.activeDocument.activeLayer.name = "Xerox Scan";
    applyCurves([[0,35],[128,128],[255,220]]);
}

function silverGelatin() {
    if (!checkDoc()) return;
    stampVisible();
    app.activeDocument.activeLayer.name = "BW Silver Gelatin";
    applyBW(40, 60, 40, 20);
}

function toxicCyan() {
    if (!checkDoc()) return;
    var doc = app.activeDocument;
    var cl = doc.artLayers.add();
    cl.name = "Toxic Cyan";
    doc.activeLayer = cl;
    doc.selection.selectAll();
    fillWithColor(0, 200, 230);
    doc.selection.deselect();
    cl.blendMode = BlendMode.SCREEN;
    cl.opacity = 45;
}

function doGrain(intensity) {
    if (!checkDoc()) return;
    var amt = (intensity / 100) * 50;
    if (amt < 0.5) return;
    stampVisible();
    app.activeDocument.activeLayer.name = "GRAIN";
    var d = new ActionDescriptor();
    d.putDouble(c("Amnt"), amt);
    d.putEnumerated(c("Dstr"), c("Dstr"), c("Gsn "));
    d.putBoolean(c("Mnch"), true);
    executeAction(c("AdNs"), d, DialogModes.NO);
}

function cctvPixelate() {
    if (!checkDoc()) return;
    var doc = app.activeDocument, pf = 0.25, orig = app.preferences.interpolation;
    var dup = doc.activeLayer.duplicate();
    dup.name = "CCTV"; doc.activeLayer = dup;
    try { dup.rasterize(RasterizeType.ENTIRELAYER); } catch(e2) {}
    app.preferences.interpolation = ResampleMethod.NEARESTNEIGHBOR;
    dup.resize(pf*100, pf*100, AnchorPosition.MIDDLECENTER);
    dup.resize((1/pf)*100, (1/pf)*100, AnchorPosition.MIDDLECENTER);
    app.preferences.interpolation = orig;
}

function unsharpArtifacts() {
    if (!checkDoc()) return;
    var doc = app.activeDocument, dup = doc.activeLayer.duplicate();
    dup.name = "Unsharp"; doc.activeLayer = dup;
    try { dup.rasterize(RasterizeType.ENTIRELAYER); } catch(e2) {}
    var d = new ActionDescriptor();
    d.putUnitDouble(c("Amnt"), c("#Prc"), 300);
    d.putUnitDouble(c("Rds "), c("#Pxl"), 4.0);
    d.putInteger(c("Thsh"), 0);
    executeAction(c("UnsM"), d, DialogModes.NO);
}

// FIX 3: was missing activateLayerMask() → fill went to layer pixels, not mask
function directFlash() {
    if (!checkDoc()) return;
    var doc = app.activeDocument, W = doc.width.as("px"), H = doc.height.as("px");
    stampVisible();
    app.activeDocument.activeLayer.name = "Direct Flash";
    applyCurves([[0,0],[128,148],[200,230],[255,255]]);
    addLayerMask(false);       // hide-all black mask
    activateLayerMask();       // FIX: must activate mask before painting into it
    makeEllipticalSelection(W*0.1, H*0.1, W*0.9, H*0.9, W*0.22);
    fillWithColor(255, 255, 255); // reveal center in mask = flash hotspot
    doc.selection.deselect();
}

// FIX 2: was d.putEnumerated(c("Md  "), c("BlrM"), c("Mtn")) — "Mtn" is 3 chars (crash)
//         and motionBlur takes only Angl + Dstn, no mode enum
function shutterDrag() {
    if (!checkDoc()) return;
    var doc = app.activeDocument, dup = doc.activeLayer.duplicate();
    dup.name = "Shutter Drag"; doc.activeLayer = dup;
    try { dup.rasterize(RasterizeType.ENTIRELAYER); } catch(e2) {}
    var d = new ActionDescriptor();
    d.putDouble(c("Angl"), 15);
    d.putUnitDouble(c("Dstn"), c("#Pxl"), 60);
    executeAction(s("motionBlur"), d, DialogModes.NO);
    dup.blendMode = BlendMode.SCREEN;
    dup.opacity = 50;
}

// FIX 4: was bL.moveBelow(src) — method doesn't exist on ArtLayer → use move()
function rgbSplit() {
    if (!checkDoc()) return;
    var doc = app.activeDocument, src = doc.activeLayer;
    function ml(a, b, d) { var l=new ActionList(); l.putDouble(a); l.putDouble(b); l.putDouble(d); return l; }

    // Red channel: shifted right, warm color balance, Screen blend
    var rL = src.duplicate(); rL.name = "CA-Red"; doc.activeLayer = rL; rL.translate(6, 0);
    try { rL.rasterize(RasterizeType.ENTIRELAYER); } catch(e2) {}
    var rd = new ActionDescriptor();
    rd.putList(c("Shds"), ml(40, 0, -15));
    rd.putList(c("Mdtn"), ml(30, 0, -10));
    rd.putList(c("Hghl"), ml(20, 0, 0));
    rd.putBoolean(c("PrsL"), true);
    executeAction(c("ClrB"), rd, DialogModes.NO);
    rL.blendMode = BlendMode.SCREEN; rL.opacity = 75;

    // Blue channel: shifted left, cool color balance, Screen blend, below src
    var bL = src.duplicate(); bL.name = "CA-Blue";
    bL.move(src, ElementPlacement.PLACEAFTER); // FIX: was bL.moveBelow(src) — doesn't exist
    doc.activeLayer = bL; bL.translate(-6, 0);
    try { bL.rasterize(RasterizeType.ENTIRELAYER); } catch(e2) {}
    var bd = new ActionDescriptor();
    bd.putList(c("Shds"), ml(-35, 0, 20));
    bd.putList(c("Mdtn"), ml(-25, 0, 15));
    bd.putList(c("Hghl"), ml(-15, 0, 10));
    bd.putBoolean(c("PrsL"), true);
    executeAction(c("ClrB"), bd, DialogModes.NO);
    bL.blendMode = BlendMode.SCREEN; bL.opacity = 75;
    doc.activeLayer = src;
}

function solarizeThermal() {
    if (!checkDoc()) return;
    stampVisible();
    app.activeDocument.activeLayer.name = "Solarize Thermal";
    applyCurves([[0,0],[45,210],[100,20],[155,220],[210,50],[255,255]]);
}

// ── GRADES ───────────────────────────────────────────────────

function doLavender() {
    if (!checkDoc()) return;
    stampVisible();
    app.activeDocument.activeLayer.name = "Lavender";
    applyBW(30, 40, 40, 20);
    applyCurves([[0,8],[128,135],[255,248]]);
    applyColorBalance(-12,-8,18, -5,-3,10, 8,5,20);
    doGrain(8);
}

function bleachBypass() {
    if (!checkDoc()) return;
    var doc = app.activeDocument;
    stampVisible();
    var base = doc.activeLayer;
    base.name = "BB Base";
    applyCurves([[0,0],[50,25],[200,225],[255,255]]);
    var bl = base.duplicate();
    bl.name = "BB Silver";
    doc.activeLayer = bl;
    try { bl.rasterize(RasterizeType.ENTIRELAYER); } catch(e2) {}
    var d = new ActionDescriptor();
    executeAction(s("desaturate"), d, DialogModes.NO);
    bl.blendMode = BlendMode.OVERLAY;
    bl.opacity = 80;
    doc.activeLayer = base;
}

function redscale() {
    if (!checkDoc()) return;
    stampVisible();
    app.activeDocument.activeLayer.name = "Redscale";
    applyCurves([[0,20],[100,110],[200,210],[255,245]]);
    applyColorBalance(35,-10,-35, 25,-5,-20, 10,0,-10);
    applySaturation(-20);
}

function cyanotype() {
    if (!checkDoc()) return;
    stampVisible();
    app.activeDocument.activeLayer.name = "Cyanotype";
    applyBW(40,50,35,20);
    applyCurves([[0,18],[100,105],[255,242]]);
    applyColorBalance(-15,0,30, -10,0,20, -5,0,10);
}

function moonlight() {
    if (!checkDoc()) return;
    stampVisible();
    app.activeDocument.activeLayer.name = "Moonlight";
    applyBW(30,40,45,30);
    applyCurves([[0,12],[128,118],[255,248]]);
    applyColorBalance(-20,-5,35, -10,-3,18, -5,0,8);
    doGrain(22);
}

function fadedPrint() {
    if (!checkDoc()) return;
    stampVisible();
    app.activeDocument.activeLayer.name = "Faded Print";
    applyCurves([[0,38],[100,108],[200,192],[255,232]]);
    applyColorBalance(8,0,-12, 5,0,-8, 3,0,-5);
    applySaturation(-35);
}

function halation() {
    if (!checkDoc()) return;
    var doc = app.activeDocument;
    stampVisible();
    var base = doc.activeLayer;
    base.name = "Halation";
    var hl = base.duplicate();
    hl.name = "Halation Glow";
    doc.activeLayer = hl;
    try { hl.rasterize(RasterizeType.ENTIRELAYER); } catch(e2) {}
    applyGaussianBlur(38);
    function ml3(a,b,cc){var l=new ActionList();l.putDouble(a);l.putDouble(b);l.putDouble(cc);return l;}
    var cd = new ActionDescriptor();
    cd.putList(c("Shds"), ml3(25,0,-30));
    cd.putList(c("Mdtn"), ml3(18,0,-22));
    cd.putList(c("Hghl"), ml3(10,0,-12));
    cd.putBoolean(c("PrsL"), true);
    executeAction(c("ClrB"), cd, DialogModes.NO);
    hl.blendMode = BlendMode.SCREEN;
    hl.opacity = 42;
    doc.activeLayer = base;
}

// ── TRI-X PRESET ─────────────────────────────────────────────
function doAusTaylor(grain, grainSize, blacks, highlights, mids, softness, warmth, vignette, reds, yellows, greens, blues) {
    if (!checkDoc()) return;
    var doc = app.activeDocument;
    var W = doc.width.as("px"), H = doc.height.as("px");

    // B&W conversion
    stampVisible();
    app.activeDocument.activeLayer.name = "B&W Tri-X";
    applyBW(reds, yellows, greens, blues);

    // Tone curve
    var sh40 = Math.round(38  - (blacks     / 100) * 36);
    var sh20 = Math.round(18  - (blacks     / 100) * 17);
    var mid  = Math.round(128 + (mids       /  50) * 25);
    var hci  = Math.round(255 - (highlights / 100) * 70);
    var hmi  = Math.round(hci - 30);

    // FIX 7: when highlights=0, hci=255 → duplicate x=255 → PS throws parameter error
    var curvePts = [
        [0, 0], [20, sh20], [40, sh40],
        [128, mid],
        [hmi, Math.min(240, mid + 60)], [hci, 255]
    ];
    if (hci < 255) curvePts.push([255, 255]); // only add if not duplicate
    applyCurves(curvePts);

    // Warmth (film paper toning)
    if (warmth >= 1) {
        var hlY = -Math.round(warmth * 0.12);
        var mdY = -Math.round(warmth * 0.05);
        applyColorBalance(0, 0, 0,  0, 0, mdY,  0, 0, hlY);
    }

    // Grain
    if (grain >= 1) {
        stampVisible();
        app.activeDocument.activeLayer.name = "GRAIN Tri-X";
        var pre = (softness / 100) * 2.0;
        if (pre > 0.05) applyGaussianBlur(pre);
        var gd = new ActionDescriptor();
        gd.putDouble(c("Amnt"), (grain / 100) * 45);
        gd.putEnumerated(c("Dstr"), c("Dstr"), c("Gsn "));
        gd.putBoolean(c("Mnch"), true);
        executeAction(c("AdNs"), gd, DialogModes.NO);
        var post = (grainSize / 100) * 1.5;
        if (post > 0.05) applyGaussianBlur(post);
    }

    // Vignette (black multiply layer with hole in center)
    if (vignette >= 1) {
        var vl = doc.artLayers.add();
        vl.name = "Vignette";
        vl.moveToBeginning();
        doc.activeLayer = vl;
        doc.selection.selectAll();
        fillWithColor(0, 0, 0);
        doc.selection.deselect();
        vl.blendMode = BlendMode.MULTIPLY;
        vl.opacity = vignette;
        addLayerMask(true);    // reveal-all white mask
        activateLayerMask();   // activate mask so we paint into it
        makeEllipticalSelection(W*0.04, H*0.04, W*0.96, H*0.96, Math.min(W, H) * 0.38);
        fillWithColor(0, 0, 0); // black center in mask = hides darken layer at center
        doc.selection.deselect();
    }
}

// ── EVENT LOOP (PS 27 modal fix) ────────────────────────────
// w.show() в PS не гарантированно возвращает значение из close().
// Используем флаги вместо return value.
var closeForGood = false;
var pendingFn = null;
function sched(fn) { pendingFn = fn; w.close(); }

// ── UI ───────────────────────────────────────────────────────
var w = new Window('dialog', 'INDUSTRIAL LO-FI  v3.0');
w.orientation = 'column'; w.alignChildren = ['fill', 'top'];
w.margins = 8; w.spacing = 5;

var tabs = w.add('tabbedpanel');
tabs.alignChildren = ['fill', 'fill']; tabs.margins = 0;

var tabFX   = tabs.add('tab', undefined, 'FX');
tabFX.orientation = 'column'; tabFX.alignChildren = ['fill', 'top'];
tabFX.margins = [4, 8, 4, 4]; tabFX.spacing = 5;

var tabTrix = tabs.add('tab', undefined, 'TRI-X');
tabTrix.orientation = 'column'; tabTrix.alignChildren = ['fill', 'top'];
tabTrix.margins = [4, 8, 4, 4]; tabTrix.spacing = 4;

var tabGrades = tabs.add('tab', undefined, 'GRADES');
tabGrades.orientation = 'column'; tabGrades.alignChildren = ['fill', 'top'];
tabGrades.margins = [4, 8, 4, 4]; tabGrades.spacing = 5;

tabs.selection = tabFX;

function sec(p, t) {
    var panel = p.add('panel', undefined, t);
    panel.orientation = 'column'; panel.alignChildren = ['fill', 'top'];
    panel.margins = [6, 14, 6, 8]; panel.spacing = 4;
    return panel;
}

// All buttons use sched() — dialog closes briefly, action runs outside modal, dialog reopens.
// This is required for PS 27 modal state compatibility.
function brow(p, items) {
    var g = p.add('group'); g.orientation = 'row';
    g.alignChildren = ['fill', 'center']; g.spacing = 4; g.margins = 0;
    for (var i = 0; i < items.length; i++) {
        (function(lbl, fn) {
            var b = g.add('button', undefined, lbl);
            b.preferredSize.height = 24;
            b.onClick = function() { sched(fn); };
        })(items[i][0], items[i][1]);
    }
}

function mkSld(p, lbl, mn, mx, def) {
    var row = p.add('group'); row.orientation = 'row';
    row.alignChildren = ['left', 'center']; row.spacing = 5; row.margins = 0;
    var l   = row.add('statictext', undefined, lbl); l.preferredSize = [62, 16];
    var sld = row.add('slider', undefined, def, mn, mx); sld.preferredSize = [110, 16];
    var txt = row.add('edittext', undefined, String(Math.round(def)));
    txt.preferredSize = [34, 18]; txt.justify = 'right';
    sld.onChanging = function() { txt.text = String(Math.round(sld.value)); };
    txt.onChange   = function() {
        var n = parseFloat(txt.text);
        if (!isNaN(n)) sld.value = Math.max(mn, Math.min(mx, n));
    };
    return sld;
}

// ── FX TAB ───────────────────────────────────────────────────
var s1 = sec(tabFX, 'TONALITY & CONTRAST');
brow(s1, [['CRUSHED NOIR', crushedNoir], ['XEROX SCAN', xeroxScan]]);

var s2 = sec(tabFX, 'COLOR GRADING');
brow(s2, [['SILVER GELATIN', silverGelatin], ['TOXIC CYAN', toxicCyan]]);
brow(s2, [['LAVENDER', doLavender]]);

var s3 = sec(tabFX, 'TEXTURE & DEGRADATION');
var grainSld = mkSld(s3, 'GRAIN', 0, 100, 40);
var gRow = s3.add('group');
gRow.orientation = 'row'; gRow.alignChildren = ['fill', 'center'];
var agb = gRow.add('button', undefined, 'APPLY GRAIN');
agb.preferredSize.height = 24;
agb.onClick = function() { sched(function() { doGrain(Math.round(grainSld.value)); }); };
brow(s3, [['CCTV PIXELATE', cctvPixelate], ['UNSHARP ARTIFACTS', unsharpArtifacts]]);

var s4 = sec(tabFX, 'OPTICS & MOTION');
brow(s4, [['DIRECT FLASH', directFlash], ['SHUTTER DRAG', shutterDrag]]);
brow(s4, [['RGB SPLIT', rgbSplit],       ['SOLARIZE THERMAL', solarizeThermal]]);

// ── GRADES TAB ───────────────────────────────────────────────
var g1 = sec(tabGrades, 'B&W GRADES');
brow(g1, [['MOONLIGHT', moonlight], ['CYANOTYPE', cyanotype]]);

var g2 = sec(tabGrades, 'COLOR GRADES');
brow(g2, [['FADED PRINT', fadedPrint], ['REDSCALE', redscale]]);
brow(g2, [['LAVENDER', doLavender]]);

var g3 = sec(tabGrades, 'CINEMATIC');
brow(g3, [['BLEACH BYPASS', bleachBypass], ['HALATION', halation]]);

// ── TRI-X TAB ────────────────────────────────────────────────
var gS = sec(tabTrix, 'GRAIN');
var atGrain   = mkSld(gS, 'GRAIN',      0, 100, 70);
var atGrainSz = mkSld(gS, 'GRAIN SIZE', 0, 100, 45);

var tS = sec(tabTrix, 'TONE');
var atBlacks  = mkSld(tS, 'BLACKS',     0,  100, 60);
var atHighlts = mkSld(tS, 'HIGHLIGHTS', 0,  100, 65);
var atMids    = mkSld(tS, 'MIDTONES', -50,   50,  8);

var oS = sec(tabTrix, 'OPTICS');
var atSoft = mkSld(oS, 'SOFTNESS',  0, 100, 25);
var atWarm = mkSld(oS, 'WARMTH',    0, 100, 15);
var atVig  = mkSld(oS, 'VIGNETTE',  0, 100, 25);

var cS = sec(tabTrix, 'B&W CHANNEL MIX');
var atReds = mkSld(cS, 'REDS',    -200, 200, 45);
var atYels = mkSld(cS, 'YELLOWS', -200, 200, 50);
var atGrns = mkSld(cS, 'GREENS',  -200, 200, 30);
var atBlus = mkSld(cS, 'BLUES',   -200, 200, 15);

var applyBtn = tabTrix.add('button', undefined, '>>> TRI-X <<<');
applyBtn.alignment = ['fill', 'top']; applyBtn.preferredSize.height = 30;
applyBtn.onClick = function() {
    var v = [
        Math.round(atGrain.value),  Math.round(atGrainSz.value),
        Math.round(atBlacks.value), Math.round(atHighlts.value), Math.round(atMids.value),
        Math.round(atSoft.value),   Math.round(atWarm.value),    Math.round(atVig.value),
        Math.round(atReds.value),   Math.round(atYels.value),    Math.round(atGrns.value),
        Math.round(atBlus.value)
    ];
    sched(function() {
        doAusTaylor(v[0],v[1],v[2],v[3],v[4],v[5],v[6],v[7],v[8],v[9],v[10],v[11]);
    });
};

var closeBtn = w.add('button', undefined, 'Close Panel');
closeBtn.alignment = ['fill', 'bottom'];
closeBtn.onClick = function() { closeForGood = true; w.close(); };

// ── MAIN LOOP ────────────────────────────────────────────────
// НЕ проверяем return value w.show() — в PS оно ненадёжно.
// sched() → pendingFn + w.close() → show() возвращает → запускаем fn вне modal
// closeForGood → True: выходим
while (true) {
    pendingFn = null;
    w.show();
    if (closeForGood) break;
    if (pendingFn) {
        try { pendingFn(); }
        catch(e) { alert("ERR: " + e.message); }
    }
}
