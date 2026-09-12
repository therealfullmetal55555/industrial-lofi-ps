// ============================================================
// Industrial Lo-Fi — Photoshop CEP Panel  v1.0
// All adjustable values marked with [TUNE]
// ============================================================

// ── Guard: check active document ────────────────────────────
function checkDoc() {
    if (!app.documents.length) return "ERR: No document open";
    if (!app.activeDocument.activeLayer) return "ERR: No active layer";
    return null;
}

// ── Shorthand aliases ────────────────────────────────────────
var c = charIDToTypeID;
var s = stringIDToTypeID;

// ────────────────────────────────────────────────────────────
// HELPER: Create Curves Adjustment Layer
// points: [[inputBlack,outputBlack], [x,y], ... [255,255]]
// ────────────────────────────────────────────────────────────
function addCurvesLayer(name, points) {
    var desc1 = new ActionDescriptor();
    var ref1  = new ActionReference();
    ref1.putClass(c("AdjL"));
    desc1.putReference(c("null"), ref1);

    var desc2 = new ActionDescriptor();
    desc2.putClass(c("Type"), c("Crv "));

    var adjList = new ActionList();
    var crvDesc = new ActionDescriptor();
    var chnRef  = new ActionReference();
    chnRef.putEnumerated(c("Chnl"), c("Chnl"), c("Cmps")); // composite RGB
    crvDesc.putReference(c("Chnl"), chnRef);

    var ptList = new ActionList();
    for (var i = 0; i < points.length; i++) {
        var ptDesc = new ActionDescriptor();
        ptDesc.putDouble(c("Hrzn"), points[i][0]); // input  0-255
        ptDesc.putDouble(c("Vrtc"), points[i][1]); // output 0-255
        ptList.putObject(c("Pnt "), ptDesc);
    }
    crvDesc.putList(c("Crv "), ptList);
    adjList.putObject(c("CrvA"), crvDesc);
    desc2.putList(c("Adjs"), adjList);
    desc1.putObject(c("Usng"), c("AdjL"), desc2);

    executeAction(c("Mk  "), desc1, DialogModes.NO);
    app.activeDocument.activeLayer.name = name;
}

// ────────────────────────────────────────────────────────────
// HELPER: Add layer mask (reveal-all or hide-all)
// ────────────────────────────────────────────────────────────
function addLayerMask(revealAll) {
    var desc = new ActionDescriptor();
    desc.putEnumerated(
        c("Usng"), c("UsrM"),
        revealAll ? c("RvlA") : c("HdAl")
    );
    executeAction(c("AddMsk"), desc, DialogModes.NO);
}

// ────────────────────────────────────────────────────────────
// HELPER: Elliptical selection with feather
// ────────────────────────────────────────────────────────────
function makeEllipticalSelection(left, top, right, bottom, feather) {
    var desc = new ActionDescriptor();
    desc.putEnumerated(c("Styl"), c("Styl"), c("Nrml"));
    desc.putUnitDouble(c("Ftr "), c("#Pxl"), feather);
    desc.putBoolean(c("AntA"), true);
    var bnd = new ActionDescriptor();
    bnd.putUnitDouble(c("Top "), c("#Pxl"), top);
    bnd.putUnitDouble(c("Left"), c("#Pxl"), left);
    bnd.putUnitDouble(c("Btom"), c("#Pxl"), bottom);
    bnd.putUnitDouble(c("Rght"), c("#Pxl"), right);
    desc.putObject(c("Bnd "), c("Rctn"), bnd);
    executeAction(c("MrqE"), desc, DialogModes.NO);
}

// ────────────────────────────────────────────────────────────
// HELPER: Fill current selection/layer with solid color
// ────────────────────────────────────────────────────────────
function fillWithColor(r, g, b) {
    var saved = app.foregroundColor.clone();
    var col = new SolidColor();
    col.rgb.red = r; col.rgb.green = g; col.rgb.blue = b;
    app.foregroundColor = col;
    var desc = new ActionDescriptor();
    desc.putEnumerated(c("Usng"), c("FlCn"), c("FrgC")); // Foreground Color
    desc.putUnitDouble(c("Opct"), c("#Prc"), 100);
    desc.putEnumerated(c("Md  "), c("BlnM"), c("Nrml"));
    desc.putBoolean(c("Prsv"), false);
    executeAction(c("Fl  "), desc, DialogModes.NO);
    app.foregroundColor = saved;
}

