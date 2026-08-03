(function () {
  'use strict';

  const defaultOptions = {
    sparkColor: '#7f95ff',
    sparkSize: 10,
    sparkRadius: 30,
    sparkCount: 10,
    duration: 500,
    easing: 'ease-out',
    extraScale: 1,
  };

  function easeFunc(t, easing) {
    switch (easing) {
      case 'linear': return t;
      case 'ease-in': return t * t;
      case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      default: return t * (2 - t);
    }
  }

  function ClickSpark(element, options) {
    if (!element) return;

    const opts = Object.assign({}, defaultOptions, options);

    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;display:block;pointer-events:none;user-select:none;z-index:999998;';
    document.body.appendChild(canvas);

    let sparks = [];
    let startTime = 0;
    let animId = null;

    function resize() {
      const rect = element.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    function onResize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', onResize);
    onResize();

    function draw(timestamp) {
      if (!startTime) startTime = timestamp;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      sparks = sparks.filter(function (spark) {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= opts.duration) return false;

        const progress = elapsed / opts.duration;
        const eased = easeFunc(progress, opts.easing);
        const distance = eased * opts.sparkRadius * opts.extraScale;
        const lineLength = opts.sparkSize * (1 - eased);

        const x1 = spark.x + distance * Math.cos(spark.angle);
        const y1 = spark.y + distance * Math.sin(spark.angle);
        const x2 = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const y2 = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        ctx.strokeStyle = opts.sparkColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        return true;
      });

      animId = requestAnimationFrame(draw);
    }

    function handleClick(e) {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const now = performance.now();

      for (let i = 0; i < opts.sparkCount; i++) {
        sparks.push({
          x: x,
          y: y,
          angle: (2 * Math.PI * i) / opts.sparkCount,
          startTime: now,
        });
      }

      if (!animId) {
        startTime = 0;
        animId = requestAnimationFrame(draw);
      }
    }

    element.addEventListener('click', handleClick);

    return {
      destroy: function () {
        element.removeEventListener('click', handleClick);
        window.removeEventListener('resize', onResize);
        cancelAnimationFrame(animId);
        animId = null;
        if (canvas.parentNode) document.body.removeChild(canvas);
      },
    };
  }

  window.ClickSpark = ClickSpark;
})();
