/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true, eqeq:true */
/*global define, window, $, brackets, Mustache */
define(function (require, exports, module) {
    "use strict";
    
    var FileSystem  = brackets.getModule("filesystem/FileSystem"),
        Preferences = require("Preferences");
    
    var _template = Mustache.compile(require("text!html/preference.html"));
    
    /**
     * @constructor
     */
    function PreferenceView() {}
    
    PreferenceView.prototype._$view = null;
    
    PreferenceView.prototype._compileView = function () {
        if (this._$view != null) {
            this._$view.remove();
            this._$view = null;
        }

        var $view   = $(_template(Preferences));

        // Show file selector
        $view
            .on("click", "[data-action='file']", this._onFileSelect.bind(this))
            .on("click", "[data-action='save']", this._onSave.bind(this))
            .on("hidden", this._onClose.bind(this));
        
        // Set checkbox state
        // Adjust
        $view
            .find("[name='adjust']")
            .attr("checked", Preferences.adjust() === true ? "" : null);
        
        // Position
        $view
            .find(".posSelector input")
            .filter("[value='" + Preferences.position() + "']")
            .attr("checked", "");
        
        // Filters
        var filterChecks = $view.find("input[name='filters']");
        $.each(Preferences.filters(), function (k, v) {
            filterChecks.filter("[value='" + v + "']").attr("checked", "");
        });
        
        // Repeat type
        $view
            .find("select[name='repeatType']")
            .find("option[value='" + Preferences.repeatType() + "']")
            .attr("selected", "");
        
        return (this._$view = $view);
    };
    
    /**
     * File selection event handler
     */
    PreferenceView.prototype._onFileSelect = function () {
        var self = this;
        
        /* Memo:
            1:Allow multi select, 2:Choose directories, 3:title
            4:initialPath, 5:fileTypes, 6:success, 7:error
        **/
        FileSystem
            .showOpenDialog(
                false,
                false,
                "choose wallpaper",
                null,
                ["png", "jpg", "jpeg"],
                function (err, paths) {
                    if (paths != null && paths.length > 0) {
                        $("input[name='image']", self.getView()).val(paths[0]);
                    }
                }
            );
    };
    
    /**
     * Save event listener
     */
    PreferenceView.prototype._onSave = function () {
        // Parse form data
        var form        = $("form", this.getView()),
            formData    = {},
            defaultData = {
                image : null,
                adjust : false,
                position : "left top",
                repeatType : "repeat",
                filters : []
            };
                
        $.each(form.serializeArray(), function () {
            var key = this.name,
                val = this.value;
            
            if (formData[key] != null) {
                if (formData[key] instanceof Array) {
                    formData[key].push(val);
                } else {
                    formData[key] = [formData[key], val];
                }
            } else {
                formData[key] = val;
            }
        });
        
        // Filters to Array
        if (formData.filters instanceof Array === false) {
            formData.filters = [formData.filters];
        }
        
        $.extend(defaultData, formData);
        
        // Save preferences
        $.each(defaultData, function (key, val) {
            console.debug("saved", key, val);
            try { Preferences[key](val); } catch (e) { console.error(e); }
        });
    };
    
    /**
     * Dialog close event listener
     */
    PreferenceView.prototype._onClose = function () {
        this._compileView();
    };
    
    /**
     * Get current preference view.
     */
    PreferenceView.prototype.getView = function () {
        return this._$view || this._compileView();
    };
    
    return new PreferenceView();
});