// ────────────────────────────────────────────────────────────
// HELPER: Stamp visible layers to a new layer on top
// ────────────────────────────────────────────────────────────
function stampVisible() {
    var desc = new ActionDescriptor();
    desc.putBoolean(c("Dplc"), true);
    executeAction(c("MrgV"), desc, DialogModes.NO);
}

// ────────────────────────────────────────────────────────────
// 1. CRUSHED NOIR
// Aggressive S-curve: blacks crushed to 0, highlights pushed
// [TUNE] Adjust curve points for more/less contrast
// ────────────────────────────────────────────────────────────
function crushedNoir() {
    var err = checkDoc(); if (err) return err;
    try {
        addCurvesLayer("Crushed Noir", [
            [0,   0  ],   // black → absolute zero
            [30,  0  ],   // crush dark shadows completely
            [80,  40 ],   // dark midtones stay low
            [128, 148],   // midpoint pushed up [TUNE: raise for brighter mids]
            [200, 230],   // highlights pushed high
            [255, 255]    // white stays white
        ]);
        return "Crushed Noir applied";
    } catch(e) { return "ERR: " + e.message; }
}

// ────────────────────────────────────────────────────────────
// 2. XEROX SCAN
// Lifted blacks + compressed whites = faded photocopy look
// [TUNE] Change 35/220 for more/less fade intensity
// ────────────────────────────────────────────────────────────
function xeroxScan() {
    var err = checkDoc(); if (err) return err;
    try {
        addCurvesLayer("Xerox Scan", [
            [0,   35 ],   // black point lifted [TUNE: 25-50]
            [128, 128],   // midtones untouched
            [255, 220]    // white point compressed [TUNE: 200-240]
        ]);
        return "Xerox Scan applied";
    } catch(e) { return "ERR: " + e.message; }
}

// ────────────────────────────────────────────────────────────
// 3. SILVER GELATIN
// Black & White adj layer + Gradient Map charcoal→silver-cream
// [TUNE] darkHex / lightHex for different silver tone
// ────────────────────────────────────────────────────────────
function silverGelatin() {
    var err = checkDoc(); if (err) return err;
    try {
        // — B&W Adjustment Layer —
        var bwDesc1 = new ActionDescriptor();
        var bwRef   = new ActionReference();
        bwRef.putClass(c("AdjL"));
        bwDesc1.putReference(c("null"), bwRef);
        var bwDesc2 = new ActionDescriptor();
        bwDesc2.putClass(c("Type"), s("blackAndWhiteLayer"));
        var bwList  = new ActionList();
        var bwAdj   = new ActionDescriptor();
        bwAdj.putDouble(s("reds"),     40); // [TUNE]
        bwAdj.putDouble(s("yellows"),  60);
        bwAdj.putDouble(s("greens"),   40);
        bwAdj.putDouble(s("cyans"),    60);
        bwAdj.putDouble(s("blues"),    20);
        bwAdj.putDouble(s("magentas"), 80);
        bwAdj.putBoolean(s("useTint"), false);
        bwList.putObject(s("blackAndWhiteLayer"), bwAdj);
        bwDesc2.putList(c("Adjs"), bwList);
        bwDesc1.putObject(c("Usng"), c("AdjL"), bwDesc2);
        executeAction(c("Mk  "), bwDesc1, DialogModes.NO);
        app.activeDocument.activeLayer.name = "BW — Silver Gelatin";

        // — Gradient Map: charcoal #0F0F11 → silver-cream #E6E4DF —
        // [TUNE] Change color values below
        var darkR = 15,  darkG = 15,  darkB = 17;  // #0F0F11
        var ltR   = 230, ltG   = 228, ltB   = 223; // #E6E4DF

        var gmDesc1 = new ActionDescriptor();
        var gmRef   = new ActionReference();
        gmRef.putClass(c("AdjL"));
        gmDesc1.putReference(c("null"), gmRef);

        var gmDesc2 = new ActionDescriptor();
        gmDesc2.putClass(c("Type"), s("gradientMapLayer"));

        var gmList  = new ActionList();
        var gmAdj   = new ActionDescriptor();

        // Build gradient descriptor
        var grad = new ActionDescriptor();
        grad.putEnumerated(c("GrdF"), c("GrdF"), c("CstS")); // custom stops
        grad.putDouble(c("Intr"), 4096);
        grad.putString(c("Nm  "), "Silver Gelatin");

        // Color stops
        var clrStops = new ActionList();
        function makeColorStop(r, g, b, loc) {
            var st = new ActionDescriptor();
            var cl = new ActionDescriptor();
            cl.putDouble(c("Rd  "), r);
            cl.putDouble(c("Grn "), g);
            cl.putDouble(c("Bl  "), b);
            st.putObject(c("Clr "), c("RGBC"), cl);
            st.putEnumerated(c("Type"), c("Clry"), c("UsrS"));
            st.putInteger(c("Lctn"), loc);
            st.putInteger(c("Mdpn"), 50);
            return st;
        }
        clrStops.putObject(c("Clrt"), makeColorStop(darkR, darkG, darkB, 0));
        clrStops.putObject(c("Clrt"), makeColorStop(ltR,   ltG,   ltB,   4096));
        grad.putList(c("Clrs"), clrStops);

        // Transparency stops (both 100%)
        var trStops = new ActionList();
        function makeTrStop(loc) {
            var st = new ActionDescriptor();
            st.putUnitDouble(c("Opct"), c("#Prc"), 100);
            st.putInteger(c("Lctn"), loc);
            st.putInteger(c("Mdpn"), 50);
            return st;
        }
        trStops.putObject(c("TrnS"), makeTrStop(0));
        trStops.putObject(c("TrnS"), makeTrStop(4096));
        grad.putList(c("Trns"), trStops);

        gmAdj.putObject(c("Grad"), c("Grdn"), grad);
        gmAdj.putBoolean(c("Rvrs"), false);
        gmAdj.putBoolean(c("Dthr"), false);
        gmList.putObject(s("gradientMapLayer"), gmAdj);
        gmDesc2.putList(c("Adjs"), gmList);
        gmDesc1.putObject(c("Usng"), c("AdjL"), gmDesc2);
        executeAction(c("Mk  "), gmDesc1, DialogModes.NO);
        app.activeDocument.activeLayer.name = "Gradient Map — Silver";

        return "Silver Gelatin applied";
    } catch(e) { return "ERR: " + e.message; }
}

