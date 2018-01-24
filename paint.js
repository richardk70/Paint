'use strict'


// document.addEventListener('click', (e) => {
//     console.log(e.target);
// });


// GLOBAL variables
const mainCanvas = document.getElementById('mainCanvas');
const ctx = mainCanvas.getContext('2d');
const box = mainCanvas.getBoundingClientRect();
let isDown = false;
const canvas = document.createElement("canvas"); // cursor canvas
const custom = document.getElementById('custom');
const toolbar = document.getElementById('toolbar');
const topBar = document.getElementById('top-bar');
const pickerColor = document.getElementById('color');
const softness = document.getElementById('softness');
const opacity = document.getElementById('opacity');
let toolSize = 20;
let eyedrop = "";
let colorOveride = false;
const cx = document.getElementById('size').getContext('2d');
let activeTool = {};

// for 'drag' tools (line, circle)
let start = { "x": 0, "y": 0 },
current = { "x": 0, "y": 0 },
end = { "x": 0, "y": 0 };

let x = [], y = [];

// the offscreen canvas
const tempCanvas = document.getElementById('tempCanvas');
tempCanvas.width = mainCanvas.width;
tempCanvas.height = mainCanvas.height;
const ctx2 = tempCanvas.getContext('2d');


// assign color to active tool
pickerColor.addEventListener('change', (e)=>{
    if (!activeTool)
        activeTool = brush;
    else {
        // change color of active tool
        activeTool.color = pickerColor.value;
    }
});

// assign softness to active tool
softness.addEventListener('change', (e)=>{
    if (!activeTool)
        activeTool = brush;
    else {
        // change color of active tool
        activeTool.softness = softness.value;
        document.getElementById('softnessValue').textContent = softness.value;
    }
});

// assign opacity to active tool
opacity.addEventListener('change', (e)=>{
    if (!activeTool)
        activeTool = brush;
    else {
        // change color of active tool
        activeTool.opacity = opacity.value/10;
        document.getElementById('opacityValue').textContent = activeTool.opacity;
    }
});

// which command button is pressed
topBar.addEventListener('click', (e)=>{
    switch (e.target.id){
        case 'load': loadImg();
        break;
        case 'save': saveFile();
        break;
        case 'clear': clearCanvas();
    }
});

function activateIcon(e){
    // deactivate all icons
    var icons = Array.from(document.getElementsByClassName('icon'));
    
    for (var i = 0; i < icons.length; i++){
        var bgImage = inactiveLookup[icons[i].id]();
        icons[i].style.backgroundImage = 'url(' + bgImage  + ')';
    }
    
    // activate correct icon
    activeTool = activeLookup[e.target.id]();
    document.getElementById(e.target.id).style.backgroundImage = 'url(' + activeTool + ')';
}

function init(tool){
    activeTool = tool;
    if (colorOveride == true)
        tool.color = eyedrop;

    pickerColor.value = tool.color;
    toolSize = tool.size;
    document.getElementById('brushSizeValue').textContent = toolSize;
    drawBrushSize();
    softness.value = tool.softness;
    document.getElementById('softnessValue').textContent = softness.value;
    opacity.value = tool.opacity*10;
    document.getElementById('opacityValue').textContent = opacity.value/10;

    //loadCursor();

    colorOveride = false;
}

// which tool is clicked
toolbar.addEventListener('click', (e)=>{
    activateIcon(e);
    cleanAll();

    switch (e.target.id){
        case 'iBrush':  init(brush);
                        loadBrushPencilEraser();
        break;
        case 'iPencil': init(pencil);
                        loadBrushPencilEraser();
        break;
        case 'iSpray':  init(spray);
                        loadSpray();
        break;
        case 'iText':   init(text);
                        loadText();
        break;
        case 'iLine':   init(line);
                        loadLine();
        break;
        case 'iArc':    init(arc);
                        loadArc();
        break;
        case 'iErase':  init(eraser);
                        loadBrushPencilEraser();
        break;
        case 'iFill':   init(fill);
                        loadFill();
        break;
        case 'iPick':   init(picker);
                        loadPicker();
        break;
    }
});

