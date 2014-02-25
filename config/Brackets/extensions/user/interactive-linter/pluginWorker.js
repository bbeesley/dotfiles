/**
 * Interactive Linter Copyright (c) 2014 Miguel Castillo.
 *
 * Licensed under MIT
 */


importScripts("libs/js/require.js");


function PluginLoader( settings ) {
    "use strict";
    var _self = this;
    var data = settings.data;

    var pluginRequire = requirejs.config({
        "baseUrl": data.baseUrl,
        "packages": data.packages
    });

    _self.byName = {};
    _self.byLanguage = {};


    pluginRequire(data.packages, function() {
        var _plugins = Array.prototype.slice.call(arguments),
            _result = {},
            plugin = null;

        for ( var iPlugin in _plugins ) {
            plugin = _plugins[iPlugin];
            plugin.name = plugin.name || data.packages[iPlugin];
            _self.byName[plugin.name] = plugin;
            _self.byLanguage[plugin.language] = plugin;

            _result[plugin.name] = {
                "name": plugin.name,
                "language": plugin.language,
                "settingsFile": plugin.settingsFile
            };
        }

        postMessage({ type: "ready", data: _result, msgId: settings.msgId });
    });
}


PluginLoader.prototype.lint = function(data) {
    var _self = this;
    var msgId = data.msgId;

    // Lint!
    data = data.data;
    var lintResult = _self.byName[data.name].lint(data.text, data.settings);

    postMessage({
        "type": "lint",
        "msgId": msgId,
        "data": {
            result: lintResult
        }
    });
};


var console = {
    log: function(message) {
        postMessage({
            type: "debug",
            message: message
        });
    }
};


onmessage = function(evt) {
    var data = evt.data || {};
    var method = PluginLoader.instance && PluginLoader.instance[data.type];

    if ( typeof method === 'function' ) {
        return method.apply(PluginLoader.instance, [data || {}]);
    }

    switch (data.type) {
        case "init":
            PluginLoader.instance = new PluginLoader(data);
            break;
        default:
            throw new Error("Unknown message type: " + data.type);
    }
};