// ────────────────────────────────────────────────────────────
// 4. TOXIC CYAN
// Color Balance: Shadows Cyan+Green, Highlights Yellow
// [TUNE] values in the arrays: [cyan↔red, magenta↔green, yellow↔blue]
// ────────────────────────────────────────────────────────────
function toxicCyan() {
    var err = checkDoc(); if (err) return err;
    try {
        var desc1 = new ActionDescriptor();
        var ref1  = new ActionReference();
        ref1.putClass(c("AdjL"));
        desc1.putReference(c("null"), ref1);

        var desc2 = new ActionDescriptor();
        desc2.putClass(c("Type"), s("colorBalanceLayer"));

        var adjList = new ActionList();
        var cbAdj   = new ActionDescriptor();

        function makeBalanceList(cr, mg, yb) { // values -100 to +100
            var lst = new ActionList();
            lst.putDouble(cr); lst.putDouble(mg); lst.putDouble(yb);
            return lst;
        }
        // [TUNE] Shadows: -8 cyan (+8 toward cyan), +5 green
        cbAdj.putList(c("Shds"), makeBalanceList(-8, 5, 0));
        cbAdj.putBoolean(s("shadowPreserveLuminosity"), true);
        // Midtones: neutral
        cbAdj.putList(c("Mdtn"), makeBalanceList(0, 2, 0));
        cbAdj.putBoolean(s("midtonePreserveLuminosity"), true);
        // [TUNE] Highlights: +5 toward yellow = -5 on yellow↔blue
        cbAdj.putList(c("Hghl"), makeBalanceList(0, 0, -5));
        cbAdj.putBoolean(s("highlightPreserveLuminosity"), true);

        adjList.putObject(s("colorBalanceLayer"), cbAdj);
        desc2.putList(c("Adjs"), adjList);
        desc1.putObject(c("Usng"), c("AdjL"), desc2);
        executeAction(c("Mk  "), desc1, DialogModes.NO);
        app.activeDocument.activeLayer.name = "Toxic Cyan";

        return "Toxic Cyan applied";
    } catch(e) { return "ERR: " + e.message; }
}

