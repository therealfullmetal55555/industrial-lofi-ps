var cs = new CSInterface();

function setStatus(msg, type) {
    var el = document.getElementById('status');
    el.textContent = msg;
    el.className = type || '';
    if (type === 'ok') setTimeout(function() { el.textContent = 'Ready'; el.className = ''; }, 3000);
}

function run(scriptStr) {
    setStatus('Running…');
    cs.evalScript(scriptStr, function(result) {
        if (!result || result === '' || result === 'undefined') {
            setStatus('Done', 'ok');
        } else if (result.indexOf('ERR:') === 0) {
            setStatus(result.replace('ERR:', '').trim(), 'err');
        } else {
            setStatus(result, 'ok');
        }
    });
}

function applyGrainFromSlider() {
    var val = document.getElementById('grainSlider').value;
    run('applyGrain(' + val + ')');
}

function applyAusTaylor() {
    function v(id) { return document.getElementById(id).value; }
    var args = [
        v('atGrain'),
        v('atGrainSize'),
        v('atBlacks'),
        v('atHighlights'),
        v('atMids'),
        v('atSoftness'),
        v('atWarmth'),
        v('atVignette'),
        v('atReds'),
        v('atYellows'),
        v('atGreens'),
        v('atBlues')
    ].join(',');
    run('applyAusTaylor(' + args + ')');
}
