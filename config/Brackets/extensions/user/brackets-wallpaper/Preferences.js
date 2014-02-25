/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50, eqeq:true */
/*global define, brackets, window, $, document */
define(function (require, exports, module) {
    "use strict";
    
    var PreferencesManager      = brackets.getModule("preferences/PreferencesManager");
    
    var StorageId     = "brackets-wallpaper",
        defaults        = {
            enabled : true,
            image : null,
            adjust : true,
            position : "left top",
            repeatType: "repeat",
            filters : ["whitefilm"],
            
            version:    "1.2"
        };
    
    // Define Function
    function realTypeOf(obj) { return Object.prototype.toString.apply(obj).slice(8, -1).toLowerCase(); }
    
    
    /**
     * @constructor
     */
    function Preferences() {
        this._storage = PreferencesManager.getPreferenceStorage(StorageId, defaults);
    }
    
    /**
     * Set or get preference value
     * @param {string} key
     * @param {*} value
     */
    Preferences.prototype._attr = function (key, value) {
        if (value != null) {
            this._storage.setValue(key, value);
            $(this).triggerHandler("change", [key, value]);
        }
        
        return this._storage.getValue(key);
    };
    
    /**
     * @param {Boolean}
     */
    Preferences.prototype.enabled = function (val) {
        return this._attr("enabled", val);
    };
    
    /**
     * @param {String} fullPath
     */
    Preferences.prototype.image = function (fullPath) {
        return this._attr("image", (typeof fullPath === "string" && fullPath.replace(/\\/g, "/")) || null);
    };
    
    /**
     * @param {Boolean} adjusting
     */
    Preferences.prototype.adjust = function (adjusting) {
        return !!this._attr("adjust", adjusting != null ? adjusting : null);
    };
    
    /**
     * @param {string} position
     */
    Preferences.prototype.position = function (position) {
        return this._attr("position", position);
    };
    
    /**
     * @param {string} repeatType
     */
    Preferences.prototype.repeatType = function (repeatType) {
        return this._attr("repeatType", repeatType);
    };
    
    /**
     * @param {Array.<string>}
     */
    Preferences.prototype.filters = function (filters) {
        filters = filters != null ? (realTypeOf(filters) === "array" && filters) || [] : null;
        return this._attr("filters", filters);
    };
    
    return window.p = new Preferences();
});