// ────────────────────────────────────────────────────────────
// 5. GRAIN
// Stamps visible layers, applies Add Noise (Gaussian, mono)
// intensity 0-100 → mapped to noise amount 0-50%
// [TUNE] maxNoise controls the upper noise limit
// ────────────────────────────────────────────────────────────
function applyGrain(intensity) {
    var err = checkDoc(); if (err) return err;
    try {
        var maxNoise = 50; // [TUNE] max noise % at slider=100
        var amount   = (intensity / 100) * maxNoise;
        if (amount < 0.5) return "Grain: move slider above 0";

        // Stamp visible to new layer
        stampVisible();
        app.activeDocument.activeLayer.name = "GRAIN — Stamped";

        // Add Noise: Gaussian, Monochromatic
        var desc = new ActionDescriptor();
        desc.putDouble(c("Amnt"), amount);
        desc.putEnumerated(c("Dstr"), c("Dstr"), c("Gsn ")); // Gaussian [TUNE: c("Unfr") = Uniform]
        desc.putBoolean(c("Mnch"), true); // monochromatic [TUNE: false = color noise]
        executeAction(c("AdNs"), desc, DialogModes.NO);

        return "Grain " + Math.round(amount) + "% applied";
    } catch(e) { return "ERR: " + e.message; }
}

// ────────────────────────────────────────────────────────────
// 6. CCTV PIXELATE
// Duplicate → scale to 25% (Nearest Neighbor) → scale back to 100%
// [TUNE] pixelFactor: 0.25 = 4×4 block, 0.1 = 10×10 block
// ────────────────────────────────────────────────────────────
function cctvPixelate() {
    var err = checkDoc(); if (err) return err;
    try {
        var doc        = app.activeDocument;
        var pixelFactor = 0.25; // [TUNE] 0.25 = 25% resize = 4px blocks
        var origInterp = app.preferences.interpolation;

        // Duplicate active layer (non-destructive)
        var dup = doc.activeLayer.duplicate();
        dup.name = "CCTV Pixelate";
        doc.activeLayer = dup;

        // Rasterize if smart object so resize works
        try { dup.rasterize(RasterizeType.ENTIRELAYER); } catch(e) {}

        // Set interpolation to Nearest Neighbor
        app.preferences.interpolation = ResampleMethod.NEARESTNEIGHBOR;

        // Scale down to pixelFactor%
        dup.resize(pixelFactor * 100, pixelFactor * 100, AnchorPosition.MIDDLECENTER);
        // Scale back up
        dup.resize((1 / pixelFactor) * 100, (1 / pixelFactor) * 100, AnchorPosition.MIDDLECENTER);

        // Restore interpolation
        app.preferences.interpolation = origInterp;

        return "CCTV Pixelate applied";
    } catch(e) { return "ERR: " + e.message; }
}

// ────────────────────────────────────────────────────────────
// 7. UNSHARP ARTIFACTS
// Extreme Unsharp Mask: pulls out digital haloing + edge noise
// [TUNE] amount, radius, threshold
// ────────────────────────────────────────────────────────────
function unsharpArtifacts() {
    var err = checkDoc(); if (err) return err;
    try {
        var doc = app.activeDocument;
        // Duplicate for non-destructive
        var dup = doc.activeLayer.duplicate();
        dup.name = "Unsharp Artifacts";
        doc.activeLayer = dup;
        try { dup.rasterize(RasterizeType.ENTIRELAYER); } catch(e) {}

        var desc = new ActionDescriptor();
        desc.putUnitDouble(c("Amnt"), c("#Prc"), 300); // [TUNE] 300% amount
        desc.putUnitDouble(c("Rds "), c("#Pxl"), 4.0); // [TUNE] 4px radius
        desc.putInteger(c("Thsh"), 0);                 // [TUNE] 0 threshold = catch everything
        executeAction(c("UnsM"), desc, DialogModes.NO);

        return "Unsharp Artifacts applied";
    } catch(e) { return "ERR: " + e.message; }
}

