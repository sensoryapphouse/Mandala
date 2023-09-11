window.onload = () => {
    'use strict';

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
            .register('./sw.js');
    }
    camStart();
}
// 1. Just Palette - options screen for KScope mode (plain, shades 1 or shades 2, line width, blending, fading, perspective, rectangular, etc.
// 2. LineTo.  Options for random or shades, colours, style (vertical, mirrored etc.)
// Leave this one to Alphabet Paint 3. Filling in - options for picture set
// 3. Balls. Options: size, symetry, grid, perspective
// 4. circles, squares, options for size.
// 5. Painting with filling.
// 6. Full painting and options. 1. Paint, 2. Fill, 3. Stamps, 4. Symetry, 5. Colour style (solid, shades, alternate, etc), 6. Line width, 7. Line style (rectangular, vertical, horizontal, rotating line, line from start, etc), 8. Effects toggles (perspective, fading, blending, fun), 9. blank, 10. Clear
// Cursor style

// Override the function with all the posibilities
// navigator.getUserMedia ||
//     (navigator.getUserMedia = navigator.mozGetUserMedia ||
//     navigator.webkitGetUserMedia || navigator.msGetUserMedia);

var myImageData = null;
var analyserContext = null;
var canvasWidth, canvasHeight;

//var animation;
var canvas;
var canvas2;
var colPick;
var Param1 = 0.0;
var Param2 = 0.0;
var Param3 = 0.0;
var index = 0;
var screenState = 0;
var splash;
var button = [];
var touches = [];
var pal = [];
var stamps = [];
var palette;
var toolbar;
var toolbar2;
var toolButtons = [];
var toolButtons2 = [];
var crosshairs;
var doingFun = 0;
var fun1;
var fun2;
var fun3;
var settings;
var aspect;
var nAgt = navigator.userAgent;
var mouseX = 0.5;
var mouseY = 0.5;
var scale;
var update = 0;
var btnBlending;
var EOR = 0;
var stampSet = -1;
var paintState = 0; // 0 = paintng, 1 = filling, 2 = stamping
var paintStyle = 0; // 0 = normal, 1 = fan, 2 = rectangular, 3 = crosses, 4 = vertical bars, 5 = circles, 6 = butt, 7 = square, line behind
var tbar2Set = 0;
var mirrorStyle = 3;
var changeColour = 1; // 0: fixed, 3: click, 4: timed, 1: shades, 2: shades 2, 5: random

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "f") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "v") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

var programsArray = new Array();
var current_program;

function initShaders() {
    programsArray.push(createProgram("shader-vs", "shader-1-fs"));
    current_program = programsArray[0];
}

function createProgram(vertexShaderId, fragmentShaderId) {
    var shaderProgram;
    var fragmentShader = getShader(gl, fragmentShaderId);
    var vertexShader = getShader(gl, vertexShaderId);

    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    gl.useProgram(shaderProgram);

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
    shaderProgram.resolutionUniform = gl.getUniformLocation(shaderProgram, "resolution");
    shaderProgram.mouse = gl.getUniformLocation(shaderProgram, "mouse");
    shaderProgram.mouse1 = gl.getUniformLocation(shaderProgram, "mouse1");
    shaderProgram.indexUniform = gl.getUniformLocation(shaderProgram, "index");
    shaderProgram.time = gl.getUniformLocation(shaderProgram, "time");
    shaderProgram.Param1 = gl.getUniformLocation(shaderProgram, "Param1");
    shaderProgram.Param2 = gl.getUniformLocation(shaderProgram, "Param2");
    shaderProgram.Param3 = gl.getUniformLocation(shaderProgram, "Param3");
    return shaderProgram;
}

var webcam;
var texture;

function initTexture() {
    texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
}

var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

var ix = 0.0;
var end;
var st = new Date().getTime();

