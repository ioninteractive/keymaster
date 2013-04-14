//     keymaster.js
//     (c) 2011 Thomas Fuchs
//     keymaster.js may be freely distributed under the MIT license.

define(['jquery', 'underscore'],
    function($, _) {
        // Constants
        var _MODIFIERS = {
            // modifier keys
            '⇧': 16, shift: 16,
            '⌥': 18, alt: 18, option: 18,
            '⌃': 17, ctrl: 17, control: 17,
            '⌘': 91, command: 91
        },
            _MAP = {
                // special keys
                backspace: 8,
                tab: 9,
                clear: 12,
                enter: 13, 'return': 13,
                esc: 27, escape: 27,
                space: 32,
                left: 37,
                up: 38,
                right: 39,
                down: 40,
                del: 46, 'delete': 46,
                home: 36,
                end: 35,
                pageup: 33,
                pagedown: 34,
                ',': 188,
                '.': 190,
                '/': 191,
                '`': 192,
                '-': 189,
                '=': 187,
                ';': 186,
                '\'': 222,
                '[': 219,
                ']': 221,
                '\\': 220
            };

        var _handlers = {},
            _modifierKeys = { 16: false, 18: false, 17: false, 91: false },
            _scope = 'all';

        // Fill out the F1-F20 keys
        for (var i = 1; i < 20; i++) {
            _MODIFIERS['f' + i] = 111 + i;
        }

        // unset modifier keys on keyup

        function clearModifier(event) {
            var key = event.keyCode;
            if (key == 93 || key == 224) {
                key = 91;
            }

            if (key in _modifierKeys) {
                _modifierKeys[key] = false;
            }
        }

        function resetModifiers() {
            for (var k in _modifierKeys) {
                _modifierKeys[k] = false;
            }
        }

        var KeyMaster = {
            assignKey: function(shortcutKeys, scope, method, context) {
                shortcutKeys = shortcutKeys.replace(/\s/g, '');
                shortcutKeys = _(shortcutKeys.split(','));

                if (shortcutKeys.last() === '') {
                    shortcutKeys[shortcutKeys.length - 2] += ',';
                }

                var shortcut, modifiers, key;

                // for each shortcut
                shortcutKeys.each(function(sk) {
                    // set modifier keys if any
                    modifiers = [];

                    shortcut = _(sk.split('+'));
                    if (shortcut.size() > 1) {
                        modifiers = shortcut.initial();

                        for (var i = 0; i < modifiers.length; i++)
                            modifiers[i] = _MODIFIERS[modifiers[i]];
                    }

                    key = shortcut.last();

                    // convert to keycode and...
                    key = _MAP[key] || key.toUpperCase().charCodeAt(0);

                    // ...store handler
                    if (!(key in _handlers)) {
                        _handlers[key] = [];
                    }

                    var exists = _(_handlers[key]).any(function(h) {
                        return h.shortcut === sk &&
                            h.scope === scope &&
                            h.method === method &&
                            h.context === context;
                    });

                    if (!exists) {
                        _handlers[key].push(
                            {
                                shortcut: sk,
                                modifiers: modifiers,
                                scope: scope,
                                method: method,
                                context: context,
                                boundMethod: context ? _.bind(method, context) : method
                            });
                    }
                });
            },

            filter: function(event) {
                var tagName = (event.target || event.srcElement).tagName;
                // ignore keypressed in any elements that support keyboard data input
                return !(tagName == 'INPUT' || tagName == 'SELECT' || tagName == 'TEXTAREA');
            },

            getScope: function() {
                return _scope || 'all';
            },

            // set current scope (default 'all')
            setScope: function(scope) {
                _scope = scope || 'all';
            },

            // delete all handlers for a given scope
            deleteScope: function(scope) {
                var key, handlers;

                var filter = function(h) {
                    return h.scope !== scope;
                };

                for (key in _handlers) {
                    handlers = _handlers[key];

                    _handlers[key] = _(handlers).filter(filter);
                }
            },

            // handle keydown event
            dispatch: function(event, scope) {
                var key = event.keyCode;
                // if a modifier key, set the key.<modifierkeyname> property to true and return
                if (key == 93 || key == 224) {
                    key = 91; // right command on webkit, command on Gecko
                }

                if (key in _modifierKeys) {
                    _modifierKeys[key] = true;
                    return;
                }

                // see if we need to ignore the keypress (filter() can can be overridden)
                // by default ignore key presses if a select, textarea, or input is focused
                if (!this.filter.call(this, event)) {
                    return;
                }

                // abort if no potentially matching shortcuts found
                if (!(key in _handlers)) {
                    return;
                }

                // for each potential shortcut
                var matches = _(_.filter(_handlers[key], function(h) {
                    return h.scope === scope || h.scope === 'all';
                }));

                matches.each(function(handler) {
                    // check if modifiers match if any
                    var modifiersMatch = handler.modifiers.length > 0;

                    for (var k in _modifierKeys) {
                        if ((!_modifierKeys[k] && _.indexOf(handler.modifiers, +k) > -1) ||
                            (_modifierKeys[k] && _.indexOf(handler.modifiers, +k) == -1)) {
                            modifiersMatch = false;
                        }
                    }

                    // call the handler and stop the event if necessary
                    if (modifiersMatch || (handler.modifiers.length === 0 &&
                        !_modifierKeys[16] && !_modifierKeys[18] &&
                        !_modifierKeys[17] && !_modifierKeys[91])) {

                        if (handler.boundMethod(event, handler) === false) {
                            event.preventDefault();
                            event.stopPropagation();
                        }
                    }
                });
            },

            attachTo: function(element) {
                $(element)
                    .on('keydown', function(event) {
                        KeyMaster.dispatch(event, _scope);
                    })
                    .on('keyup', clearModifier);
            },

            detachFrom: function(element) {
                $(element)
                    .off('keydown')
                    .off('keyup');
            }
        };

        // set the handlers globally on document
        $(document)
            .on('keydown', function(event) {
                // Passing _scope to a callback to ensure it remains the same by execution. Fixes #48
                KeyMaster.dispatch(event, _scope);
            })
            .on('keyup', clearModifier);

        // reset modifiers to false whenever the window is (re)focused.
        $(window).on('keyup', resetModifiers);

        return KeyMaster;
    });