// ────────────────────────────────────────────────────────────
// 8. DIRECT FLASH
// Exposure adj layer (+1.5 stop) with center-reveal radial mask
// [TUNE] exposure, offset, featherRatio
// ────────────────────────────────────────────────────────────
function directFlash() {
    var err = checkDoc(); if (err) return err;
    try {
        var doc = app.activeDocument;
        var W   = doc.width.as("px");
        var H   = doc.height.as("px");

        // — Add Exposure adjustment layer —
        var expDesc1 = new ActionDescriptor();
        var expRef   = new ActionReference();
        expRef.putClass(c("AdjL"));
        expDesc1.putReference(c("null"), expRef);
        var expDesc2 = new ActionDescriptor();
        expDesc2.putClass(c("Type"), s("exposureLayer"));
        var expList  = new ActionList();
        var expAdj   = new ActionDescriptor();
        expAdj.putDouble(s("exposure"), 1.5);   // [TUNE] +1.5 stop overexposure
        expAdj.putDouble(s("offset"),   0.02);  // [TUNE] +0.02 offset
        expAdj.putDouble(s("gammaCorrection"), 1.0);
        expList.putObject(s("exposureLayer"), expAdj);
        expDesc2.putList(c("Adjs"), expList);
        expDesc1.putObject(c("Usng"), c("AdjL"), expDesc2);
        executeAction(c("Mk  "), expDesc1, DialogModes.NO);
        app.activeDocument.activeLayer.name = "Direct Flash";

        // — Add hide-all mask then paint white center —
        addLayerMask(false); // black mask (hide all)

        // — Feathered elliptical selection: center 80% of frame —
        var padX    = W * 0.10; // [TUNE] 0.10 = 10% padding from edges
        var padY    = H * 0.10;
        var feather = W * 0.22; // [TUNE] 0.22 = heavy feather for soft rolloff
        makeEllipticalSelection(padX, padY, W - padX, H - padY, feather);

        // — Fill selection with white on the mask —
        fillWithColor(255, 255, 255);

        doc.selection.deselect();
        return "Direct Flash applied";
    } catch(e) { return "ERR: " + e.message; }
}

// ────────────────────────────────────────────────────────────
// 9. SHUTTER DRAG
// Duplicate → Motion Blur 60px/15° → Screen blend @ 50% opacity
// [TUNE] blurDistance, blurAngle, blendOpacity
// ────────────────────────────────────────────────────────────
function shutterDrag() {
    var err = checkDoc(); if (err) return err;
    try {
        var doc = app.activeDocument;
        var dup = doc.activeLayer.duplicate();
        dup.name = "Shutter Drag";
        doc.activeLayer = dup;
        try { dup.rasterize(RasterizeType.ENTIRELAYER); } catch(e) {}

        // Motion Blur
        var desc = new ActionDescriptor();
        desc.putEnumerated(c("Md  "), c("BlrM"), c("Mtn")); // Motion mode
        desc.putDouble(c("Angl"), 15);                       // [TUNE] 15° angle
        desc.putUnitDouble(c("Dstn"), c("#Pxl"), 60);        // [TUNE] 60px distance
        executeAction(s("motionBlur"), desc, DialogModes.NO);

        // Screen blend @ 50%
        dup.blendMode = BlendMode.SCREEN; // [TUNE: LIGHTEN for subtler result]
        dup.opacity   = 50;               // [TUNE] 50% opacity

        return "Shutter Drag applied";
    } catch(e) { return "ERR: " + e.message; }
}

