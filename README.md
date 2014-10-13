Conway's Game of Life
===============

Conway's Game of Life is a cellular automaton developed by John Horton Conway in 1970. You can find more information about it [here](http://en.wikipedia.org/wiki/Conway%27s_Game_of_Life).

### Example

This is my Javascript implementation of Conway's Game of Life ([demo](http://stefandollase.github.io/game-of-life-js/)).

### Use it on your website

```html
<div id="gol-container"></div>
<script src="http://stefandollase.github.io/app-state-binder-js/cdn/app-state-binder.latest.min.js"></script>
<script src="http://stefandollase.github.io/game-of-life-js/cdn/game-of-life.latest.min.js"></script>
<script>
  var gol = new GameOfLife({
    container : "gol-container"
  });
</script>
```

You may want to wait for the first stable release.

### Settings

You can pass the following settings to the GameOfLife constructor:

```js
var gol = new GameOfLife({
  container : "gol-container",
  settings: {
    rules : {
      keepAlive : [ false, false, true, true, false, false, false, false, false ],
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
  },
  patterns: {
  	glider: {
  	  0: [0, 1, 2],
  	  1: [0],
  	  2: [1],
  	}
  },
  modes: [
    {
      title : "23/3 - Conway's Original Game Of Life",
      value : "23/3|random|torus"
    }, {
      title : "01234678/0123478 - Anti-Conway",
      value : "01234678/0123478|random|torus"
    }
  ],
});
```

### License

The library is licensed under the MIT License.
