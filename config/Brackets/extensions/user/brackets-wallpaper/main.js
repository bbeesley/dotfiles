/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, regexp: true, eqeq:true */
/*global define, window, $, brackets, Mustache */
define(function (require, exports, module) {
    "use strict";
    
    var AppInit         = brackets.getModule("utils/AppInit"),
        CommandManager  = brackets.getModule("command/CommandManager"),
        Dialogs         = brackets.getModule("widgets/Dialogs"),
        ExtensionUtils  = brackets.getModule("utils/ExtensionUtils"),
        FileSystem      = brackets.getModule("filesystem/FileSystem"),
        Menus           = brackets.getModule("command/Menus"),
        Preferences     = require("Preferences"),
        PreferenceView  = require("PreferencesView");
    
    var MOD_PREF        = "brackets-wallpaper",
        NAMESPACE       = "brackets.wallpaper",
        COMMAND_PREF    = (NAMESPACE + ".command");
    
    var _instance       = null;
    
    function Wallpaper() {
        $(Preferences).on("change", this._init.bind(this));
        
        this._init();
    }
    
    Wallpaper.template  = {
        _tpl    : Mustache.compile(require("text!html/wallpaper.html")),
        _$view  : null,
        getView : function () { return this._$view || this.compile(); },
        compile : function () {
            if (this._$view != null) {
                this._$view.remove();
                this._$view = null;
            }
            var $wall = $(this._tpl(Preferences));
            
            // Enable
            $wall.toggleClass("wallpaper-active", Preferences.enabled());
            
            // Adjust
            $wall.find(".wallpaper").toggleClass("wallpaper-adjust", Preferences.adjust());
            
            // Filters
            var $fx = $("[data-fx]", $wall);
            $.each(Preferences.filters(), function () {
                $fx.filter("[data-fx='" + this + "']").addClass("fx-active");
            });
            
            return (this._$view = $wall);
        }
    };
    
    /**
     * Initialize
     */
    Wallpaper.prototype._init = function () {
        // Initialize
        $("#editor-holder")
            .prepend(Wallpaper.template.compile())
            .toggleClass("wallpaper-active", Preferences.enabled());
    };
    
    // Register Menu
    CommandManager.register("Wallpaper configuration", COMMAND_PREF + ".preference", function () {
        var dialog = Dialogs.showModalDialogUsingTemplate(PreferenceView.getView());
    });
    CommandManager.register(((Preferences.enabled() ? "Disable" : "Enable") + " wallpaper"), COMMAND_PREF + ".enabled", function () {
        this.setChecked(Preferences.enabled(!this.getChecked()));
        this.setName((Preferences.enabled() ? "Disable" : "Enable") + " wallpaper");
    }).setChecked(Preferences.enabled());
    
    Menus.getMenu(Menus.AppMenuBar.VIEW_MENU).addMenuItem(COMMAND_PREF + ".preference");
    Menus.getMenu(Menus.AppMenuBar.VIEW_MENU).addMenuItem(COMMAND_PREF + ".enabled");
    
    // Load CSS
    ExtensionUtils.loadStyleSheet(module, "css/Wallpaper.css");
    ExtensionUtils.loadStyleSheet(module, "css/Overrides.css");
    
    _instance = new Wallpaper();
});