// ────────────────────────────────────────────────────────────
// 10. RGB SPLIT (Chromatic Aberration)
// Red copy shifted right (+Screen), Blue copy shifted left (+Screen)
// [TUNE] offsetPx, tintStrength
// ────────────────────────────────────────────────────────────
function rgbSplit() {
    var err = checkDoc(); if (err) return err;
    try {
        var doc       = app.activeDocument;
        var src       = doc.activeLayer;
        var offsetPx  = 6; // [TUNE] pixel offset for each channel

        // — Red copy: shifted right, warm tint —
        var redLayer = src.duplicate();
        redLayer.name = "CA — Red";
        doc.activeLayer = redLayer;
        redLayer.translate(offsetPx, 0);
        // Destructive Color Balance: push toward red (cyan↔red = +40)
        var rdDesc = new ActionDescriptor();
        var rdAdj  = new ActionDescriptor();
        rdAdj.putList(c("Shds"), (function(){ var l=new ActionList(); l.putDouble(40); l.putDouble(0); l.putDouble(-15); return l; })());
        rdAdj.putList(c("Mdtn"), (function(){ var l=new ActionList(); l.putDouble(30); l.putDouble(0); l.putDouble(-10); return l; })());
        rdAdj.putList(c("Hghl"), (function(){ var l=new ActionList(); l.putDouble(20); l.putDouble(0); l.putDouble(0);   return l; })());
        rdAdj.putBoolean(c("PrsL"), true);
        rdDesc.putObject(c("Usng"), c("ClrB"), rdAdj);
        executeAction(c("ClrB"), rdDesc, DialogModes.NO);
        redLayer.blendMode = BlendMode.SCREEN;
        redLayer.opacity   = 75; // [TUNE]

        // — Blue/Cyan copy: shifted left, cool tint —
        var blueLayer = src.duplicate();
        blueLayer.name = "CA — Blue";
        blueLayer.moveBelow(src);
        doc.activeLayer = blueLayer;
        blueLayer.translate(-offsetPx, 0);
        // Destructive Color Balance: push toward cyan/blue
        var blDesc = new ActionDescriptor();
        var blAdj  = new ActionDescriptor();
        blAdj.putList(c("Shds"), (function(){ var l=new ActionList(); l.putDouble(-35); l.putDouble(0); l.putDouble(20); return l; })());
        blAdj.putList(c("Mdtn"), (function(){ var l=new ActionList(); l.putDouble(-25); l.putDouble(0); l.putDouble(15); return l; })());
        blAdj.putList(c("Hghl"), (function(){ var l=new ActionList(); l.putDouble(-15); l.putDouble(0); l.putDouble(10); return l; })());
        blAdj.putBoolean(c("PrsL"), true);
        blDesc.putObject(c("Usng"), c("ClrB"), blAdj);
        executeAction(c("ClrB"), blDesc, DialogModes.NO);
        blueLayer.blendMode = BlendMode.SCREEN;
        blueLayer.opacity   = 75; // [TUNE]

        doc.activeLayer = src;
        return "RGB Split applied (" + offsetPx + "px offset)";
    } catch(e) { return "ERR: " + e.message; }
}

// ────────────────────────────────────────────────────────────
// 11. SOLARIZE THERMAL
// Curves with W-shape oscillation = metallic pseudo-thermal inversion
// [TUNE] Adjust point values for more/less dramatic solarization
// ────────────────────────────────────────────────────────────
function solarizeThermal() {
    var err = checkDoc(); if (err) return err;
    try {
        addCurvesLayer("Solarize Thermal", [
            [0,   0  ],   // blacks stay
            [45,  210],   // [TUNE] first inversion peak
            [100, 20 ],   // [TUNE] valley — midtones crushed
            [155, 220],   // [TUNE] second peak
            [210, 50 ],   // [TUNE] second valley
            [255, 255]    // highlights preserved
        ]);
        return "Solarize Thermal applied";
    } catch(e) { return "ERR: " + e.message; }
}


// ============================================================
// AUS TAYLOR / TRI-X  — полный пресет с параметрическим контролем
// Референс: Daido Moriyama / Aus Taylor / Alonzo Hellerbach
// Kodak Tri-X 400 pushed to 3200 simulation
// ============================================================

// ── helper: Gaussian Blur на активный слой ──────────────────
function applyGaussianBlur(radius) {
    if (radius < 0.05) return;
    var desc = new ActionDescriptor();
    desc.putUnitDouble(c("Rds "), c("#Pxl"), radius);
    executeAction(s("gaussianBlur"), desc, DialogModes.NO);
}

// ── helper: выбрать mask channel активного слоя ─────────────
function activateLayerMask() {
    var desc = new ActionDescriptor();
    var ref  = new ActionReference();
    ref.putEnumerated(c("Chnl"), c("Chnl"), c("Msk "));
    desc.putReference(c("null"), ref);
    desc.putBoolean(c("MkVs"), false);
    executeAction(c("slct"), desc, DialogModes.NO);
}

