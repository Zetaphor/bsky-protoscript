// Clear all body content
function clearBody() {
  document.body.innerHTML = '';
}

function injectAnimatedTiles() {
  // Add CSP meta tag
  const cspMeta = document.createElement('meta');
  cspMeta.httpEquiv = "Content-Security-Policy";
  cspMeta.content = "default-src 'self'; media-src 'self'; style-src 'unsafe-inline';";
  document.head.appendChild(cspMeta);

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    body {
      text-align: center;
      margin: 0;
      overflow: hidden;
    }

    .tiles {
      position: relative;
      height: 100vh;
      height: calc(var(--vh, 1vh) * 100);
      margin: 0 auto;
      z-index: 1;
    }

    .tile {
      float: left;
      width: 50%;
      height: 50%;
      box-sizing: border-box;
      font-size: 400px;
      font-weight: bold;
      overflow: hidden;
      margin: 0;
      padding: 0;
      font-family: serif;
    }

    .fliph {
      transform: scaleX(-1);
    }

    .flipv {
      transform: scaleY(-1);
    }

    .flipv2 {
      transform: scaleY(-1) rotate(180deg);
    }

    .fliphv {
      transform: rotate(90deg);
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .animation {
      display: inline-block;
      animation: rotate 3s linear infinite;
    }
  `;
  document.head.appendChild(style);

  // Create and inject audio element
  const audioBackground = document.createElement('audio');
  audioBackground.src = 'rick.mp3'; // Replace with the actual path to your MP3 file
  audioBackground.loop = true;
  audioBackground.autoplay = true;
  document.body.appendChild(audioBackground);

  // Create and inject HTML elements for tiles
  const tilesContainer = document.createElement('div');
  tilesContainer.className = 'tiles';

  const tileClasses = ['', 'fliph', 'flipv', 'fliph flipv2'];
  for (const classes of tileClasses) {
    const tile = document.createElement('div');
    tile.className = `tile ${classes}`;
    const animation = document.createElement('div');
    animation.className = 'animation';
    animation.textContent = '😫';
    tile.appendChild(animation);
    tilesContainer.appendChild(tile);
  }

  document.body.appendChild(tilesContainer);
}

clearBody();
injectAnimatedTiles();
