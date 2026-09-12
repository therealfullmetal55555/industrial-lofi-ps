function CSInterface() {}
CSInterface.prototype.evalScript = function(script, callback) {
    if (window.__adobe_cep__) {
        window.__adobe_cep__.evalScript(script, function(result) {
            if (callback) callback(result === "undefined" ? "" : result);
        });
    } else {
        if (callback) callback("[dev mode]");
    }
};