// ── 1. B&W с Tri-X channel mix ──────────────────────────────
// reds/yellows/greens/blues — прямо с UI слайдеров
function addBWTriX(reds, yellows, greens, blues) {
    var desc1 = new ActionDescriptor();
    var ref1  = new ActionReference();
    ref1.putClass(c("AdjL"));
    desc1.putReference(c("null"), ref1);

    var desc2 = new ActionDescriptor();
    desc2.putClass(c("Type"), s("blackAndWhiteLayer"));

    var adjList = new ActionList();
    var bwAdj   = new ActionDescriptor();
    // Tri-X тональный ответ: reds чуть ярче (кожа), blues темнее (небо)
    bwAdj.putDouble(s("reds"),     parseFloat(reds)    || 45);
    bwAdj.putDouble(s("yellows"),  parseFloat(yellows) || 50);
    bwAdj.putDouble(s("greens"),   parseFloat(greens)  || 30);
    bwAdj.putDouble(s("cyans"),    40);
    bwAdj.putDouble(s("blues"),    parseFloat(blues)   || 15);
    bwAdj.putDouble(s("magentas"), 60);
    bwAdj.putBoolean(s("useTint"), false);
    adjList.putObject(s("blackAndWhiteLayer"), bwAdj);
    desc2.putList(c("Adjs"), adjList);
    desc1.putObject(c("Usng"), c("AdjL"), desc2);
    executeAction(c("Mk  "), desc1, DialogModes.NO);
    app.activeDocument.activeLayer.name = "B&W — Tri-X";
}

// ── 2. Параметрические кривые ───────────────────────────────
// blacksVal 0-100: сила crush теней
// highlightsVal 0-100: сила выбивания хайлайтов (direct flash)
// midsVal -50..+50: сдвиг midtone gamma
function addTriXCurves(blacksVal, highlightsVal, midsVal) {
    var bv = parseFloat(blacksVal)    || 0;   // 0-100
    var hv = parseFloat(highlightsVal)|| 0;   // 0-100
    var mv = parseFloat(midsVal)      || 0;   // -50..50

    // Тени: насколько глубоко давим чёрные
    // bv=0: [40,38] почти линейно   bv=100: [40,2] Daido-black
    var shadow40out = Math.round(38 - (bv / 100) * 36);  // 38 → 2
    var shadow20out = Math.round(18 - (bv / 100) * 17);  // 18 → 1

    // Midtone gamma: mv положительный = ярче, отрицательный = темнее
    var mid128out = Math.round(128 + (mv / 50) * 25);    // 103..153

    // Highlights: где начинается clip в белый
    // hv=0: почти нет blow   hv=100: clip начинается с ~185
    var hClipIn  = Math.round(255 - (hv / 100) * 70);   // 255 → 185
    var hMidIn   = Math.round(hClipIn - 30);             // начало подъёма

    var points = [
        [0,         0           ],  // абсолютный чёрный
        [20,        shadow20out ],  // дальние тени
        [40,        shadow40out ],  // ближние тени
        [128,       mid128out   ],  // midtones (gamma)
        [hMidIn,    Math.min(240, mid128out + 60)], // разгон к highlight
        [hClipIn,   255         ],  // точка clip → белый
        [255,       255         ]
    ];

    addCurvesLayer("Tri-X Curve", points);
}

// ── 3. Cream/silver gelatin warmth ──────────────────────────
// warmthVal 0-100 → Color Balance highlights: лёгкий кремовый оттенок
function addSilverWarmth(warmthVal) {
    var wv = parseFloat(warmthVal) || 0;
    if (wv < 1) return;

    // highlights Yellow (negative = тёплый)   midtones чуть теплее
    var hlYellow = -Math.round(wv * 0.12);   // 0 → -12 max
    var mdYellow = -Math.round(wv * 0.05);   // 0 → -5 max

    var desc1 = new ActionDescriptor();
    var ref1  = new ActionReference();
    ref1.putClass(c("AdjL"));
    desc1.putReference(c("null"), ref1);
    var desc2 = new ActionDescriptor();
    desc2.putClass(c("Type"), s("colorBalanceLayer"));
    var adjList = new ActionList();
    var cbAdj   = new ActionDescriptor();

    function makeList(cr, mg, yb) {
        var l = new ActionList();
        l.putDouble(cr); l.putDouble(mg); l.putDouble(yb);
        return l;
    }
    cbAdj.putList(c("Shds"), makeList(0,  0,  0));
    cbAdj.putBoolean(s("shadowPreserveLuminosity"), true);
    cbAdj.putList(c("Mdtn"), makeList(0,  0,  mdYellow));
    cbAdj.putBoolean(s("midtonePreserveLuminosity"), true);
    cbAdj.putList(c("Hghl"), makeList(0,  0,  hlYellow));
    cbAdj.putBoolean(s("highlightPreserveLuminosity"), true);
    adjList.putObject(s("colorBalanceLayer"), cbAdj);
    desc2.putList(c("Adjs"), adjList);
    desc1.putObject(c("Usng"), c("AdjL"), desc2);
    executeAction(c("Mk  "), desc1, DialogModes.NO);
    app.activeDocument.activeLayer.name = "Silver Warmth";
}