var inactiveLookup = {
    "iBrush": ()=> "Images/brush.jpg",
    "iPencil": ()=> "Images/pencil.jpg",
    "iSpray": ()=> "Images/spray.jpg",
    "iText": ()=> "Images/text.jpg",
    "iLine": ()=> "Images/line.jpg",
    "iArc": ()=> "Images/arc.jpg",
    "iErase": ()=> "Images/eraser.jpg",
    "iFill": ()=> "Images/fill.jpg",
    "iPick": ()=> "Images/picker.jpg"
}

var activeLookup = {
    "iBrush": ()=> "Images/brush_ACTIVE.jpg",
    "iPencil": ()=> "Images/pencil_ACTIVE.jpg",
    "iSpray": ()=> "Images/spray_ACTIVE.jpg",
    "iText": ()=> "Images/text_ACTIVE.jpg",
    "iLine": ()=> "Images/line_ACTIVE.jpg",
    "iArc": ()=> "Images/arc_ACTIVE.jpg",
    "iErase": ()=> "Images/eraser_ACTIVE.jpg",
    "iFill": ()=> "Images/fill_ACTIVE.jpg",
    "iPick": ()=> "Images/picker_ACTIVE.jpg"
}

// convert hex color to RGB (so I can add opacity)
function hex2RGB(hex){
    var hexArr = hex.split('');
    hexArr.shift();
    var hex2 = hexArr.join('');
    var bigint = parseInt(hex2, 16);
    var r = (bigint >> 16) & 255;
    var g = (bigint >> 8) & 255;
    var b = bigint & 255;
    return `${r}, ${g}, ${b}`;
}

// convert RGB to hex 
function rgb2hex(r,g,b){
    var rgb = b | (g << 8) | (r << 16);
    return '#' + (0x1000000 + rgb).toString(16).slice(1);
}

// adjusting brush size 
document.addEventListener('keydown', (e)=>{
    if (e.key==='['){
        if (toolSize <= 1)
            toolSize = 1;
        else
            toolSize -= activeTool.increment;
       // tool.smaller();
    }
    if (e.key===']'){
        toolSize += activeTool.increment;
        //tool.larger();
    }
    activeTool.size = toolSize;
    document.getElementById('brushSizeValue').textContent = toolSize;
    drawBrushSize();
});

function drawBrushSize(){
    activeTool.toolSize = toolSize;
    cx.clearRect(0,0,100,100);
    cx.beginPath();
    cx.arc(50,50,toolSize,0,2*Math.PI);
    cx.strokeStyle = '#000000';
    cx.stroke();
}

// TOOL OBJECT /////////////////////////////////////////////////////
function Tool(name, color, size, increment, opacity, softness, cursor){
    this.name = name;
    this.color = color;
    this.size = size;
    this.increment = increment;
    this.opacity = opacity;
    this.softness = softness;
    this.cursor = cursor;
}

// initial tool settings
var brush = new Tool('brush', '#9F000F', 10, 5, 10, 0.5, '\uf1fc');
var pencil = new Tool('pencil', '#34282C', 2, 1, 10, 0, '\uf040');
var spray = new Tool('spray', '#9F000F', 20, 10, 10, 0, '\uf2cc');
var text = new Tool('text', '#000000', 18, 4, 10, 0, '\uf246');
var line = new Tool('line', '#000000', 1, 1, 10, 0, '\uf178');
var arc = new Tool('arc', '#0000A0', 1, 2, 10, 0, '\uf0b0');
var eraser = new Tool('eraser', '#FFFFFF', 20, 5, 10, 0.25, '\uf12d');
var fill = new Tool('fill', '#00FF00', 0, 0, 10, 0, '\uf0b0');
var picker = new Tool('picker', '#000000',1,0,0,0, '\uf05b');

text.font = 'Arial';

