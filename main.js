window.requestAnimationFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    window.msRequestAnimationFrame;

const keyname = {
    32: 'SPACE',
    13: 'ENTER',
    9: 'TAB',
    8: 'BACKSPACE',
    16: 'SHIFT',
    17: 'CTRL',
    18: 'ALT',
    20: 'CAPS_LOCK',
    144: 'NUM_LOCK',
    145: 'SCROLL_LOCK',
    37: 'LEFT',
    38: 'UP',
    39: 'RIGHT',
    40: 'DOWN',
    33: 'PAGE_UP',
    34: 'PAGE_DOWN',
    36: 'HOME',
    35: 'END',
    45: 'INSERT',
    46: 'DELETE',
    27: 'ESCAPE',
    19: 'PAUSE'
};

function Handler(element) {
    this.offset = {x: 0, y: 0};
    this.onClick = null;
    this.hasFocus = true;

    this.bind(element);
    this.reset();
}

Handler.prototype.bind = function (element) {
    this.offset = {x: element.offsetLeft, y: element.offsetTop};

    window.addEventListener('click', e => {
        if (e.target.nodeName !== element.nodeName) {
            this.blur();
        } else {
            this.focus();
        }
    }, false);

    window.addEventListener('blur', () => {
        this.blur();
    }, false);

    element.addEventListener('touchstart', () => {
        return this.mouseDown();
    }, false);

    element.ontouchmove = e => {
        this.mouseMove(e.touches[0].pageX, e.touches[0].pageY);
        return false;
    };

    element.addEventListener('touchend', () => {
        return this.mouseUp();
    }, false);

    document.onmousemove = e => {
        this.mouseMove(e.pageX, e.pageY);
    };

    element.addEventListener('mousedown', () => {
        return this.mouseDown();
    }, false);

    element.addEventListener('mouseup', () => {
        return this.mouseUp();
    }, false);

    document.onselectstart = () => {
        return false;
    }
};

Handler.prototype.blur = function () {
    this.hasFocus = false;
    this.reset();
};

Handler.prototype.focus = function () {
    if (!this.hasFocus) {
        this.hasFocus = true;
        this.reset();
    }
};

Handler.prototype.reset = function () {
    this.keys = {};

    let i = null;

    for (i = 65; i < 128; i++) {
        this.keys[String.fromCharCode(i)] = false;
    }
    for (i in keyname) {
        this.keys[keyname[i]] = false;
    }
    this.mouse = {x: 0, y: 0, down: false};
};

Handler.prototype.mouseDown = function () {
    this.mouse.down = true;
    return this.hasFocus;
};

Handler.prototype.mouseUp = function () {
    this.mouse.down = false;
    if (this.hasFocus && this.onClick) {
        this.onClick(this.mouse.x, this.mouse.y);
    }
};

Handler.prototype.mouseMove = function (x, y) {
    this.mouse.x = clamp(x - this.offset.x, 0, this.width);
    this.mouse.y = clamp(y - this.offset.y, 0, this.height);
};

let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');

canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
document.body.style.margin = 0;
document.body.style.overflow = 'hidden';
ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);

let input = new Handler(canvas);

function Clock() {
    this.running = false;
    this.interval = null;
    this.t0 = new Date();
}

Clock.prototype.tick = function () {
    let t1 = new Date();
    let td = (t1 - this.t0) / 1000;
    this.t0 = t1;
    this.ontick(td);
};

Clock.prototype.start = function (element) {
    this.running = true;
    let f;
    if (window.requestAnimationFrame) {
        window.requestAnimationFrame(f = () => {
            this.tick();
            if (this.running) {
                window.requestAnimationFrame(f, element);
            }
        }, element);
    } else {
        this.interval = window.setInterval(() => {
            this.tick();
        }, 1);
    }
    this.t0 = new Date();
};

Clock.prototype.stop = function () {
    if (this.interval) {
        window.clearInterval(this.interval);
        this.interval = null;
    }
    this.running = false;
};

Clock.prototype.ontick = function () {
    if (input.mouse.down) {
        for (let i = 0; i < 10; i++) {
            particles.push({
                vx: fuzzy(10.0),
                vy: fuzzy(10.0),
                x: input.mouse.x,
                y: input.mouse.y,
                age: 0
            });
        }
    }

    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = composite;
    let alive = [];

    for (let i = 0; i < particles.length; i++) {
        let p = particles[i];
        p.vx = p.vx * 0.8 + getNoise(p.x, p.y, 0) * 4;
        p.vy = p.vy * 0.8 + getNoise(p.x, p.y, 1) * 4;
        p.x += p.vx;
        p.y += p.vy;
        p.age++;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.5, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill();

        if (p.age < max_age) {
            alive.push(p);
        }
    }

    particles = alive;
};

let timer = new Clock();

timer.start();

function clamp(a, b, c) {
    return a < b ? b : (a > c ? c : a);
}

function makeNoise(width, height) {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    let imgData = ctx.getImageData(0, 0, width, height);
    let data = imgData.data;
    let pixels = data.length;

    for (let i = 0; i < pixels; i += 4) {
        data[i] = Math.random() * 255;
        data[i + 1] = Math.random() * 255;
        data[i + 2] = Math.random() * 255;
        data[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);

    return canvas;
}

function makeOctaveNoise(width, height, octaves) {
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');

    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = 1 / octaves;
    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < octaves; i++) {
        let octave = makeNoise(width >> i, height >> i);
        ctx.drawImage(octave, 0, 0, width, height);
    }

    return canvas;
}

let particles = [],
    color = 'rgb(12, 2, 2)',
    composite = 'lighter',
    max_age = 100,
    lineWidth = 1.0,
    noiseCanvas = makeOctaveNoise(canvas.width, canvas.height, 8),
    noise = noiseCanvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;

function clear() {
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function download() {
    window.open(canvas.toDataURL('image/jpeg', 0.9))
}

function getNoise(x, y, channel) {
    return noise[(~~x + ~~y * canvas.width) * 4 + channel] / 127 - 1.0;
}

function fuzzy(range, base) {
    return (base || 0) + (Math.random() - 0.5) * range * 2
}

function toggleItem(elem) {
    for (let i = 0; i < elem.length; i++) {

        elem[i].addEventListener('click', function (e) {

            let current = this;

            for (let i = 0; i < elem.length; i++) {
                if (current !== elem[i]) {
                    elem[i].classList.remove('active');
                } else if (current.classList.contains('active') === true) {
                    current.classList.remove('active');
                } else {
                    current.classList.add('active')
                }
            }

            e.preventDefault();

        }, false);

    }
}

toggleItem(document.querySelectorAll('#colors li'));