// ── 4. Grain stack ──────────────────────────────────────────
// grainAmt 0-100  → noise amount (max 45%)
// grainSize 0-100 → post-blur radius 0-1.5px (chunky clumps)
// softness 0-100  → pre-blur radius 0-2px (Daido softness)
function addTriXGrain(grainAmt, grainSize, softness) {
    var ga = parseFloat(grainAmt)  || 0;
    var gs = parseFloat(grainSize) || 0;
    var sf = parseFloat(softness)  || 0;
    if (ga < 1) return;

    // Stamp видимых слоёв в новый слой
    stampVisible();
    var grainLayer = app.activeDocument.activeLayer;
    grainLayer.name = "GRAIN — Tri-X";

    // Softness: размытость базового изображения (Daido «are, bure, boke»)
    var preBluR = (sf / 100) * 2.0;   // 0 → 2.0px
    if (preBluR > 0.05) applyGaussianBlur(preBluR);

    // Add Noise — Gaussian, monochromatic
    var noiseAmt = (ga / 100) * 45;   // 0 → 45%
    var desc = new ActionDescriptor();
    desc.putDouble(c("Amnt"), noiseAmt);
    desc.putEnumerated(c("Dstr"), c("Dstr"), c("Gsn "));
    desc.putBoolean(c("Mnch"), true);
    executeAction(c("AdNs"), desc, DialogModes.NO);

    // Post-blur: кластеризует зёрна в крупные серебристые кластеры
    // Это ключ к разнице между «цифровым шумом» и «плёночным зерном»
    var postBlur = (gs / 100) * 1.5;  // 0 → 1.5px
    if (postBlur > 0.05) applyGaussianBlur(postBlur);
}

// ── 5. Vignette ─────────────────────────────────────────────
// opacity 0-100: сила виньетки
// Создаёт чёрный слой в Multiply + маска с белыми краями
function addVignetteLayer(opacity, W, H) {
    var op = parseFloat(opacity) || 0;
    if (op < 1) return;
    var doc = app.activeDocument;

    // Создаём новый слой и заливаем чёрным
    var vigLayer = doc.artLayers.add();
    vigLayer.name = "Vignette";
    vigLayer.moveToBeginning();
    doc.selection.selectAll();
    fillWithColor(0, 0, 0);
    doc.selection.deselect();
    vigLayer.blendMode = BlendMode.MULTIPLY;
    vigLayer.opacity   = op;

    // Маска: reveal all (белая) — все углы активны (темнят)
    addLayerMask(true);
    activateLayerMask();

    // Выбираем центр (сильный feather) → заливаем чёрным на маске
    // Центр маски = чёрный → не темнит. Края = белые → темнят.
    var feather = Math.min(W, H) * 0.38;   // [TUNE] тяжёлый feather
    var padX = W * 0.04;
    var padY = H * 0.04;
    makeEllipticalSelection(padX, padY, W - padX, H - padY, feather);
    fillWithColor(0, 0, 0);
    doc.selection.deselect();
}

// ── MASTER: applyAusTaylor ───────────────────────────────────
function applyAusTaylor(grain, grainSize, blacks, highlights, mids,
                         softness, warmth, vignette,
                         reds, yellows, greens, blues) {
    var err = checkDoc(); if (err) return err;
    try {
        var doc = app.activeDocument;
        var W   = doc.width.as("px");
        var H   = doc.height.as("px");

        // ─ 1. B&W конвертация с Tri-X channel mix ─
        addBWTriX(reds, yellows, greens, blues);

        // ─ 2. Кривые: тени + хайлайты + midtone gamma ─
        addTriXCurves(blacks, highlights, mids);

        // ─ 3. Кремовый silver gelatin warmth ─
        addSilverWarmth(warmth);

        // ─ 4. Grain stack (stamp + softness + noise + grain size blur) ─
        addTriXGrain(grain, grainSize, softness);

        // ─ 5. Виньетка ─
        addVignetteLayer(vignette, W, H);

        return "Tri-X applied";
    } catch(e) { return "ERR: " + e.message; }
}
