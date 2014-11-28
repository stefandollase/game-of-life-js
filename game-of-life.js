/*
 * The MIT License (MIT)
 * 
 * Copyright (c) 2014 Stefan Dollase
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

function GameOfLife(parameters) {
    this.mouseDownCounter = 2;

    this.timer = false;

    this.setupNamedPatterns(parameters);
    this.state = this.createState();
    this.setupSettings(parameters);
    this.setupModes(parameters);
    this.setupUI(parameters);
    this.initPattern();
    this.resize();
    this.state.fireChangedForAll();

    this.drawAllCells();
}
GameOfLife.prototype.isString = function(value) {
    return (typeof value == 'string') || (value instanceof String);
}
GameOfLife.prototype.overwriteJSObject = function(destination, source) {
    for ( var key in source) {
	destination[key] = source[key];
    }
    return destination;
}
GameOfLife.prototype.callThatFunction = function(callback, parameters) {
    parameters = parameters || [];
    var that = this;
    if (this.isString(callback)) {
	return function() {
	    that[callback].apply(that, parameters);
	}
    } else {
	return function() {
	    callback.apply(that, parameters);
	}
    }
}
GameOfLife.prototype.createState = function() {
    return new AppStateBinder(
	    {
		autoplay : {
		    type : "flag",
		    changed : this.callThatFunction("updateAutoplay"),
		},
		nogrid : {
		    type : "flag",
		    changed : this.callThatFunction("updateShowGrid"),
		},
		patternData : {
		    type : "json",
		    changed : this.callThatFunction("updatePattern"),
		},
		pattern : {
		    type : "option",
		    changed : this.callThatFunction("updatePattern"),
		    options : this.getPatternNames(true),
		},
		border : {
		    type : "option",
		    changed : this.callThatFunction("updateBorder"),
		    options : [ "torus", "alive", "dead" ],
		},
		speed : {
		    type : "number",
		    changed : this.callThatFunction("updateSpeed"),
		    prefix : "",
		    suffix : "ms",
		    min : 0,
		    max : 10000,
		},
		size : {
		    type : "numberObject",
		    changed : this.callThatFunction("updateSize"),
		    separators : [ "", "x", "" ],
		    attributes : [ "width", "height" ],
		    ranges : {
			"width" : [ 1, 500 ],
			"height" : [ 1, 500 ],
		    },
		},
		patternOffset : {
		    type : "numberObject",
		    changed : this.callThatFunction("updatePatternOffset"),
		    separators : [ "+", "x", "" ],
		    attributes : [ "j", "i" ],
		    ranges : {
			"j" : [ 0, 499 ],
			"i" : [ 0, 499 ],
		    },
		},
		rules : {
		    type : "custom",
		    changed : this.callThatFunction("updateRules"),
		    parse : function(stringValue) {
			if (stringValue.indexOf("/") < 0) {
			    return false;
			}
			var propertyArray = stringValue.split("/");
			if (propertyArray.length !== 2) {
			    return false;
			}
			var result = {};
			result.keepAlive = new Array(9);
			result.revive = new Array(9);
			for (var i = 0; i < 9; i++) {
			    result.keepAlive[i] = (propertyArray[0].indexOf(""
				    + i) >= 0);
			}
			for (var i = 0; i < 9; i++) {
			    result.revive[i] = (propertyArray[1]
				    .indexOf("" + i) >= 0);
			}
			return result;
		    },
		    stringify : function(dataValue) {
			var result = "";
			for (var i = 0; i < dataValue.keepAlive.length; i++) {
			    if (dataValue.keepAlive[i]) {
				result += i;
			    }
			}
			result += "/";
			for (var i = 0; i < dataValue.revive.length; i++) {
			    if (dataValue.revive[i]) {
				result += i;
			    }
			}
			return result;
		    },
		}
	    });
}
GameOfLife.prototype.updateAutoplay = function() {
    if (this.state.isSet("autoplay")) {
	this.state.unset("autoplay");
	this.start();
    }
}
GameOfLife.prototype.updatePattern = function() {
    var pattern = this.state.get("pattern");
    var patternData = this.state.get("patternData");
    if (pattern === "random") {
	this.pattern = "random";
    } else if (pattern === "clean") {
	this.pattern = "clean";
    } else if (pattern !== false) {
	this.pattern = this.namedPatterns[pattern];
	this.html.selectPattern.value = pattern;
    } else if (patternData !== false) {
	this.pattern = patternData;
    } else if (this.defaultSettings.pattern === "random") {
	this.pattern = "random";
    } else if (this.defaultSettings.pattern === "clean") {
	this.pattern = "clean";
    } else if (this.isString(this.defaultSettings.pattern)) {
	this.pattern = this.namedPatterns[this.defaultSettings.pattern];
	this.html.selectPattern.value = this.defaultSettings.pattern;
    } else if (this.defaultSettings.pattern !== false) {
	this.pattern = this.defaultSettings.pattern;
    } else {
	this.pattern = "clean";
    }
    this.initPattern();
    this.drawAllCells();
}
GameOfLife.prototype.updateBorder = function() {
    this.setStateOrDefault("border");
    this.html.selectBorder.value = this.border;
}
GameOfLife.prototype.updateSpeed = function() {
    this.setStateOrDefault("speed");
    this.html.speedTextBox.value = this.speed;
    this.restartIfRunning();
}
GameOfLife.prototype.updateSize = function() {
    this.setStateOrDefault("size");
    this.html.widthTextBox.value = this.size.width;
    this.html.heightTextBox.value = this.size.height;
    this.setupMatrices();
    this.resize();
    this.initPattern();
    this.drawAllCells();
}
GameOfLife.prototype.updatePatternOffset = function() {
    this.setStateOrDefault("patternOffset");
    this.html.patternOffsetJTextBox.value = this.patternOffset.j;
    this.html.patternOffsetITextBox.value = this.patternOffset.i;
    this.initPattern();
    this.drawAllCells();
}
GameOfLife.prototype.updateRules = function() {
    this.setStateOrDefault("rules");
    for (var i = 0; i < 9; i++) {
	this.html.keepAlive[i].checked = this.rules.keepAlive[i];
	this.html.revive[i].checked = this.rules.revive[i];
    }
}
GameOfLife.prototype.updateShowGrid = function() {
    this.showGrid = !this.state.isSet("nogrid");
    if (this.showGrid) {
	this.html.gridButton.innerHTML = "Hide Grid";
    } else {
	this.html.gridButton.innerHTML = "Show Grid";
    }
    this.resize();
    this.drawAllCells();
}
GameOfLife.prototype.setStateOrDefault = function(name) {
    var value = this.state.get(name);
    if (value === false) {
	this[name] = this.defaultSettings[name];
    } else {
	this[name] = value;
    }
}
GameOfLife.prototype.setupMatrices = function() {
    if ((this.currentGeneration === undefined)
	    || (this.currentGeneration.length !== this.size.height)
	    || (this.currentGeneration[0].length !== this.size.width)) {
	this.currentGeneration = this.createArray(false);
	this.nextGeneration = this.createArray(false);
	this.drawOverlay = this.createArray(0);
    } else {
	this.initArray(this.currentGeneration, false);
	this.initArray(this.nextGeneration, false);
	this.initArray(this.drawOverlay, 0);
    }
}
GameOfLife.prototype.setupSettings = function(parameters) {
    this.defaultSettings = this.overwriteJSObject({},
	    this.defaultDefaultSettings);
    if (parameters.settings) {
	this.overwriteJSObject(this.defaultSettings, parameters.settings);
    }
    this.overwriteJSObject(this, this.defaultSettings);
}
GameOfLife.prototype.setupModes = function(parameters) {
    if (parameters.modes) {
	this.modes = [];
	for (var i = 0; i < parameters.modes.length; i++) {
	    if (parameters.modes[i] === "defaults") {
		this.modes = this.modes.concat(this.defaultModes);
	    } else {
		this.modes.push(parameters.modes[i]);
	    }
	}
    } else {
	this.modes = this.defaultModes;
    }
}
GameOfLife.prototype.setupNamedPatterns = function(parameters) {
    if (parameters.patterns) {
	this.namedPatterns = {};
	for ( var key in parameters.patterns) {
	    if (key === "defaults") {
		this.overwriteJSObject(this.namedPatterns,
			this.defaultNamedPatterns);
	    } else {
		this.namedPatterns[key] = parameters.patterns[key];
	    }
	}
    } else {
	this.namedPatterns = this.defaultNamedPatterns;
    }
}
GameOfLife.prototype.setupUI = function(parameters) {
    var that = this;

    this.html = {};

    var container;
    if (this.isString(parameters.container)) {
	container = document.getElementById(parameters.container);
    } else {
	container = parameters.container;
    }
    var save = function(name, element) {
	that.html[name] = element;
    }

    this.setupUIWindow();

    this.html.container = this.setupUIElement(container, "div", "game-of-life");
    this.html.controls = this.setupUIElement(this.html.container, "div",
	    "controls");

    container = this.setupUIElement(this.html.controls, "fieldset", "buttons");
    {
	save("startButton", this.setupUIButton(container, "Start",
		"toggleRunning"));
	this.setupUIButton(container, "Step", "step");
	this.setupUIButton(container, "Clear", "initNamedPattern", [ "clean" ]);
	this.setupUIButton(container, "Random", "initNamedPattern",
		[ "random" ]);
	save("gridButton", this.setupUIButton(container, "Hide Grid",
		"toggleGrid"));
	save("exportCurrentGeneration", this.setupUIButton(container,
		"Export Current Generation", "exportCurrentGeneration"));
	this.html.exportCurrentGeneration.title = "Writes the current generation to the URL, which can be used to restore the current generation.";
	save("customPatternButton", this.setupUIButton(container,
		"Enter Custom Pattern", "toggleCustomPattern"));
    }

    this.html.settingsContainer = this.setupUIElement(this.html.controls,
	    "fieldset", "settings");
    container = this.html.settingsContainer;
    {
	save("selectMode", this.setupUIComboBox(container, "Presets",
		"setMode", this.modes));
	this.html.selectMode.className = "input";

	save("selectBorder", this.setupUIComboBox(container, "Border Behavior",
		"setBorder", [ "dead", "torus", "alive" ]));
	this.html.selectBorder.className = "input";

	save("selectPattern", this.setupUIComboBox(container, "Pattern",
		"initNamedPattern", this.getPatternNames(false)));
	this.html.selectPattern.className = "input";

	save("patternOffsetJTextBox", this.setupUITextBox(container,
		"Pattern Offset X (cells)", "setPatternOffset"));
	save("patternOffsetITextBox", this.setupUITextBox(container,
		"Pattern Offset Y (cells)", "setPatternOffset"));
	save("widthTextBox", this.setupUITextBox(container, "Width (cells)",
		"setSize"));
	save("heightTextBox", this.setupUITextBox(container, "Height (cells)",
		"setSize"));
	save("speedTextBox", this.setupUITextBox(container,
		"Speed (ms per step)", "setSpeed"));

	container = this.setupUIElement(this.html.settingsContainer,
		"fieldset", "rules keep-alive");
	container = this.setupUILegend(container, "Keep Alive");
	container = this.setupUIElement(container, "fieldset", "rule-items");
	save("keepAlive", this.setupUICheckBoxes(container, "setRules"));

	container = this.setupUIElement(this.html.settingsContainer,
		"fieldset", "rules revive");
	container = this.setupUILegend(container, "Revive");
	container = this.setupUIElement(container, "fieldset", "rule-items");
	save("revive", this.setupUICheckBoxes(container, "setRules"));
    }

    this.html.customPatternContainer = this.setupUIElement(this.html.controls,
	    "fieldset", "custom-pattern");
    container = this.html.customPatternContainer;
    {
	container.title = "The pattern is shifted by the pattern offset.\n\nPattern syntax\nLiving cell: *\nDead cell: .\nNew row: new line\n\nExample Pattern:\n***\n*\n.*";
	save("customPattern", this.setupUITextArea(container,
		"Custom Pattern (. = dead cell)", "setCustomPattern"));
    }

    container = this.setupUIElement(this.html.container, "div", "canvas");
    {
	this.setupUICanvas(container);
    }
}
GameOfLife.prototype.setupUIWindow = function() {
    var that = this;
    window.addEventListener('resize', function() {
	that.resize();
	that.drawAllCells();
    }, false);
}
GameOfLife.prototype.setupUIElement = function(container, tagName, className) {
    var tag = document.createElement(tagName);
    tag.className = className;
    container.appendChild(tag);
    return tag;
}
GameOfLife.prototype.setupUILegend = function(container, title) {
    var legend = document.createElement("legend");
    legend.innerHTML = title;
    container.appendChild(legend);
    return legend;
}
GameOfLife.prototype.setupUIButton = function(container, title, callback,
	parameters) {
    var button = document.createElement("button");
    button.innerHTML = title;
    button.addEventListener('click', this.callThatFunction(callback, parameters
	    || []), false);
    container.appendChild(button);
    return button;
}
GameOfLife.prototype.setupUITextBox = function(container, title, callback) {
    var label = document.createElement("label");
    label.innerHTML = title;
    var textBox = document.createElement("input");
    textBox.setAttribute("type", "text");
    textBox.addEventListener('keyup', this.callThatFunction(callback), false);
    label.appendChild(textBox);
    container.appendChild(label);
    return textBox;
}
GameOfLife.prototype.setupUITextArea = function(container, title, callback) {
    var label = document.createElement("label");
    label.innerHTML = title;
    var textarea = document.createElement("textarea");
    textarea.addEventListener('keyup', this.callThatFunction(callback), false);
    label.appendChild(textarea);
    container.appendChild(label);
    return textarea;
}
GameOfLife.prototype.setupUICheckBox = function(container, title, callback) {
    var label = document.createElement("label");
    var checkBox = document.createElement("input");
    checkBox.setAttribute("type", "checkbox");
    checkBox.addEventListener('change', this.callThatFunction(callback), false);
    label.appendChild(checkBox);
    label.appendChild(document.createTextNode(title));
    container.appendChild(label);
    return checkBox;
}
GameOfLife.prototype.setupUICheckBoxes = function(container, callback) {
    var result = [];
    for (var i = 0; i < 9; i++) {
	result.push(this.setupUICheckBox(container, "" + i, callback));
    }
    return result;
}
GameOfLife.prototype.setupUIComboBox = function(container, title, callback,
	options) {
    var label = document.createElement("label");
    label.innerHTML = title;
    var select = document.createElement("select");
    for (var i = 0; i < options.length; i++) {
	var option = document.createElement("option")
	if (this.isString(options[i])) {
	    option.innerHTML = options[i];
	    option.setAttribute("value", options[i]);
	} else {
	    option.innerHTML = options[i].title;
	    option.setAttribute("value", options[i].value);
	}
	select.appendChild(option);
    }
    select.addEventListener("change", this.callThatFunction(callback), false);
    label.appendChild(select);
    container.appendChild(label);
    return select;
}
GameOfLife.prototype.setupUICanvas = function(container) {
    var that = this;
    this.html.canvas = document.createElement("canvas");
    this.html.canvas.addEventListener("mousemove", function(event) {
	that.mouseMove(event);
    });
    this.html.canvas.addEventListener("mousedown", function(event) {
	that.mouseMove(event);
    });
    this.html.canvas.addEventListener("mouseup", function(event) {
	that.mouseUp(event);
    });
    container.appendChild(this.html.canvas);

    this.html.context = this.html.canvas.getContext("2d");
}
GameOfLife.prototype.exportCurrentGeneration = function() {
    if (this.currentGenerationChanged) {
	var minI = this.size.height;
	var minJ = this.size.width;
	for (var i = 0; i < this.size.height; i++) {
	    for (var j = 0; j < this.size.width; j++) {
		if (this.currentGeneration[i][j]) {
		    if (minI > i) {
			minI = i;
		    }
		    if (minJ > j) {
			minJ = j;
		    }
		}
	    }
	}

	if (minI === this.size.height) {
	    this.state.unset("patternOffset");
	    this.state.unset("patternData");
	    this.state.set("pattern", "clean");
	    return;
	}

	var result = {};
	for (var i = 0; i < this.size.height; i++) {
	    for (var j = 0; j < this.size.width; j++) {
		if (this.currentGeneration[i][j]) {
		    if (result[i - minI]) {
		    } else {
			result[i - minI] = [];
		    }
		    result[i - minI].push(j - minJ);
		}
	    }
	}
	if (minI > 0 || minJ > 0) {
	    this.state.set("patternOffset", {
		i : minI,
		j : minJ,
	    });
	} else {
	    this.state.unset("patternOffset");
	}
	this.state.set("patternData", result);
	this.state.unset("pattern");
    }
}
GameOfLife.prototype.setSpeed = function() {
    this.state.setStringValue("speed", this.html.speedTextBox.value + "ms");
}
GameOfLife.prototype.setSize = function() {
    this.state.setStringValue("size", this.html.widthTextBox.value + "x"
	    + this.html.heightTextBox.value);
}
GameOfLife.prototype.setPatternOffset = function() {
    this.state.setStringValue("patternOffset", "+"
	    + this.html.patternOffsetJTextBox.value + "x"
	    + this.html.patternOffsetITextBox.value);
}
GameOfLife.prototype.setRules = function() {
    var keepAlive = new Array(9);
    var revive = new Array(9);
    for (var i = 0; i < 9; i++) {
	keepAlive[i] = this.html.keepAlive[i].checked;
	revive[i] = this.html.revive[i].checked;
    }
    this.state.set("rules", {
	keepAlive : keepAlive,
	revive : revive
    });
}
GameOfLife.prototype.setCustomPattern = function() {
    this.state.unset("pattern");
    this.state.unset("patternData");

    var pattern = {};
    var lines = this.html.customPattern.value.split("\n");
    for (var i = 0; i < lines.length; i++) {
	var line = this.parseLine(lines[i].trim().split(""));
	if (line.length > 0) {
	    pattern[i] = line;
	}
    }

    this.pattern = pattern;
    this.initPattern();
    this.drawAllCells();

    this.currentGenerationChanged = true;
}
GameOfLife.prototype.parseLine = function(line) {
    var result = [];
    for (var j = 0; j < line.length; j++) {
	if (line[j] !== ".") {
	    result.push(j);
	}
    }
    return result;
}
GameOfLife.prototype.setMode = function() {
    window.location.hash = this.html.selectMode.value;
}
GameOfLife.prototype.setBorder = function() {
    this.state.setStringValue("border", this.html.selectBorder.value);
}
GameOfLife.prototype.toggleCustomPattern = function() {
    var isSettings = this.html.settingsContainer.style.display !== "none";
    if (isSettings) {
	this.html.settingsContainer.style.display = "none";
	this.html.customPatternContainer.style.display = "block";
	this.html.customPatternButton.innerHTML = "Return to Settings";
    } else {
	this.html.settingsContainer.style.display = "block";
	this.html.customPatternContainer.style.display = "none";
	this.html.customPatternButton.innerHTML = "Enter Custom Pattern";
    }
}
GameOfLife.prototype.toggleGrid = function() {
    this.state.toggle("nogrid");
}
GameOfLife.prototype.toggleRunning = function() {
    if (this.isRunning()) {
	this.stop();
    } else {
	this.start();
    }
}
GameOfLife.prototype.start = function() {
    var that = this;
    if (!this.isRunning()) {
	this.timer = window.setInterval(function() {
	    that.step();
	}, this.speed);
	document.title = "▶ " + document.title;
	this.html.startButton.innerHTML = "Stop";
    }
}
GameOfLife.prototype.stop = function() {
    if (this.isRunning()) {
	window.clearInterval(this.timer);
	this.timer = false;
	document.title = document.title.substring(2);
	this.html.startButton.innerHTML = "Start";
    }
}
GameOfLife.prototype.restartIfRunning = function() {
    if (this.isRunning()) {
	this.stop();
	this.start();
    }
}
GameOfLife.prototype.isRunning = function() {
    return !(this.timer === false);
}
GameOfLife.prototype.initNamedPattern = function(name) {
    if (name !== undefined) {
	this.state.setStringValue("pattern", name, true);
	this.state.unset("patternData");
    } else {
	this.state.setStringValue("pattern", this.html.selectPattern.value,
		true);
	this.state.unset("patternData");
    }
}
GameOfLife.prototype.initPattern = function() {
    var wasRunning = this.isRunning();
    this.stop();

    this.setupMatrices();

    if (this.pattern === "random") {
	this.createRandomPattern();
    } else if (this.pattern === "clean") {
	this.createDataPattern(0, 0, {});
    } else {
	this.createDataPattern(this.patternOffset.i, this.patternOffset.j,
		this.pattern);
    }

    delete this.currentGenerationChanged;

    if (wasRunning) {
	this.start();
    }
}
GameOfLife.prototype.createRandomPattern = function() {
    for (var i = 0; i < this.size.height; i++) {
	for (var j = 0; j < this.size.width; j++) {
	    this.currentGeneration[i][j] = (Math.random() < 0.5);
	}
    }
}
GameOfLife.prototype.createDataPattern = function(offsetY, offsetX, pattern) {
    for ( var key in pattern) {
	var i = parseInt(key);
	for (var j = 0; j < pattern[i].length; j++) {
	    var ii = offsetY + i;
	    var jj = offsetX + parseInt(pattern[i][j]);
	    if ((ii >= 0) && (ii < this.size.height) && (jj >= 0)
		    && (jj < this.size.width)) {
		this.currentGeneration[ii][jj] = true;
	    }
	}
    }
}
GameOfLife.prototype.createArray = function(value) {
    var result = new Array(this.size.height);
    for (var i = 0; i < this.size.height; i++) {
	result[i] = new Array(this.size.width);
	for (var j = 0; j < this.size.width; j++) {
	    result[i][j] = value;
	}
    }
    return result;
}
GameOfLife.prototype.initArray = function(arr, value) {
    for (var i = 0; i < arr.length; i++) {
	for (var j = 0; j < arr[i].length; j++) {
	    arr[i][j] = value;
	}
    }
    return arr;
}
GameOfLife.prototype.resize = function() {
    var width;
    if ((this.size.width / this.size.height) > (this.maxCanvasSize.width / this.maxCanvasSize.height)) {
	width = this.maxCanvasSize.width;
    } else {
	width = (this.maxCanvasSize.height * this.size.width / this.size.height) | 0;
    }
    if (width > this.html.canvas.parentNode.offsetWidth) {
	width = this.html.canvas.parentNode.offsetWidth;
    }
    this.html.canvas.width = width;
    this.html.canvas.height = this.html.canvas.width * this.size.height
	    / this.size.width;

    if (this.showGrid) {
	this.cellOffset = 1;
    } else {
	this.cellOffset = 0;
    }

    var factorX = (this.html.canvas.width - 2 + this.cellOffset)
	    / this.size.width;
    var factorY = (this.html.canvas.height - 2 + this.cellOffset)
	    / this.size.height;

    this.toXCoordinateArray = new Array(this.size.width + 1);
    for (var j = 0; j <= this.size.width; j++) {
	this.toXCoordinateArray[j] = ((j * factorX) | 0) + 1 - this.cellOffset;
    }

    this.toYCoordinateArray = new Array(this.size.height + 1);
    for (var i = 0; i <= this.size.height; i++) {
	this.toYCoordinateArray[i] = ((i * factorY) | 0) + 1 - this.cellOffset;
    }

    this.cellWidth = new Array(this.size.width);
    for (var j = 0; j < this.size.width; j++) {
	this.cellWidth[j] = this.toXCoordinateArray[j + 1]
		- this.toXCoordinateArray[j] - this.cellOffset;
    }

    this.cellHeight = new Array(this.size.height);
    for (var i = 0; i < this.size.height; i++) {
	this.cellHeight[i] = this.toYCoordinateArray[i + 1]
		- this.toYCoordinateArray[i] - this.cellOffset;
    }

    this.toICellArray = new Array(this.html.canvas.height);
    for (var y = 0; y <= this.html.canvas.height; y++) {
	this.toICellArray[y] = (((y - 1) / factorY) | 0);
    }

    this.toJCellArray = new Array(this.html.canvas.width);
    for (var x = 0; x <= this.html.canvas.width; x++) {
	this.toJCellArray[x] = (((x - 1) / factorX) | 0);
    }

    this.toITorusCoordinateArray = new Array(this.size.height + 2);
    this.toITorusCoordinateArray[0] = this.size.height - 1;
    for (var i = 0; i <= this.size.height; i++) {
	this.toITorusCoordinateArray[i + 1] = i;
    }
    this.toITorusCoordinateArray[this.size.height + 1] = 0;

    this.toJTorusCoordinateArray = new Array(this.size.width + 2);
    this.toJTorusCoordinateArray[0] = this.size.width - 1;
    for (var j = 0; j <= this.size.width; j++) {
	this.toJTorusCoordinateArray[j + 1] = j;
    }
    this.toJTorusCoordinateArray[this.size.width + 1] = 0;

    this.drawGrid();
    this.drawBorder();
}
GameOfLife.prototype.drawGrid = function() {
    if (this.showGrid) {
	for (var i = 1; i < this.size.height; i++) {
	    this.drawHorizontalLine(i);
	}
	for (var j = 1; j < this.size.width; j++) {
	    this.drawVerticalLine(j)
	}
	this.html.context.strokeStyle = this.color.grid;
	this.html.context.stroke();
    }
}
GameOfLife.prototype.drawBorder = function() {
    this.drawHorizontalLine(0);
    this.drawHorizontalLine(this.size.height);
    this.drawVerticalLine(0);
    this.drawVerticalLine(this.size.width);
    this.html.context.strokeStyle = this.color.border;
    this.html.context.stroke();
}
GameOfLife.prototype.drawHorizontalLine = function(i) {
    var y = this.toYCoordinateArray[i];
    this.html.context.moveTo(0, y);
    this.html.context.lineTo(this.html.canvas.width, y);
}
GameOfLife.prototype.drawVerticalLine = function(j) {
    var x = this.toXCoordinateArray[j];
    this.html.context.moveTo(x, 0);
    this.html.context.lineTo(x, this.html.canvas.height);
}
GameOfLife.prototype.drawAllCells = function() {
    for (var i = 0; i < this.size.height; i++) {
	for (var j = 0; j < this.size.width; j++) {
	    this.drawCell(i, j, this.currentGeneration[i][j]);
	}
    }
}
GameOfLife.prototype.drawCell = function(i, j, isAlive) {
    var x = this.toXCoordinateArray[j] + this.cellOffset;
    var y = this.toYCoordinateArray[i] + this.cellOffset;
    var width = this.cellWidth[j];
    var height = this.cellHeight[i];
    if (this.drawOverlay[i][j] === this.mouseDownCounter) {
	this.html.context.fillStyle = this.color.setAlive;
	this.html.context.fillRect(x, y, width, height);
    } else if (this.drawOverlay[i][j] === -this.mouseDownCounter) {
	this.html.context.fillStyle = this.color.setDead;
	this.html.context.fillRect(x, y, width, height);
    } else if (isAlive) {
	this.html.context.fillStyle = this.color.alive;
	this.html.context.fillRect(x, y, width, height);
    } else {
	this.html.context.fillStyle = this.color.dead;
	this.html.context.fillRect(x, y, width, height);
    }
}
GameOfLife.prototype.step = function() {
    for (var i = 0; i < this.size.height; i++) {
	for (var j = 0; j < this.size.width; j++) {
	    var neighbors = this.countNeighbors(i, j);
	    this.nextGeneration[i][j] = ((this.currentGeneration[i][j] && this.rules.keepAlive[neighbors]) || this.rules.revive[neighbors]);
	    if (this.nextGeneration[i][j] !== this.currentGeneration[i][j]) {
		this.drawCell(i, j, this.nextGeneration[i][j]);
	    }
	}
    }

    var tmp = this.currentGeneration;
    this.currentGeneration = this.nextGeneration;
    this.nextGeneration = tmp;

    this.currentGenerationChanged = true;
}
GameOfLife.prototype.countNeighbors = function(i, j) {
    if (this.border === "torus") {
	return this.countNeighborsTorus(i, j);
    } else if (this.border === "alive") {
	return this.countNeighborsBorderAlive(i, j);
    } else if (this.border === "dead") {
	return this.countNeighborsBorderDead(i, j);
    }
}
GameOfLife.prototype.countNeighborsTorus = function(i, j) {
    var result = 0;
    for (var di = 0; di <= 2; di++) {
	for (var dj = 0; dj <= 2; dj++) {
	    if (((di != 1) || (dj != 1))
		    && (this.currentGeneration[this.toITorusCoordinateArray[i
			    + di]][this.toJTorusCoordinateArray[j + dj]])) {
		result++;
	    }
	}
    }
    return result;
}
GameOfLife.prototype.countNeighborsBorderAlive = function(i, j) {
    var result = 8;
    if (i >= 1) {
	if (!this.currentGeneration[i - 1][j]) {
	    result--;
	}
	if (j >= 1 && !this.currentGeneration[i - 1][j - 1]) {
	    result--;
	}
	if (j < this.size.width - 1 && !this.currentGeneration[i - 1][j + 1]) {
	    result--;
	}
    }
    if (i < this.size.height - 1) {
	if (!this.currentGeneration[i + 1][j]) {
	    result--;
	}
	if (j >= 1 && !this.currentGeneration[i + 1][j - 1]) {
	    result--;
	}
	if (j < this.size.width - 1 && !this.currentGeneration[i + 1][j + 1]) {
	    result--;
	}
    }
    if (j >= 1 && !this.currentGeneration[i][j - 1]) {
	result--;
    }
    if (j < this.size.width - 1 && !this.currentGeneration[i][j + 1]) {
	result--;
    }
    return result;
}
GameOfLife.prototype.countNeighborsBorderDead = function(i, j) {
    var result = 0;
    if (i >= 1) {
	if (this.currentGeneration[i - 1][j]) {
	    result++;
	}
	if (j >= 1 && this.currentGeneration[i - 1][j - 1]) {
	    result++;
	}
	if (j < this.size.width - 1 && this.currentGeneration[i - 1][j + 1]) {
	    result++;
	}
    }
    if (i < this.size.height - 1) {
	if (this.currentGeneration[i + 1][j]) {
	    result++;
	}
	if (j >= 1 && this.currentGeneration[i + 1][j - 1]) {
	    result++;
	}
	if (j < this.size.width - 1 && this.currentGeneration[i + 1][j + 1]) {
	    result++;
	}
    }
    if (j >= 1 && this.currentGeneration[i][j - 1]) {
	result++;
    }
    if (j < this.size.width - 1 && this.currentGeneration[i][j + 1]) {
	result++;
    }
    return result;
}
GameOfLife.prototype.mouseMove = function(event) {
    if (event.buttons == 1) {
	if ((this.mouseDownCounter % 2) == 0) {
	    this.mouseDownCounter++;
	}
	var bound = this.html.canvas.getBoundingClientRect();
	var i = this.toICellArray[(event.clientY - bound.top) | 0];
	var j = this.toJCellArray[(event.clientX - bound.left) | 0];
	if (this.currentGeneration[i][j]
		&& (this.drawOverlay[i][j] !== -this.mouseDownCounter)) {
	    this.drawOverlay[i][j] = -this.mouseDownCounter;
	    this.drawCell(i, j, this.currentGeneration[i][j]);
	} else if (!this.currentGeneration[i][j]
		&& (this.drawOverlay[i][j] !== this.mouseDownCounter)) {
	    this.drawOverlay[i][j] = this.mouseDownCounter;
	    this.drawCell(i, j, this.currentGeneration[i][j]);
	}
    } else {
	if ((this.mouseDownCounter % 2) == 1) {
	    this.mouseUp(event);
	}
    }
}
GameOfLife.prototype.mouseUp = function(event) {
    var currentMouseDownCounter = this.mouseDownCounter;
    this.mouseDownCounter++;
    for (var i = 0; i < this.size.height; i++) {
	for (var j = 0; j < this.size.width; j++) {
	    if (this.drawOverlay[i][j] === currentMouseDownCounter) {
		this.currentGeneration[i][j] = true;
	    } else if (this.drawOverlay[i][j] === -currentMouseDownCounter) {
		this.currentGeneration[i][j] = false;
	    }
	}
    }

    this.currentGenerationChanged = true;

    this.drawAllCells();
}
GameOfLife.prototype.getPatternNames = function(includeCleanAndRandom) {
    var result = [];
    if (includeCleanAndRandom === true) {
	result.push("clean");
	result.push("random");
    }
    for ( var pattern in this.namedPatterns) {
	if (includeCleanAndRandom === true
		|| (pattern !== "clean" && pattern !== "random")) {
	    result.push(pattern);
	}
    }
    return result;
}
GameOfLife.prototype.defaultNamedPatterns = {
    "glider-gun" : {
	0 : [ 24 ],
	1 : [ 22, 24 ],
	2 : [ 12, 13, 20, 21, 34, 35 ],
	3 : [ 11, 15, 20, 21, 34, 35 ],
	4 : [ 0, 1, 10, 16, 20, 21 ],
	5 : [ 0, 1, 10, 14, 16, 17, 22, 24 ],
	6 : [ 10, 16, 24 ],
	7 : [ 11, 15 ],
	8 : [ 12, 13 ],
    },
    "line" : {
	0 : [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
		19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
		35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
		51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66,
		67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82,
		83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98,
		99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111,
		112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123,
		124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134, 135,
		136, 137, 138, 139, 140, 141, 142, 143, 144, 145, 146, 147,
		148, 149, 150, 151, 152, 153, 154, 155, 156, 157, 158, 159,
		160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171,
		172, 173, 174, 175, 176, 177, 178, 179, 180, 181, 182, 183,
		184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195,
		196, 197, 198, 199 ]
    },
}
GameOfLife.prototype.defaultModes = [ {
    title : "23/3 - Conway's Original Game Of Life",
    value : "23/3|random"
}, {
    title : "23/3 - Conway's Original Game Of Life - Line",
    value : "23/3|line|+100x110|400x221|1ms|nogrid"
}, {
    title : "23/3 - Conway's Original Game Of Life - Glider Gun",
    value : "23/3|glider-gun"
}, {
    title : "01234678/0123478 - Anti-Conway",
    value : "01234678/0123478|random|torus"
}, {
    title : "1357/1357 - Copyworld",
    value : "1357/1357|torus|100x100"
}, {
    title : "02468/02468 - Anti-Copyworld",
    value : "02468/02468|torus|100x100"
}, {
    title : "02468/02468 - Anti-Copyworld - Dead Border",
    value : "02468/02468|+20x20|dead|200x200|nogrid|10ms"
}, {
    title : "12345/3 - Labyrinth",
    value : "12345/3|torus|10ms"
}, {
    title : "45678/5678 - Majorities",
    value : "45678/5678|random|10ms"
} ]
GameOfLife.prototype.defaultDefaultSettings = {
    rules : {
	keepAlive : [ false, false, true, true, false, false, false, false,
		false ],
	revive : [ false, false, false, true, false, false, false, false, false ]
    },
    size : {
	width : 100,
	height : 60,
    },
    patternOffset : {
	i : 0,
	j : 0
    },
    pattern : "clean",
    speed : 100,
    showGrid : true,
    border : "dead",
    maxCanvasSize : {
	width : 1000,
	height : 1000,
    },
    color : {
	border : "#eee",
	grid : "#eee",
	alive : "#000",
	dead : "#fff",
	setAlive : "#33c",
	setDead : "#77c",
    }
}
