game-of-life-js
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
  var gof = new GameOfLife({
    container : "gol-container"
  });
</script>
```

### License

The library is licensed under the MIT License.