// CLEAN UP LISTENERS
function cleanAll(){
    // release SPRAY event listeners
    tempCanvas.removeEventListener('mousedown', drawSpray );
    // release FILL 
    tempCanvas.removeEventListener('click', startFill);
    // release LINE and ARC event listeners
    tempCanvas.removeEventListener('mousedown', down);
    tempCanvas.removeEventListener('mousemove', drag);
    tempCanvas.removeEventListener('mouseup', release);
    // release TEXT event listener
    tempCanvas.removeEventListener('click', printIt);
    // release BRUSH, PENCIL, ERASER event listeners
    tempCanvas.removeEventListener('mousemove', brushDrag);
    tempCanvas.removeEventListener('mouseup', brushRelease);

    tempCanvas.removeEventListener('click', getColor);
}

// SPRAY ///////////////////////////////////////
function loadSpray(){
    var timeout = 0, x = 0, y = 0;
    // show color
    pickerColor.value = spray.color;
    tempCanvas.addEventListener('mousedown', drawSpray ); 
}

function drawSpray(e, timeout){
    ctx.lineJoin = ctx.lineCap = 'round';
    var x = spray.x = Math.floor(e.x - box.left);
    var y = spray.y = Math.floor(e.y - box.top);
    var color = hex2RGB(pickerColor.value);

    timeout = setTimeout(function draw(){
        for (var i = 50; i--; ){
            var angle = getRandomFloat(0, Math.PI*2);
            var radius = getRandomFloat(0, toolSize);
            ctx.fillStyle = 'rgba(' + color + ',' + activeTool.opacity + ')';
            ctx.fillRect(
                x + radius * Math.cos(angle),
                y + radius * Math.sin(angle),
                1,1);
            }

            if (!timeout) return;
            timeout = setTimeout(draw, 50);
        }, 50);
    tempCanvas.addEventListener('mousemove', (e)=>{
        x = spray.x = Math.floor(e.x - box.left);
        y = spray.y = Math.floor(e.y - box.top);
    });
    tempCanvas.addEventListener('mouseup', ()=>{
        clearTimeout(timeout);
        backToDefault();
    });
}

// FILL ////////////////////////////////////////////////////////////

function loadFill(e){
    tempCanvas.addEventListener('click', startFill);
}

var fillX = 0, fillY = 0;
var startX = 0, startY=0;
var pixelStack = [];
var r = 0, g = 0, b = 0;

function compare(newPixel){
    if ((newPixel.data[0] === r) && 
        (newPixel.data[1] === g) && 
        (newPixel.data[2] === b)) {
        return true;
    }
    else return false;
}

var checkUp = function(){
    if (fillY > 0) {
        // get color value of next pixel up
        var up1 = ctx.getImageData(fillX, fillY - 1, 1, 1);
        // if the colors match
        return compare(up1);
    }
};

var checkDown = function(){
    // get color value of next pixel down
    var down1 = ctx.getImageData(fillX, fillY + 1, 1, 1);
    // if the colors match
    return compare(down1);
};

var checkLeft = function(){
    // get color of next pixel to the left
    var left1 = ctx.getImageData(fillX - 1, fillY, 1, 1);
    // if the colors match
    return compare(left1);
};

var checkRight = function(){
    // get color of pixel to the right
    var right1 = ctx.getImageData(fillX + 1, fillY, 1, 1);
    // if the colors match
    return compare(right1);
};

function moveUp(){
    fillY = fillY - 1;
}

function startFill(e){
    pixelStack = [];
    // get the x and y coords of the click
    startX = Math.floor(e.x - box.x);
    startY = Math.floor(e.y - box.y);
    // get the color of the area to be filled
    var original = ctx.getImageData(startX, startY, 1, 1);

    // break it into its RGB components
    r = original.data[0];
    g = original.data[1];
    b = original.data[2];
    fillX = startX; 
    fillY = startY;
    startFilling();
    pixelStack = [];
}

function startFilling(){
    while (checkUp()){
        moveUp();
    }
    fillDown();
}

function fillDown(){
    fillPixel();
    while (checkDown() && isWithinBounds()) {
        if (checkRight()){
            pixelStack.push([fillX + 1, fillY]);
        }
        if (checkLeft()){
            pixelStack.push([fillX - 1, fillY]);
        }
        console.log(pixelStack.length);
        fillY = fillY + 1; // move down a pixel
        fillPixel();
    }
    // when done putting in the 'down' line,
    // go to the first entry in the pixelStack
    // and fillDown again
    fillX = pixelStack[0][0];
    fillY = pixelStack[0][1];
    //get rid of that element in the pixelStack array
    pixelStack.shift();
    // if any pixels left to fill
    if (pixelStack.length > 0)
        startFilling(); // do it again!
}