function setUniforms() {
    end = new Date().getTime();
    gl.uniformMatrix4fv(current_program.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(current_program.mvMatrixUniform, false, mvMatrix);
    gl.uniform2f(current_program.resolutionUniform, canvas2.width, canvas2.height);
    gl.uniform2f(current_program.mouse, mouseX, mouseY);
    // gl.uniform2f(current_program.mouse1, mouseX1, mouseY1);
    // gl.uniform1i(current_program.indexUniform, ix);
    gl.uniform1f(current_program.time, ((end - st) % 1000000) / 1000.0);
    gl.uniform1f(current_program.Param1, Param1);
    gl.uniform1f(current_program.Param2, Param2);
    gl.uniform1f(current_program.Param3, Param3);
}

var cubeVertexPositionBuffer;
var cubeVertexTextureCoordBuffer;
var cubeVertexIndexBuffer;

function initBuffers() {
    cubeVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    vertices = [-1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    cubeVertexPositionBuffer.itemSize = 2;
    cubeVertexPositionBuffer.numItems = 4;

    cubeVertexTextureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    var textureCoords = [0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
    cubeVertexTextureCoordBuffer.itemSize = 2;
    cubeVertexTextureCoordBuffer.numItems = 4;

    cubeVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    var cubeVertexIndices = [0, 1, 2, 0, 2, 3];
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
    cubeVertexIndexBuffer.itemSize = 1;
    cubeVertexIndexBuffer.numItems = 6;
}

function drawScene() {
    gl.viewport(0, 0, canvas2.width, canvas2.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.enable(gl.BLEND);

    mat4.ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0, pMatrix);

    gl.useProgram(current_program);
    mat4.identity(mvMatrix);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
    gl.vertexAttribPointer(current_program.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexTextureCoordBuffer);
    gl.vertexAttribPointer(current_program.textureCoordAttribute, cubeVertexTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.uniform1i(current_program.samplerUniform, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
    setUniforms();
    gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
    gl.bindTexture(gl.TEXTURE_2D, null);
}


var old_time = Date.now();

function tick() {
    // 	if (touches.length == 0)
    // 	{
    // 		if (mouseState == 0) // nothing touching
    //  		mouseX = -1.0;
    // 		if (touchCount > 0) // ie just released
    // 		    player.pause();
    // 	}
    // 	else if (touches.length == 1)
    // 	{
    // 		if (touchCount == 0) { // ie just touched
    // 		 	 PlaySound(1);
    //       	player.loop = true;
    //       }
    // 		mouseX = touches[0].clientX/canvas.scrollWidth; //] (mouseX + 7.0*touches/canvas.scrollWidth)/8.0;
    //		mouseY = 1.0-touches[0].clientY/canvas.scrollHeight; //(mouseY + 7.0*(1.0 - e.clientY/canvas.scrollHeight))/8.0;
    //		mouseX1 = -1.0;
    // 	}
    // 	else if (touches.length >= 2)
    // 	{
    // 		mouseX = touches[0].clientX/canvas.scrollWidth; //] (mouseX + 7.0*touches/canvas.scrollWidth)/8.0;
    //		mouseY = 1.0-touches[0].clientY/canvas.scrollHeight; //(mouseY + 7.0*(1.0 - e.clientY/canvas.scrollHeight))/8.0;
    //     mouseX1 = touches[1].clientX/canvas.scrollWidth; //] (mouseX + 7.0*touches/canvas.scrollWidth)/8.0;
    //		mouseY1 = 1.0-touches[1].clientY/canvas.scrollHeight; //(mouseY + 7.0*(1.0 - e.clientY/canvas.scrollHeight))/8.0;

    // 	}
    // 	touchCount = touches.length;
    requestAnimFrame(tick);
    drawScene();
}

function webGLStart() {
    initShaders();
    initBuffers();
    initTexture();

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    tick();
}

var redIncreasing = 1;
var greenIncreasing = 0;
var blueIncreasing = 1;
var red;
var green;
var blue;

function startShades() {
    if (Math.random() > .5)
        redIncreasing = 1;
    else
        redIncreasing = 0;
    if (Math.random() > .5)
        blueIncreasing = 1;
    else
        blueIncreasing = 0;
    if (Math.random() > .5)
        greenIncreasing = 1;
    else
        greenIncreasing = 0;
    red = Math.floor(Math.random() * 255);
    if (red == 1)
        red = 2;
    green = Math.floor(Math.random() * 255);
    blue = Math.floor(Math.random() * 255);
    return 'rgb(' + red + ',' + green + ',' + blue + ')';
}


function nextShade(f) {
    if (redIncreasing == 1)
        red += f;
    else
        red -= f;
    if (red > 255) {
        redIncreasing = 0;
        red = 255;
    }
    if (red < 0) {
        redIncreasing = 1;
        red = 0;
    }
    if (blueIncreasing)
        blue += f;
    else
        blue -= f;
    if (blue > 255) {
        blueIncreasing = 0;
        blue = 255;
    }
    if (blue < 0) {
        blueIncreasing = 1;
        blue = 0;
    }
    if (greenIncreasing)
        green += f;
    else
        green -= f;
    if (green > 255) {
        greenIncreasing = 0;
        green = 255;
    }
    if (green < 0) {
        greenIncreasing = 1;
        green = 0;
    }
    if (red == 1)
        red = 2;
    return 'rgb(' + red + ',' + green + ',' + blue + ')';
}

var lastColour = -1;

function NewBrightColor() {
    var c;
    lastColour++;
    if (lastColour > 5)
        lastColour = 0;
    switch (lastColour) {
        case 0:
            c = 'red';
            break;
        case 1:
            c = 'lime';
            break;
        case 2:
            c = 'blue';
            break;
        case 3:
            c = 'fuchsia';
            break;
        case 4:
            c = 'yellow';
            break;
        case 5:
            c = 'magenta';
            break;
        default:
            c = 'white';
            break;
    }
    return (c);
}

var count = 0;
var current = 0;
var smoothMax = 0;
var scaleMax = 0;

var mouseState = 0;

function back() {

}

var done = 0;

function doneStart() {

    canvas.style.width = "84vw";
    canvas2.style.width = "84vw";
    paintStyle = 0;
    screenState = 1;
    splash.hidden = true;

    stripey = 0;
    aspect = canvasHeight / canvasWidth;
    canvas2.onmousedown = function (e) {
        colPick.color.hidePicker();
        myImageData = analyserContext.getImageData(0, 0, canvas2.width, canvas2.height);
        mouseX = e.clientX / canvas2.scrollWidth - 0.088;
        mouseY = e.clientY / canvas2.scrollHeight;
        drawPoint(1000 * mouseX, 1000 * mouseY);
        mouseState = 1;
        toolbar2.hidden = true;
        //       colPick.color.hidePicker();
    }
    canvas2.onmousemove = function (e) {
        if (lastInputGpad) {
            lastInputGpad = false;
            mouseState = 0;
        }
        mouseX = e.clientX / canvas2.scrollWidth - 0.088;
        mouseY = e.clientY / canvas2.scrollHeight;
        if (mouseState == 1)
            drawLine(1000 * mouseX, 1000 * mouseY);
    }
    canvas2.onmouseup = function (e) {
        mouseState = 0;
    }
    canvas2.onmouseleave = function (e) {
        mouseState = 0;
    }

    canvas2.addEventListener('touchmove', function (event) {
        event.preventDefault();
        mouseX = event.touches[0].clientX / canvas.scrollWidth - 0.088;
        mouseY = 1.0 - event.touches[0].clientY / canvas.scrollHeight;
        if (event.touches.length == 1) {

            drawLine(1000 * (event.touches[0].clientX / canvas.scrollWidth - 0.088), 1000 * event.touches[0].clientY / canvas.scrollHeight); //(mouseY + 7.0*(1.0 - 
        } else if (event.touches.length > 1) {
            previousX = 1000 * mouseX;
            previousY = 1000 * mouseY;
            drawLine(1000 * (event.touches[1].clientX / canvas.scrollWidth - 0.088), 1000 * event.touches[0].clientY / canvas.scrollHeight);
        }
    }, false);
    canvas2.addEventListener('touchstart', function (event) {
        event.preventDefault();
        myImageData = analyserContext.getImageData(0, 0, canvas2.width, canvas2.height);
        colPick.color.hidePicker();
        mouseX = event.touches[0].clientX / canvas.scrollWidth - 0.088;
        mouseY = 1.0 - event.touches[0].clientY / canvas.scrollHeight;
        if (event.touches.length == 1)
            drawPoint(1000 * mouseX, 1000 * mouseY);
        else if (event.touches.length > 1) {
            previousX = 1000 * mouseX;
            previousY = 1000 * mouseY;
            drawLine(1000 * event.touches[1].clientX / canvas.scrollWidth, 1000 * event.touches[1].clientY / canvas.scrollHeight);
        }
        mouseState = 1;
    }, false);
    canvas2.addEventListener('touchend', function (event) {
        event.preventDefault();
        mouseState = 0;
    }, false);
    canvas2.addEventListener('touchleave', function (event) {
        event.preventDefault();
        mouseState = 0;
    }, false);

    lineWidth = 3;

    palette.hidden = false;
    palette.style.backgroundColor = 'red';

    currentColour = 'red';
    canvas.hidden = false;

    fun1.hidden = true;
    analyserContext.fillStyle = "black";
    analyserContext.fillRect(0, 0, canvas.width, canvas.height);
    analyserContext.fillStyle = "black";

    canvas2.hidden = false;

    colPick.onchange = function (e) {
        palette.style.backgroundColor = '#' + colPick.value;
        currentColour = palette.style.backgroundColor;
        beginShades();
    }
    myImageData = analyserContext.createImageData(canvas.scrollWidth, canvas.scrollHeight);

}

var lastInputGpad = false;



function camStart() {
    splash = document.querySelector('splash');
    palette = document.querySelector('palette');
    toolbar = document.querySelector('toolbar');
    toolbar2 = document.querySelector('toolbar2');
    settings = document.querySelector('settings');
    btnBlending = document.querySelector('blending');
    crosshairs = document.querySelector('crosshairs');
    crosshairs.hidden = true;
    colPick = document.getElementById('myColor');

    fun1 = document.querySelector('fun1');
    fun2 = document.querySelector('fun2');
    fun3 = document.querySelector('fun3');
    canvas = document.getElementById("analyser");
    canvas.style.left = "8vw";
    canvas.style.width = "84vw";
    analyserContext = canvas.getContext('2d');
    analyserContext.imageSmoothingEnabled = false;

    canvas.style.backgroundColor = 'black';
    splash.onclick = function (e) {
        doneStart();
    }

    fun1.onclick = function (e) {
        Param1++;
        if (Param1 > 4)
            Param1 = 0;
    }

    fun2.onclick = function (e) {
        Param2++;
        if (Param2 > 2)
            Param2 = 0;
    }

    fun3.onclick = function (e) {
        Param3++;
        if (Param3 > 1)
            Param3 = 0;
    }

    canvas2 = document.getElementById("webgl-canvas");
    canvas2.style.left = "8vw";
    canvas2.style.width = "92vw";
    canvas2.style.height = "100vh";
    try {
        gl = canvas2.getContext("experimental-webgl");
    } catch (e) {}
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }

    for (var i = 0; i < 11; i++) {
        pal[i] = document.createElement("BTN");
        pal[i].style.position = "absolute";
        pal[i].style.height = "7vh";
        pal[i].style.width = "6vw";
        pal[i].style.left = ".75vw";
        pal[i].style.top = 1.25 + (i + 1) * 9 + "vh";
        pal[i].style.borderStyle = 'outset';
        pal[i].style.borderRadius = "1vh";
        pal[i].style.backgroundSize = "95% 95%";
        pal[i].index = i;
        palette.appendChild(pal[i]);
        pal[i].onclick = function (e) {
            toolbar2.hidden = true;
            colPick.color.hidePicker();
            if (e.currentTarget.index < 10) {
                palette.style.backgroundColor = e.currentTarget.style.backgroundColor;
                currentColour = e.currentTarget.style.backgroundColor;
                beginShades();
            } else {
                colPick.pickerPosition = 'right';
                colPick.color.showPicker();
            }
        }
    }
    /*
        stamps[i] = document.createElement("BTN");
        stamps[i].style.position = "absolute";
        stamps[i].style.height = "9vh";
        stamps[i].style.width = "7.6vw";
        stamps[i].style.left = "0vw";
        stamps[i].style.top = 10 + i * 9 + "vh";
        stamps[i].style.borderStyle = 'ridge';
        stamps[i].style.backgroundSize = "100% 100%";
        stamps[i].style.backgroundColor = 'black';
        stamps[i].hidden = true;
        stamps[i].index = i;
        palette.appendChild(stamps[i]);
        stamps[i].onclick = function (e) {
            if (stampSet >= 0 && e.currentTarget.index == 9) {
                stampSet = 1 - stampSet;
                for (var j = 0; j < 9; j++)
                    stamps[j].style.backgroundImage = "url('images/FillShapes/" + (j + 1 + (10 * stampSet)) + ".png')";
                return;
            }
            if (index == 2)
                imageObj.src = "images/Balls/" + (e.currentTarget.index + 1) + ".png";
            else if (index == 3)
                imageObj.src = "images/FillShapes/" + (e.currentTarget.index + 1 + (10 * stampSet)) + ".png";
            for (var j = 0; j < 10; j++)
                stamps[j].style.backgroundColor = 'black';
            stamps[e.currentTarget.index].style.backgroundColor = 'darkblue';
        }
        stamps[0].style.backgroundColor = 'darkblue';
*/
    for (i = 0; i < 9; i++) {
        toolButtons[i] = document.createElement("BTN");
        toolButtons[i].style.position = "absolute";
        toolButtons[i].style.height = "9vh";
        toolButtons[i].style.width = "6vw";
        toolButtons[i].style.left = ".75vw";
        toolButtons[i].style.top = i * 11 + 1.25 + "vh";
        toolButtons[i].style.borderStyle = 'groove';
        toolButtons[i].style.backgroundSize = "100% 100%";
        toolButtons[i].style.backgroundColor = 'black';
        toolButtons[i].style.borderRadius = "1vh";
        toolButtons[i].index = i;

        toolbar.appendChild(toolButtons[i]);
        toolButtons[i].onclick = function (e) {
            toolbar2.hidden = true;
            if (e.currentTarget.index > 1 && e.currentTarget.index < 7) {
                tbar2Set = e.currentTarget.index;
                for (j = 0; j < 10; j++) {
                    toolButtons2[j].hidden = true;
                    toolButtons2[j].style.backgroundColor = 'black';
                }
                switch (e.currentTarget.index) {
                    case 2: // line width 0-5
                        for (j = 0; j < 6; j++) {
                            toolButtons2[j].style.backgroundImage = "url('images/toolbar2/2" + j + ".png')";
                            toolButtons2[j].hidden = false;
                        }
                        toolButtons2[lineWidth].style.backgroundColor = 'blue';
                        toolbar2.style.height = "48vh";
                        break;
                    case 3: // symetry 0-4
                        for (j = 0; j < 5; j++) {
                            toolButtons2[j].style.backgroundImage = "url('images/toolbar2/3" + j + ".png')";
                            toolButtons2[j].hidden = false;
                        }
                        toolButtons2[mirrorStyle].style.backgroundColor = 'blue';
                        toolbar2.style.height = "40vh";
                        break;
                    case 4: // colour style 0-5
                        for (j = 0; j < 6; j++) {
                            toolButtons2[j].style.backgroundImage = "url('images/toolbar2/4" + j + ".png')";
                            toolButtons2[j].hidden = false;
                        }
                        toolButtons2[changeColour].style.backgroundColor = 'blue';
                        toolbar2.style.height = "48vh";
                        break;
                    case 5: // draw style 0-9
                        for (j = 0; j < 9; j++) {
                            toolButtons2[j].style.backgroundImage = "url('images/toolbar2/5" + j + ".png')";
                            toolButtons2[j].hidden = false;
                        }
                        toolButtons2[paintStyle].style.backgroundColor = 'blue';
                        toolbar2.style.height = "72vh";
                        break;
                    case 6: // various 0-8
                        for (j = 0; j < 8; j++)
                            toolButtons2[j].hidden = false;
                        toolButtons2[0].style.backgroundImage = "url('images/toolbar2/60aniback.png')";
                        toolButtons2[1].style.backgroundImage = "url('images/toolbar2/61anidrawing.png')";
                        toolButtons2[2].style.backgroundImage = "url('images/toolbar2/62wiggle.png')";
                        toolButtons2[3].style.backgroundImage = "url('images/toolbar2/63EOR.png')";
                        toolButtons2[4].style.backgroundImage = "url('images/toolbar2/64blending.png')";
                        toolButtons2[5].style.backgroundImage = "url('images/toolbar2/65perspective.png')";
                        toolButtons2[6].style.backgroundImage = "url('images/toolbar2/66stripey.png')";
                        toolButtons2[7].style.backgroundImage = "url('images/toolbar2/67fading.png')";
                        if (Param2 == 1)
                            toolButtons2[0].style.backgroundColor = 'darkblue';
                        else if (Param2 == 2)
                            toolButtons2[0].style.backgroundColor = 'blue';
                        if (Param3 == 1)
                            toolButtons2[1].style.backgroundColor = 'darkblue';
                        else if (Param3 == 2)
                            toolButtons2[1].style.backgroundColor = 'blue';
                        if (wiggleLineWidth > 0)
                            toolButtons2[2].style.backgroundColor = 'blue';
                        if (EOR > 0)
                            toolButtons2[3].style.backgroundColor = 'blue';
                        if (blending > 0)
                            toolButtons2[4].style.backgroundColor = 'blue';
                        if (perspective > 0)
                            toolButtons2[5].style.backgroundColor = 'blue';
                        if (stripey > 0)
                            toolButtons2[6].style.backgroundColor = 'blue';
                        if (fading > 0)
                            toolButtons2[7].style.backgroundColor = 'blue';
                        toolbar2.style.height = "64vh";
                        break;
                }
                toolbar2.hidden = false;
            }
            if (e.currentTarget.index == 0) {
                Canvas2Image.saveAsJPEG(canvas, canvas.width, canvas.height, "Mandala");
            } else if (e.currentTarget.index == 1) {
                Param1++;
                if (Param1 > 4)
                    Param1 = 0;
            } else if (e.currentTarget.index == 7) {
                analyserContext.putImageData(myImageData, 0, 0);
            } else if (e.currentTarget.index == 8) {
                analyserContext.fillStyle = "black";
                analyserContext.fillRect(0, 0, canvas.width, canvas.height);
            }
        }

        if (i < 10) {
            toolButtons2[i] = document.createElement("BTN");
            toolButtons2[i].style.position = "absolute";
            toolButtons2[i].style.height = "6vh";
            toolButtons2[i].style.width = "6vw";
            toolButtons2[i].style.left = ".33vw";
            toolButtons2[i].style.top = i * 8 + .5 + "vh";
            toolButtons2[i].style.borderStyle = 'groove';
            toolButtons2[i].style.backgroundSize = "100% 100%";
            toolButtons2[i].style.backgroundColor = 'black';
            toolButtons2[i].style.borderRadius = "1vh";
            toolButtons2[i].index = i;

            toolbar2.appendChild(toolButtons2[i]);

            toolButtons2[i].onclick = function (e) {
                toolbar2.hidden = true;
                switch (tbar2Set) {
                    case 2: // line width 0-5
                        lineWidth = e.currentTarget.index;
                        break;
                    case 3: // symetry 0-4
                        mirrorStyle = e.currentTarget.index;
                        break;
                    case 4: // colour style 0-5
                        changeColour = e.currentTarget.index;
                        break;
                    case 5: // draw style 0-9
                        paintStyle = e.currentTarget.index;
                        rectangular = 0;
                        if (paintStyle == 2)
                            rectangular = 1;
                        if (paintStyle == 3)
                            rectangular = 4;
                        if (paintStyle == 4)
                            rectangular = 3;
                        break;
                    case 6: // various 0-6
                        switch (e.currentTarget.index) {
                            case 0: // aniback;
                                Param2++;
                                if (Param2 > 2)
                                    Param2 = 0;
                                break;
                            case 1: // anidrawing;
                                Param3++;
                                if (Param3 > 2)
                                    Param3 = 0;
                                break;
                            case 2: // wiggle
                                wiggleLineWidth = 1 - wiggleLineWidth;
                                break;
                            case 3: // EOR
                                EOR = 1 - EOR;
                                break;
                            case 4: // blending
                                blending = 1 - blending;
                                break;
                            case 5: // perspective
                                perspective = 1 - perspective;
                                break;
                            case 6: // stripey
                                stripey = 1 - stripey;
                                break;
                            case 7: // fading
                                fading = 1 - fading;
                                break;
                        }
                        break;
                }
            }
        }
    }
    toolButtons[0].style.backgroundImage = "url('images/0share.png')";
    toolButtons[1].style.backgroundImage = "url('images/1fun.png')";
    toolButtons[2].style.backgroundImage = "url('images/2width.png')";
    toolButtons[3].style.backgroundImage = "url('images/3mirror.png')";
    toolButtons[4].style.backgroundImage = "url('images/4color.png')";
    toolButtons[5].style.backgroundImage = "url('images/5style.png')";
    toolButtons[6].style.backgroundImage = "url('images/6settings.png')";
    toolButtons[7].style.backgroundImage = "url('images/7undo.png')";
    toolButtons[8].style.backgroundImage = "url('images/8clear.png')";
    //toolButtons[9].hidden = true

    setPaletteColours();
    palette.style.backgroundColor = 'black';
    //    analyserContext.translate(0, canvas2.height);
    //    analyserContext.scale(1, -1);
    webGLStart();

    function MouseClick() {
        var s;
        var elements = document.elementsFromPoint(crosshairs.offsetLeft + (crosshairs.offsetWidth) / 2, crosshairs.offsetTop + (crosshairs.offsetHeight) / 2);
        try {
            mouseState = 1 - mouseState;
            if (elements[0].id == "webgl-canvas") {
                if (mouseState == 1) {
                    mouseX = crosshairs.offsetLeft + (crosshairs.offsetWidth) / 2;
                    mouseY = crosshairs.offsetTop + (crosshairs.offsetHeight) / 2;
                    drawPoint(mouseX * canvas.width / (.84 * window.innerWidth) - canvas.width * .0875, mouseY * canvas.height / window.innerHeight);

                    lastInputGpad = true;
                    mouseX /= canvas.width;
                    mouseY /= canvas.height;
                }
            } else {
                elements[0].click();
                mouseState = 0;
            }
        } catch (e) {}
    }

    function MoveMouse(xm, ym) {
        crosshairs.hidden = false;
        try {
            mouseX = crosshairs.offsetLeft + (crosshairs.offsetWidth) / 2;
            mouseY = crosshairs.offsetTop + (crosshairs.offsetHeight) / 2;
            mouseX += xm;
            mouseY += ym;
            if (mouseX < 10)
                mouseX = 10;
            if (mouseY < 10)
                mouseY = 10;
            if (mouseX >= window.innerWidth - 10)
                mouseX = window.innerWidth - 10;
            if (mouseY >= window.innerHeight - 10)
                mouseY = window.innerHeight - 10;
            console.log('MoveTo: ', mouseX, mouseY);
            crosshairs.style.left = mouseX - crosshairs.offsetWidth / 2 + "px";
            crosshairs.style.top = mouseY - crosshairs.offsetHeight / 2 + "px";
            if (mouseState == 1) {
                drawLine(mouseX * canvas.width / (.84 * window.innerWidth) - canvas.width * .0875, mouseY * canvas.height / window.innerHeight);
            }
            mouseX /= canvas.width;
            mouseY /= canvas.height;
        } catch (e) {}
    }

    function JoystickMoveTo(jy, jx) {
        if (screenState == 1) {
            crosshairs.hidden = false;
            if (Math.abs(jx) < .1 && Math.abs(jy) < .1) {
                try {
                    if (gpad.getButton(14).value > 0) // dpad left
                        MoveMouse(-10, 0);
                    if (gpad.getButton(12).value > 0) // dup
                        MoveMouse(0, -7);
                    if (gpad.getButton(13).value > 0) // ddown
                        MoveMouse(0, 7);
                    if (gpad.getButton(15).value > 0) // dright
                        MoveMouse(10, 0);
                } catch (e) {}
                return;
            }
            if (Math.abs(jx) < .1)
                jx = 0;
            if (Math.abs(jy) < .1)
                jy = 0;
            if (jx == 0 && jy == 0)
                return;
            MoveMouse(jx * 30, jy * 30);
        }
    }

    var currentButton = 0;

    function Highlight() {}

    function showPressedButton(index) {
        if (!splash.hidden) {
            splash.hidden = true;
            return;
        }
        console.log("Press: ", index);
        if (screenState == 0) { // splash screen
            doneStart();

        } else {
            crosshairs.hidden = false;
            switch (index) {
                case 0: // A
                case 8:
                case 9:
                    MouseClick();
                    break;
                case 1: // B - fun animations
                    Param1++;
                    if (Param1 > 4)
                        Param1 = 0;
                    break;
                case 2: // X
                case 8:
                    Param2++;
                    if (Param2 > 2)
                        Param2 = 0;
                    break;
                case 3: // Y
                case 9:
                    Param3++;
                    if (Param3 > 2)
                        Param3 = 0;
                    break;
                case 10: // XBox
                    break;
                case 12: // dpad handled by timer elsewhere
                case 13:
                case 14:
                case 15:
                    break;
                default:
            }
        }
    }

    function removePressedButton(index) {
        console.log("Releasd: ", index);
    }

    function moveJoystick(values, isLeft) {
        if (screenState == 1)
            JoystickMoveTo(values[1], values[0]);
    }

    var gpad;

    function getAxes() {
        //       console.log('Axis', gpad.getAxis(0), gpad.getAxis(1), gpad.getButton(14).value);

        if (screenState == 1) {
            JoystickMoveTo(gpad.getAxis(1), gpad.getAxis(0));
            JoystickMoveTo(gpad.getAxis(3), gpad.getAxis(2));
        }
        setTimeout(function () {
            getAxes();
        }, 50);
    }

    gamepads.addEventListener('connect', e => {
        //        crosshairs.hidden = false;
        console.log('Gamepad connected:');
        console.log(e.gamepad);
        Highlight()
        gpad = e.gamepad;
        e.gamepad.addEventListener('buttonpress', e => showPressedButton(e.index));
        e.gamepad.addEventListener('buttonrelease', e => removePressedButton(e.index));
        //       e.gamepad.addEventListener('joystickmove', e => moveJoystick(e.values, true),
        //            StandardMapping.Axis.JOYSTICK_LEFT);
        //        e.gamepad.addEventListener('joystickmove', e => moveJoystick(e.values, false),
        //            StandardMapping.Axis.JOYSTICK_RIGHT);
        setTimeout(function () {
            getAxes();
        }, 50);
    });

    gamepads.addEventListener('disconnect', e => {
        console.log('Gamepad disconnected:');
        console.log(e.gamepad);
    });

    gamepads.start();
}
//block B button on XBox Controller closing app via back command on
XBox
var systemNavigationManager = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
var systemNavigation = Windows.UI.Core.SystemNavigationManager.getForCurrentView();
systemNavigationManager.addEventListener("backrequested", handleSystemNavigationEvent.bind(this));

function handleSystemNavigationEvent(args) {
    args.handled = true;
    history.back()
}

function setPaletteColours() {
    pal[0].style.backgroundColor = 'white';
    pal[1].style.backgroundColor = 'red';
    pal[2].style.backgroundColor = 'green';
    pal[3].style.backgroundColor = 'blue';
    pal[4].style.backgroundColor = 'yellow';
    pal[5].style.backgroundColor = 'cyan';
    pal[6].style.backgroundColor = 'magenta';
    pal[7].style.backgroundColor = 'teal';
    pal[8].style.backgroundColor = 'orange';
    pal[9].style.backgroundColor = 'rgb(1,0,0)';
    pal[10].style.backgroundImage = "url('images/palette.png')";
    pal[10].style.top = "1.25vh";
    colPick.style.left = "10%";
}

function beginShades() {
    var c = tinycolor(palette.style.backgroundColor).toRgb();
    currentColour = palette.style.backgroundColor;
    red = c.r;
    green = c.g;
    blue = c.b;
    if (red > 128)
        redIncreasing = 0;
    else
        redIncreasing = 1;
    if (blue > 128)
        blueIncreasing = 01;
    else
        blueIncreasing = 1;
    if (green > 128)
        greenIncreasing = 1;
    else
        greenIncreasing = 0;
}

var previousX = 0;
var previousY = 0;
var perspective = 0;
var lineWidth = 4;
var wiggleLineWidth = 0;
var blending = 0; // context.globalCompositeOperation = "multiply"; etc
var fading = 0; // dim the picture to date whenever the mouse moves
var rectangular = 0; // 0: normal, 1: vertical, 2: horizontal, 3: grid, 4: horizontal or vertical
var grid = 0;
var shaderEffects = 0;
var currentColour = 'white';
var stripey = 0; // 0: normal, 1: stripes, 2: boxes

function floodfill_hexToR(h) {
    return parseInt(h.substring(0, 2), 16)
}

function floodfill_hexToG(h) {
    return parseInt(h.substring(2, 4), 16)
}

function floodfill_hexToB(h) {
    return parseInt(h.substring(4, 6), 16)
}

var imageData;
var startR;
var startG;
var startB;

function floodfill_matchTolerance(pixelPos, color, tolerance) {
    var rMax = startR + (startR * (tolerance / 100));
    var gMax = startG + (startG * (tolerance / 100));
    var bMax = startB + (startB * (tolerance / 100));

    var rMin = startR - (startR * (tolerance / 100));
    var gMin = startG - (startG * (tolerance / 100));
    var bMin = startB - (startB * (tolerance / 100));

    var r = imageData.data[pixelPos];
    var g = imageData.data[pixelPos + 1];
    var b = imageData.data[pixelPos + 2];

    return ((
            (r >= rMin && r <= rMax) &&
            (g >= gMin && g <= gMax) &&
            (b >= bMin && b <= bMax)
        ) &&
        !(r == color.r &&
            g == color.g &&
            b == color.b)
    );
}

function floodfill_colorPixel(pixelPos, color) {
    imageData.data[pixelPos] = color.r;
    imageData.data[pixelPos + 1] = color.g;
    imageData.data[pixelPos + 2] = color.b;
    imageData.data[pixelPos + 3] = 255;
}

function floodFill(x, y, context, color, tolerance) {
    pixelStack = [[x, y]];
    width = context.canvas.width;
    height = context.canvas.height;
    pixelPos = (y * width + x) * 4;
    imageData = context.getImageData(0, 0, width, height);
    startR = imageData.data[pixelPos];
    startG = imageData.data[pixelPos + 1];
    startB = imageData.data[pixelPos + 2];
    while (pixelStack.length) {
        newPos = pixelStack.pop();
        x = newPos[0];
        y = newPos[1];
        pixelPos = (y * width + x) * 4;
        while (y-- >= 0 && floodfill_matchTolerance(pixelPos, color, tolerance)) {
            pixelPos -= width * 4;
        }
        pixelPos += width * 4;
        ++y;
        reachLeft = false;
        reachRight = false;
        while (y++ < height - 1 && floodfill_matchTolerance(pixelPos, color, tolerance)) {
            floodfill_colorPixel(pixelPos, color);
            if (x > 0) {
                if (floodfill_matchTolerance(pixelPos - 4, color, tolerance)) {
                    if (!reachLeft) {
                        pixelStack.push([x - 1, y]);
                        reachLeft = true;
                    }
                } else if (reachLeft) {
                    reachLeft = false;
                }
            }
            if (x < width - 1) {
                if (floodfill_matchTolerance(pixelPos + 4, color, tolerance)) {
                    if (!reachRight) {
                        pixelStack.push([x + 1, y]);
                        reachRight = true;
                    }
                } else if (floodfill_matchTolerance(pixelPos + 4 - (width * 4), color, tolerance)) {
                    if (!reachLeft) {
                        pixelStack.push([x + 1, y - 1]);
                        reachLeft = true;
                    }
                } else if (reachRight) {
                    reachRight = false;
                }
            }
            pixelPos += width * 4;
        }
    }
    context.putImageData(imageData, 0, 0);
}

function drawPoint(x, y) {
    var w;
    //    y = 1000 - y; // Changed PB 15/2/18 Changed again 6/10/18
    x -= canvas.width * .008;
    previousX = x;
    previousY = y;

    analyserContext.lineCap = 'round';
    /*   switch (stripey) { // styles
           case 0:
               analyserContext.lineCap = 'round';
               break;
           case 1:
               analyserContext.lineCap = 'butt';
               break;
           case 2:
               analyserContext.lineCap = 'square';
               break;
       } */

    w = 1000 / ((6 - lineWidth) * 15);
    if (perspective == 1) {
        w /= (1000 - y) / canvas.scrollHeight;
        w = Math.min(w, canvas.scrollHeight / 5);
    }
    analyserContext.lineCap = 'round';

    if (paintStyle == 5) {
        analyserContext.lineCap = 'butt';
        w *= 2;
    } else if (paintStyle == 6) {
        analyserContext.lineCap = 'butt';
    } else if (paintStyle == 7) {
        analyserContext.lineCap = 'square';
    }
    analyserContext.lineWidth = w;
    if (EOR == 1)
        analyserContext.globalCompositeOperation = "xor";
    else
        analyserContext.globalCompositeOperation = "source-over";
    if (blending == 1)
        analyserContext.globalAlpha = 0.2;
    else
        analyserContext.globalAlpha = 1.0;
    switch (rectangular) {
        case 1:
            break;
        case 2:
            break;
        case 3:
            x -= x % 50;
            y -= y % 50;
            break;
        case 4:
            break;
    }
    switch (changeColour) {
        case 0:
            break;
        case 1:
            beginShades();
            break;
        case 2:
            beginShades();
            break;
        case 3:
            currentColour = NewBrightColor();
            palette.style.backgroundColor = currentColour;
            break;
        case 4:
            function colourChange() {
                if (changeColour == 4) {
                    currentColour = NewBrightColor();
                    palette.style.backgroundColor = currentColour;
                }
                setTimeout(colourChange, 2000);
            }
            colourChange();
            break;
        case 5:
            currentColour = NewBrightColor();
            palette.style.backgroundColor = currentColour;
            break;
    }

    analyserContext.strokeStyle = currentColour;
    analyserContext.beginPath();
    analyserContext.moveTo(x, y);
    analyserContext.lineTo(x + .01, y);

    switch (mirrorStyle) {
        case 1:
            analyserContext.moveTo(canvas.width - x, y);
            analyserContext.lineTo(canvas.width - x - 0.01, y);
            break;
        case 2:
            analyserContext.moveTo(x, canvas.height - y);
            analyserContext.lineTo(x - 0.01, canvas.height - y);
            break;
        case 3:
            analyserContext.moveTo(canvas.width - x, y);
            analyserContext.lineTo(canvas.width - x - 0.01, y);
            analyserContext.moveTo(x, canvas.height - y);
            analyserContext.lineTo(x - 0.01, canvas.height - y);
            analyserContext.moveTo(canvas.width - x, canvas.height - y);
            analyserContext.lineTo(canvas.width - x - 0.01, canvas.height - y);
            break;
        case 4:
            analyserContext.moveTo(canvas.width - x, y);
            analyserContext.lineTo(canvas.width - x - 0.01, y);
            analyserContext.moveTo(x, canvas.height - y);
            analyserContext.lineTo(x - 0.01, canvas.height - y);
            analyserContext.moveTo(canvas.width - x, canvas.height - y);
            analyserContext.lineTo(canvas.width - x - 0.01, canvas.height - y);

            analyserContext.moveTo(y, x);
            analyserContext.lineTo(y - 0.01, x);
            analyserContext.moveTo(canvas.width - y, x);
            analyserContext.lineTo(canvas.width - y - 0.01, x);
            analyserContext.moveTo(y, canvas.height - x);
            analyserContext.lineTo(y - 0.01, canvas.height - x);
            analyserContext.moveTo(canvas.width - y, canvas.height - x);
            analyserContext.lineTo(canvas.width - y - 0.01, canvas.height - x);
            break;
    }
    analyserContext.stroke();
}


function drawCircle(x, y) {
    var w;
    //    y = 1000 - y; // Changed PB 15/2/18 Changed again 6/10/18
    x -= canvas.width * .008;
    var moved = (Math.abs(x - previousX) + Math.abs(y - previousY)) / 4;
    if (moved > 10)
        moved = 10;
    previousX = x;
    previousY = y;

    analyserContext.lineCap = 'round';

    w = 1000 / ((6 - lineWidth) * 15);
    if (perspective == 1) {
        w /= (1000 - y) / canvas.scrollHeight;
        w = Math.min(w, canvas.scrollHeight / 5);
    }
    w *= moved;
    analyserContext.lineWidth = w;
    if (EOR == 1)
        analyserContext.globalCompositeOperation = "xor";
    else
        analyserContext.globalCompositeOperation = "source-over";
    if (blending == 1)
        analyserContext.globalAlpha = 0.2;
    else
        analyserContext.globalAlpha = 1.0;
    switch (rectangular) {
        case 1:
            break;
        case 2:
            break;
        case 3:
            x -= x % 50;
            y -= y % 50;
            break;
        case 4:
            break;
    }
    switch (changeColour) {
        case 1:
            currentColour = nextShade(2);
            palette.style.backgroundColor = currentColour;
            break;
        case 2:
            currentColour = nextShade(8);
            palette.style.backgroundColor = currentColour;
            break;
        case 5:
            currentColour = NewBrightColor();
            break;
    }

    analyserContext.strokeStyle = currentColour;
    analyserContext.beginPath();
    analyserContext.moveTo(x, y);
    analyserContext.lineTo(x + .01, y);

    switch (mirrorStyle) {
        case 1:
            analyserContext.moveTo(canvas.width - x, y);
            analyserContext.lineTo(canvas.width - x - 0.01, y);
            break;
        case 2:
            analyserContext.moveTo(x, canvas.height - y);
            analyserContext.lineTo(x - 0.01, canvas.height - y);
            break;
        case 3:
            analyserContext.moveTo(canvas.width - x, y);
            analyserContext.lineTo(canvas.width - x - 0.01, y);
            analyserContext.moveTo(x, canvas.height - y);
            analyserContext.lineTo(x - 0.01, canvas.height - y);
            analyserContext.moveTo(canvas.width - x, canvas.height - y);
            analyserContext.lineTo(canvas.width - x - 0.01, canvas.height - y);
            break;
        case 4:
            analyserContext.moveTo(canvas.width - x, y);
            analyserContext.lineTo(canvas.width - x - 0.01, y);
            analyserContext.moveTo(x, canvas.height - y);
            analyserContext.lineTo(x - 0.01, canvas.height - y);
            analyserContext.moveTo(canvas.width - x, canvas.height - y);
            analyserContext.lineTo(canvas.width - x - 0.01, canvas.height - y);

            analyserContext.moveTo(y, x);
            analyserContext.lineTo(y - 0.01, x);
            analyserContext.moveTo(canvas.width - y, x);
            analyserContext.lineTo(canvas.width - y - 0.01, x);
            analyserContext.moveTo(y, canvas.height - x);
            analyserContext.lineTo(y - 0.01, canvas.height - x);
            analyserContext.moveTo(canvas.width - y, canvas.height - x);
            analyserContext.lineTo(canvas.width - y - 0.01, canvas.height - x);
            break;
    }
    analyserContext.stroke();
}

function drawLine(x, y) {
    if (paintStyle == 8) {
        drawCircle(x, y);
        return;
    }
    x -= canvas.width * .008;
    var moved = Math.abs(x - previousX) + Math.abs(y - previousY);
    //    y = 1000 - y; // Changed PB 15/2/18 Changed again 6/10/18
    if (fading == 1) {
        analyserContext.globalAlpha = 0.02;
        analyserContext.fillRect(0, 0, canvas.width, canvas.height);
        analyserContext.globalAlpha = 1.00;
    }
    switch (rectangular) {
        case 3:
            previousY = 1000;
            previouxX = x;
            break;
        case 2:
            previousX = 0;
            previousY = y;
            break;
        case 4:
            x -= x % 50;
            y -= y % 50;
            break;
        case 1:
            if (Math.abs(x - previousX) < Math.abs(y - previousY))
                x = previousX;
            else
                y = previousY;
            break;
    }
    var w = 1000 / ((6 - lineWidth) * 15);
    switch (changeColour) {
        case 1:
            currentColour = nextShade(2);
            palette.style.backgroundColor = currentColour;
            break;
        case 2:
            currentColour = nextShade(8);
            palette.style.backgroundColor = currentColour;
            break;
        case 5:
            currentColour = NewBrightColor();
            break;
    }

    if (perspective == 1) {
        w /= (1000 - y) / canvas.scrollHeight;
        w = Math.min(w, canvas.scrollHeight / 5);
    }
    analyserContext.lineCap = 'round';
    if (paintStyle == 5) {
        analyserContext.lineCap = 'butt';
        w *= 2;
    } else if (paintStyle == 6) {
        analyserContext.lineCap = 'butt';
        w += moved * 2;
    } else if (paintStyle == 7) {
        analyserContext.lineCap = 'square';
        w += moved * 2;
    }
    if (wiggleLineWidth == 1)
        w *= 1 + Math.random() / 2;
    analyserContext.lineWidth = w;
    analyserContext.strokeStyle = currentColour;
    analyserContext.beginPath();
    analyserContext.moveTo(previousX, previousY);
    analyserContext.lineTo(x, y);

    switch (mirrorStyle) {
        case 1:
            analyserContext.moveTo(canvas.width - previousX, previousY);
            analyserContext.lineTo(canvas.width - x, y);
            break;
        case 2:
            analyserContext.moveTo(previousX, canvas.height - previousY);
            analyserContext.lineTo(x, canvas.height - y);
            break;
        case 3:
            analyserContext.moveTo(canvas.width - previousX, previousY);
            analyserContext.lineTo(canvas.width - x, y);
            analyserContext.moveTo(previousX, canvas.height - previousY);
            analyserContext.lineTo(x, canvas.height - y);
            analyserContext.moveTo(canvas.width - previousX, canvas.height - previousY);
            analyserContext.lineTo(canvas.width - x, canvas.height - y);
            break;
        case 4:
            analyserContext.moveTo(canvas.width - previousX, previousY);
            analyserContext.lineTo(canvas.width - x, y);
            analyserContext.moveTo(previousX, canvas.height - previousY);
            analyserContext.lineTo(x, canvas.height - y);
            analyserContext.moveTo(canvas.width - previousX, canvas.height - previousY);
            analyserContext.lineTo(canvas.width - x, canvas.height - y);

            analyserContext.moveTo(previousY, previousX);
            analyserContext.lineTo(y, x);
            analyserContext.moveTo(canvas.width - previousY, previousX);
            analyserContext.lineTo(canvas.width - y, x);
            analyserContext.moveTo(previousY, canvas.height - previousX);
            analyserContext.lineTo(y, canvas.height - x);
            analyserContext.moveTo(canvas.width - previousY, canvas.height - previousX);
            analyserContext.lineTo(canvas.width - y, canvas.height - x);
            break;
    }
    if (stripey > 0) {
        for (var i = 0; i < 2; i++) {
            analyserContext.stroke();
            analyserContext.lineWidth *= .6;
            if (i == 0)
                analyserContext.strokeStyle = 'darkgrey';
            else
                analyserContext.strokeStyle = currentColour;
            switch (mirrorStyle) {
                case 1:
                    analyserContext.moveTo(canvas.width - x, y);
                    analyserContext.lineTo(canvas.width - x - 0.01, y);
                    break;
                case 2:
                    analyserContext.moveTo(x, canvas.height - y);
                    analyserContext.lineTo(x - 0.01, canvas.height - y);
                    break;
                case 3:
                    analyserContext.moveTo(canvas.width - x, y);
                    analyserContext.lineTo(canvas.width - x - 0.01, y);
                    analyserContext.moveTo(x, canvas.height - y);
                    analyserContext.lineTo(x - 0.01, canvas.height - y);
                    analyserContext.moveTo(canvas.width - x, canvas.height - y);
                    analyserContext.lineTo(canvas.width - x - 0.01, canvas.height - y);
                    break;
                case 4:
                    analyserContext.moveTo(canvas.width - x, y);
                    analyserContext.lineTo(canvas.width - x - 0.01, y);
                    analyserContext.moveTo(x, canvas.height - y);
                    analyserContext.lineTo(x - 0.01, canvas.height - y);
                    analyserContext.moveTo(canvas.width - x, canvas.height - y);
                    analyserContext.lineTo(canvas.width - x - 0.01, canvas.height - y);

                    analyserContext.moveTo(y, x);
                    analyserContext.lineTo(y - 0.01, x);
                    analyserContext.moveTo(canvas.width - y, x);
                    analyserContext.lineTo(canvas.width - y - 0.01, x);
                    analyserContext.moveTo(y, canvas.height - x);
                    analyserContext.lineTo(y - 0.01, canvas.height - x);
                    analyserContext.moveTo(canvas.width - y, canvas.height - x);
                    analyserContext.lineTo(canvas.width - y - 0.01, canvas.height - x);
                    break;
            }
        }
    }
    analyserContext.stroke();
    if (paintStyle != 1) {
        previousX = x;
        previousY = y;
    }
}

function doStamp() {
    if (index == 2 || index == 3) {
        var x1 = 1000 * mouseX;
        var y1 = 1000 * mouseY;
        var w;
        switch (lineWidth) {
            case 1:
                w = 20;
                break;
            case 2:
                w = 12;
                break;
            case 3:
                w = 9;
                break;
            case 4:
                w = 6;
                break;
        }
        if (perspective == 1) {
            w /= (1000 - y1) / canvas.scrollHeight;
            w = Math.min(w / 2, 100);
        }
        var x2 = canvas.width / w;
        var y2 = canvas.height / w;
        if (grid == 1) {
            x1 -= x1 % x2;
            y1 -= y1 % y2;
        } else {
            x1 -= x2 / 2;
            y1 -= y2 / 2;
        }

        //        analyserContext.save();
        //        analyserContext.scale(1, -1);
        if (blending == 1)
            analyserContext.globalAlpha = 0.2;

        //      analyserContext.drawImage(imageObj, x1, -y1 - y2, x2, y2);
        switch (mirrorStyle) {
            case 1:
                analyserContext.drawImage(imageObj, canvas.width - x1 - x2, -y1 - y2, x2, y2);
                break;
            case 2:
                analyserContext.drawImage(imageObj, x1, -canvas.height + y1, x2, y2);
                break;
            case 3:
                analyserContext.drawImage(imageObj, canvas.width - x1 - x2, -y1 - y2, x2, y2);
                analyserContext.drawImage(imageObj, x1, -canvas.height + y1, x2, y2);
                analyserContext.drawImage(imageObj, canvas.width - x1 - x2, -canvas.height + y1, x2, y2);
                break;
            case 4:
                analyserContext.drawImage(imageObj, canvas.width - x1 - x2, -y1 - y2, x2, y2);
                analyserContext.drawImage(imageObj, x1, -canvas.height + y1, x2, y2);
                analyserContext.drawImage(imageObj, canvas.width - x1 - x2, -canvas.height + y1, x2, y2);

                analyserContext.drawImage(imageObj, y1, -x1 - x2, x2, y2);
                analyserContext.drawImage(imageObj, y1, -canvas.height + x1, x2, y2);
                analyserContext.drawImage(imageObj, canvas.width - y1 - y2, -x1 - x2, x2, y2);
                analyserContext.drawImage(imageObj, canvas.width - y1 - y2, -canvas.height + x1, x2, y2);

                break;
        }
        //       analyserContext.restore();
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
var imageObj = new Image();

function loadStamp(s) {
    imageObj.src = s;
}
