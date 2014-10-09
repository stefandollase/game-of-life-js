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

    this.state = this.createState();
    this.setupSettings(parameters);
    this.setupModes(parameters);
    this.setupUI(parameters);
    this.initPattern();
    this.resize();
    this.state.fireChangedForAll();

    this.drawAllCells();
}
GameOfLife.prototype.createState = function() {
    var that = this;
    var callThatFunction = function(functionName) {
	return function() {
	    that[functionName].call(that);
	};
    }
    return new AppStateBinder(
	    {
		autoplay : {
		    type : "flag",
		    changed : callThatFunction("updateAutoplay"),
		},
		nogrid : {
		    type : "flag",
		    changed : callThatFunction("updateShowGrid"),
		},
		patternData : {
		    type : "json",
		    changed : callThatFunction("updatePattern"),
		},
		pattern : {
		    type : "option",
		    changed : callThatFunction("updatePattern"),
		    options : this.getPatternNames(),
		},
		border : {
		    type : "option",
		    changed : callThatFunction("updateBorder"),
		    options : [ "torus", "alive", "dead" ],
		},
		speed : {
		    type : "number",
		    changed : callThatFunction("updateSpeed"),
		    prefix : "",
		    suffix : "ms",
		    min : 0,
		    max : 10000,
		},
		size : {
		    type : "numberObject",
		    changed : callThatFunction("updateSize"),
		    separators : [ "", "x", "" ],
		    attributes : [ "width", "height" ],
		    ranges : {
			"width" : [ 1, 500 ],
			"height" : [ 1, 500 ],
		    },
		},
		patternOffset : {
		    type : "numberObject",
		    changed : callThatFunction("updatePatternOffset"),
		    separators : [ "+", "x", "" ],
		    attributes : [ "j", "i" ],
		    ranges : {
			"j" : [ 0, 499 ],
			"i" : [ 0, 499 ],
		    },
		},
		rules : {
		    type : "custom",
		    changed : callThatFunction("updateRules"),
		    parse : function(stringValue) {
			if (!that.stringContains(stringValue, "/")) {
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
GameOfLife.prototype.stringContains = function(value, contains) {
    return (value.indexOf(contains) >= 0);
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
    } else if (pattern !== false) {
	this.pattern = this.namedPatterns[pattern];
    } else if (patternData !== false) {
	this.pattern = patternData;
    } else if (this.defaultSettings.pattern === "random") {
	this.pattern = "random";
    } else if (this.isString(this.defaultSettings.pattern)) {
	this.pattern = this.namedPatterns[this.defaultSettings.pattern];
    } else if (this.defaultSettings.pattern !== false) {
	this.pattern = this.defaultSettings.pattern;
    } else {
	this.pattern = {};
    }
    this.initPattern();
    this.drawAllCells();
}
GameOfLife.prototype.updatePatternOffset = function() {
    this.setStateOrDefault("patternOffset");
    this.initPattern();
    this.drawAllCells();
}
GameOfLife.prototype.updateSize = function() {
    this.setStateOrDefault("size");
    this.setupMatrices();
    this.resize();
    this.initPattern();
    this.drawAllCells();
}
GameOfLife.prototype.updateRules = function() {
    this.setStateOrDefault("rules");
}
GameOfLife.prototype.updateSpeed = function() {
    this.setStateOrDefault("speed");
    this.restartIfRunning();
}
GameOfLife.prototype.updateShowGrid = function() {
    this.showGrid = !this.state.isSet("nogrid");
    this.resize();
    this.drawAllCells();
}
GameOfLife.prototype.updateBorder = function() {
    this.setStateOrDefault("border");
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
GameOfLife.prototype.setupUI = function(parameters) {
    this.html = {};
    if (this.isString(parameters.container)) {
	this.html.container = document.getElementById(parameters.container);
    } else {
	this.html.container = parameters.container;
    }

    this.setupUIWindow();
    this.html.startButton = this.setupUIButton("Start", "toggleRunning");
    this.setupUIButton("Step", "step");
    this.setupUIButton("Clear", "initNamedPattern", [ "clean" ]);
    this.setupUIButton("Random", "initNamedPattern", [ "random" ]);
    this.setupUIButton("Export", "exportCurrentGeneration");
    this.setupUIButton("Quicker", "increaseSpeed", [ 0.5 ]);
    this.setupUIButton("Slower", "increaseSpeed", [ 2 ]);
    this.setupUIButton("Toggle Grid", "toggleGrid");
    this.setupUIButton("Toggle Border", "toggleBorder");
    this.setupUICanvas();
    this.setupUIModeList();
}
GameOfLife.prototype.setupUIWindow = function() {
    var that = this;
    window.addEventListener('resize', function() {
	that.resize();
	that.drawAllCells();
    }, false);
}
GameOfLife.prototype.setupUIButton = function(title, callback, parameterArray) {
    parameterArray = parameterArray || [];
    var button = document.createElement("button");
    button.innerHTML = title;
    var callbackFunction;
    var that = this;
    if (this.isString(callback)) {
	callbackFunction = function() {
	    that[callback].apply(that, parameterArray);
	};
    } else {
	callbackFunction = function() {
	    callback.apply(that, parameterArray);
	};
    }
    button.addEventListener('click', callbackFunction, false);
    this.html.container.appendChild(button);
    return button;
}
GameOfLife.prototype.setupUICanvas = function() {
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
    this.html.container.appendChild(this.html.canvas);

    this.html.context = this.html.canvas.getContext("2d");
}
GameOfLife.prototype.setupUIModeList = function() {
    this.html.modeList = document.createElement("ul");
    this.html.modeList.style.listStyle = "none";
    this.html.modeList.style.marginLeft = 0;
    for (var i = 0; i < this.modes.length; i++) {
	var modeListElement = document.createElement("li")
	var modeLink = document.createElement("a")
	modeLink.innerHTML = this.modes[i].title;
	modeLink.setAttribute("href", "#" + this.modes[i].href);
	modeListElement.appendChild(modeLink);
	this.html.modeList.appendChild(modeListElement);
    }
    this.html.container.appendChild(this.html.modeList);
}
GameOfLife.prototype.initNamedPattern = function(name) {
    this.state.set("pattern", name, true);
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
GameOfLife.prototype.increaseSpeed = function(factor) {
    var newSpeed = (this.speed * factor) | 0;
    if (newSpeed < 1) {
	newSpeed = 1;
    } else if (newSpeed > 10000) {
	newSpeed = 10000;
    }
    this.state.set("speed", newSpeed);
}
GameOfLife.prototype.toggleGrid = function() {
    this.state.toggle("nogrid");
}
GameOfLife.prototype.toggleBorder = function() {
    this.state.toggle("border");
}
GameOfLife.prototype.initPattern = function() {
    var wasRunning = this.isRunning();
    this.stop();

    this.setupMatrices();

    if (this.pattern === "random") {
	this.createRandomPattern();
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
    this.html.canvas.width = this.html.canvas.parentNode.offsetWidth;
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
	this.html.context.strokeStyle = "#eee";
	this.html.context.stroke();
    }
}
GameOfLife.prototype.drawBorder = function() {
    this.drawHorizontalLine(0);
    this.drawHorizontalLine(this.size.height);
    this.drawVerticalLine(0);
    this.drawVerticalLine(this.size.width);
    this.html.context.strokeStyle = "#eee";
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
	this.html.context.fillStyle = "#33c";
	this.html.context.fillRect(x, y, width, height);
    } else if (this.drawOverlay[i][j] === -this.mouseDownCounter) {
	this.html.context.fillStyle = "#77e";
	this.html.context.fillRect(x, y, width, height);
    } else if (isAlive) {
	this.html.context.fillStyle = "#000";
	this.html.context.fillRect(x, y, width, height);
    } else {
	this.html.context.clearRect(x, y, width, height);
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
GameOfLife.prototype.toggleRunning = function() {
    if (this.isRunning()) {
	this.stop();
    } else {
	this.start();
    }
}
GameOfLife.prototype.isRunning = function() {
    return !(this.timer === false);
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
GameOfLife.prototype.getPatternNames = function() {
    var result = [ "random" ];
    for ( var pattern in this.namedPatterns) {
	result.push(pattern);
    }
    return result;
}

GameOfLife.prototype.namedPatterns = {
    "clean" : {},
    "cell1" : {
	0 : [ 4 ],
	1 : [ 2, 3, 5, 6 ],
	2 : [ 1, 6 ],
	3 : [ 0, 7 ],
	4 : [ 0, 1, 2, 4, 5, 6 ],
	5 : [ 2, 3, 5 ],
    },
    "cell2" : {
	0 : [ 2, 3, 4 ],
	1 : [ 1, 2, 3, 4, 5 ],
	2 : [ 0, 1, 2, 3, 4 ],
	3 : [ 0, 1, 2, 3, 4 ],
	4 : [ 1, 2 ],
    },
    "nice" : {
	0 : [ 0, 1, 2, 4, 5, 6 ],
	1 : [ 0, 6 ],
	2 : [ 0, 1, 2, 4, 5, 6 ],
    },
    "h2o" : {
	0 : [ 0, 3, 9, 10, 11, 12 ],
	1 : [ 0, 3, 9, 12 ],
	2 : [ 0, 3, 6, 9, 12 ],
	3 : [ 0, 1, 2, 3, 5, 6, 7, 9, 12 ],
	4 : [ 0, 3, 6, 9, 12 ],
	5 : [ 0, 3, 9, 12 ],
	6 : [ 0, 3, 9, 10, 11, 12 ],
	7 : [ 4, 5 ],
	8 : [ 5 ],
	9 : [ 4 ],
	10 : [ 4, 5 ],
    },
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
};
GameOfLife.prototype.defaultModes = [ {
    title : "23/3 - Conway's Original Game Of Life",
    href : "23/3|random"
}, {
    title : "23/3 - Conway's Original Game Of Life - Nice",
    href : "23/3|nice|+20x20"
}, {
    title : "23/3 - Conway's Original Game Of Life - Glider Gun",
    href : "23/3|glider-gun"
}, {
    title : "1357/1357 - Copyworld",
    href : "1357/1357|cell1|+20x20"
}, {
    title : "12345/3 - Labyrinth",
    href : "12345/3|cell1|+20x20"
}, {
    title : "0123/01234 - Blink",
    href : "0123/01234|random"
}, {
    title : "01234678/0123478 - Anti-Conway",
    href : "01234678/0123478|random"
}, {
    title : "02468/02468 - Anti-Copyworld",
    href : "02468/02468|cell1|+20x20"
}, {
    title : "02468/02468 - Anti-Copyworld - Clean",
    href : "02468/02468|clean|+20x20|200x200|nogrid|1ms"
}, {
    title : "012345678/3 - Growing Cancer",
    href : "012345678/3|cell1|+20x20"
}, {
    title : "45678/5678 - Majorities",
    href : "45678/5678|random"
}, {
    title : "2468/2468 - H₂O - Chemical Balance",
    href : "2468/2468|h2o|+20x20"
}, {
    title : "23/3 - Line",
    href : "23/3|line|+100x110|400x221|1ms|nogrid"
} ];
GameOfLife.prototype.defaultDefaultSettings = {
    rules : {
	keepAlive : [ false, false, true, true, false, false, false, false,
		false ],
	revive : [ false, false, false, true, false, false, false, false, false ]
    },
    size : {
	width : 100,
	height : 50
    },
    patternOffset : {
	i : 0,
	j : 0
    },
    pattern : {},
    speed : 100,
    showGrid : true,
    border : "dead",
};