function fillPixel(){
    ctx.fillStyle = pickerColor.value;
    ctx.fillRect(fillX, fillY, 1, 1);
}

var isWithinBounds = function() {
    if (fillX > 0 && fillX < 600 && fillY >= 0 && fillY < 600)
        return true;
}


function rand(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// COLOR PICKER ///////////////////////////////////////////////

function loadPicker(){
    colorOveride = true;
    
    // mouse activity
    tempCanvas.addEventListener('click', getColor);
}

function getColor(e){
    var x = picker.x = [Math.floor(e.x - box.left)];
    var y = picker.y = [Math.floor(e.y - box.top)];
    var original = ctx.getImageData(x,y,1,1);
    var r = original.original[0];
    var g = original.original[1];
    var b = original.original[2];
    eyedrop = rgb2hex(r,g,b);
    pickerColor.value = eyedrop;
}

// LINE ////////////////////////////////////////////////////

function loadLine(){
    isDown = false;
    line.softness = softness.value;
    // mouse activity
    // add event listeners to it
    tempCanvas.addEventListener('mousedown', down);
    tempCanvas.addEventListener('mousemove', drag);
    tempCanvas.addEventListener('mouseup', release);
}

function down(e) {
    isDown = true;
    var a = e.clientX - box.left;
    var b = e.clientY - box.top;
    start.x = a;
    start.y = b - 8;
}

function drag(e) {
    if (isDown){
        var a = Math.floor(e.clientX - box.left);
        var b = Math.floor(e.clientY - box.top);
        current.x = a;
        current.y = b - 8;
        // draw to the second canvas
        ctx2.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        activeTool.name == 'line' ? drawLine(ctx2) : drawCircle(ctx2);
    }
}

function release(e) {
    isDown = false;
    var a = Math.floor(e.clientX - box.left);
    var b = Math.floor(e.clientY - box.top);
    current.x = a;
    current.y = b - 8;
    // upon release, wipe the second canvas
    // and draw the line to the first canvas
    activeTool.name == 'line' ? drawLine(ctx) : drawCircle(ctx);
    ctx2.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
}

function drawLine(context) {
    context.lineWidth = line.size;
    context.lineCap = 'round';
    context.strokeStyle = `rgba(${hex2RGB(pickerColor.value)},${activeTool.opacity})`;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(current.x, current.y);
    context.stroke();
    // backToDefault(context); 
}

// ARC ////////////////////////////////////////////////////////

function loadArc(){
    isDown = false;
    arc.softness = softness.value;
    // mouse activity
    // add event listeners to it
    tempCanvas.addEventListener('mousedown', down);
    tempCanvas.addEventListener('mousemove', drag);
    tempCanvas.addEventListener('mouseup', release);
}

function drawCircle(context) {
    var diffX = current.x - start.x;
    var diffY = current.y - start.y;
    var r = (diffX*diffX) + (diffY*diffY);
    var radius = Math.floor(Math.sqrt(r));
    context.lineWidth = arc.size;
    context.strokeStyle = `rgba(${hex2RGB(pickerColor.value)},${activeTool.opacity})`;
    context.beginPath();
    context.arc(start.x, start.y, radius, 0, 2 * Math.PI);
    context.stroke();
    backToDefault(); 
}

// BRUSH, PENCIL, and ERASER /////////////////////////////////////////
// copy the main canvas to the temporary one
// draw the new artwork to the main canvas
// upon release, draw it to the temporary canvas
// and copy the temp canvas to the permanent canvas

function loadBrushPencilEraser(){
    isDown = false;
    x = [], y = [];

    // get tool color
    if (activeTool.name=='eraser')
        pickerColor.value = '#FFFFFF';
    else
        pickerColor.value = activeTool.color;

    // disable softness for pencil
    if (activeTool.name=='pencil')
        {
            softness.value = 0;
            softness.disabled = true;
        }
    else {
        softness.disabled = false;
        softness.value = activeTool.softness;
    }

    tempCanvas.addEventListener('mousedown', down);
    tempCanvas.addEventListener('mousemove', brushDrag);
    tempCanvas.addEventListener('mouseup', brushRelease);
}

function brushDrag(e){
    if (isDown){
        x.push(Math.floor(e.clientX - box.left));
        y.push(Math.floor(e.clientY - box.top));
        //wipeCanvas(ctx2);
        drawStroke(ctx2);
    }
}

function brushRelease(e){
    isDown = false;
    ctx2.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
    drawStroke(ctx);
    // then copy the temp canvas back to the main canvas
    x = [], y = [];
}

function drawStroke(context){
    var i;
    context.shadowColor = pickerColor.value;
    context.shadowBlur = activeTool.softness;
    context.strokeStyle = `rgba(${hex2RGB(pickerColor.value)},${activeTool.opacity/2})`;
    context.lineWidth = toolSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    context.moveTo(start.x, start.y);
    for (var i = 1; i < x.length; i++)
        context.lineTo(x[i], y[i]-8);
    context.stroke();
    backToDefault(context); 
}

function backToDefault(){
    ctx.shadowColor = 'white'; ctx2.shadowColor = 'white';
    ctx.shadowBlur = 'white'; ctx2.shadowBlur = 'white';
    ctx.strokeStyle = "#000"; ctx.lineWidth = 1; 
    ctx2.strokeStyle = "#000"; ctx2.lineWidth = 1; 
}

// TEXT //////////////////////////////////////////////////////////

function loadText(){
    // TEXT OPTIONS
    pickerColor.value = text.color;

    // draw it
    tempCanvas.addEventListener('click', printIt);
}

function printIt(e){
    var words = prompt("Text: " , "");
    if (words){
        var x = text.x = Math.floor(e.x - box.left);
        var y = text.y = Math.floor(e.y - box.top);
        ctx.font = `${toolSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.globalAlpha = text.opacity;
        ctx.fillStyle = pickerColor.value;
        ctx.fillText(words, x, y);
    }
}

////////////////////////////////////////////////

function loadCursor(){
    canvas.width = 24;
    canvas.height = 24;
    //document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000000";
    ctx.font = "24px FontAwesome";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(getCursor(activeTool), 12, 12);
    var dataURL = canvas.toDataURL("image/png");
    mainCanvas.style.cursor = "url('" + dataURL + "'), auto";
}


function loadImg(){
    console.log('load');
    var input, file, fr, img;

    if (typeof window.FileReader !== 'function'){
        console.log('File API is not supported in this browser yet.');
        return;
    }

    input = document.getElementById('choose');
    if (!input){
        console.log('Unable to find image element.');
    }
    else if (!input.files){
        console.log('Browser does not support input.files.');
    }
    else if (!input.files[0]){
        console.log('Please select a file before clicking "Load" button.');
    }
    else {
        file = input.files[0];
        fr = new FileReader();
        fr.onload = createImage;
        fr.readAsoriginalURL(file);
    }

    function createImage(){
        img = new Image();
        img.onload = imageLoaded;
        img.src = fr.result;
    }

    function imageLoaded(){
 
        var ctx = mainCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
    }
}

function saveFile(){
    console.log('save');
    var image = mainCanvas.tooriginalURL();
    var modal = document.createElement('DIV');
    modal.classList.add('front');
    modal.src = image;
    custom.innerHTML = 'Right-click to save image.';
    document.body.appendChild(modal);
}

function clearCanvas(){
    ctx.clearRect(0,0, ctx.canvas.width, ctx.canvas.height);
    ctx2.clearRect(0,0, ctx2.canvas.width, ctx2.canvas.height);
}

// returns random number between the two given numbers
function getRandomInt(min, max){
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// returns random float between the two given numbers
function getRandomFloat(min, max){
    return Math.random() * (max - min) + min;
}

function getCursor(tool){
    return tool.cursor;
}