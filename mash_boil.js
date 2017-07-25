var Blynk = require('/home/nathan/node_modules/blynk-library');
var five = require("/home/nathan/node_modules/johnny-five");
var EventEmitter = require('events').EventEmitter;

var board = new five.Board();
var AUTH = '846fb83c6f8b414aae14d6dc9c233baf';  // Blynk Token

var event = new EventEmitter();                 // Evenements javascript - Javascript Events
var DEBUG = true; //false;

// Setup Blynk
var blynk = new Blynk.Blynk(AUTH, options = {
  // Connecteur au serveur Blynk local - Local Blynk server connector
  connector : new Blynk.TcpClient( options = { addr:"192.168.1.72", port:8442 } )
});

//set Virtual Pins and associated variables
var V0 = new blynk.VirtualPin(0);   // Virtual Pin 0 - for temperature (DS18B20)
var temp;

var V1 = new blynk.VirtualPin(1);   // Virtual Pin 1 - ON/OFF button for the led (in place of the pump)
var V2 = new blynk.VirtualPin(2);   // Virtual Pin 2 - Blynk LED for the led (in place of the element)

var V10 = new blynk.VirtualPin(10); // VirtualPin 10 - ON/OFF button for master element control
var elementState = 0;

var V5 = new blynk.VirtualPin(5);   // VirtualPin 5 - SLIDER for Set Temp
var setTemp = 25;

var V6 = new blynk.VirtualPin(6);

var V30 = new blynk.VirtualPin(30); // VP30 - undershoot value
var V31 = new blynk.VirtualPin(31); // VP31 - overshoot value
var undershoot = 10;
var overshoot = 5;

//startup
blynk.on('connect', function() { console.log("Blynk ready."); });
blynk.on('disconnect', function() { console.log("DISCONNECT"); });
board.on("ready", function() {
  console.log("Johnny-five is Alive!");

  // set physical pins
  var led = new five.Led(11);  //Arduino pin 11 - led (in place of pump)
  var ele = new five.Led(9);  //Arduino pin 9 - led (in place of element)
  var thermo = new five.Thermometer({
    controller: "DS18B20",
    pin: 10   //Arduino pin 10 - DS18B20
  });

  // J5 code - this reads the thermometer and stores it in variable temp
  thermo.on("change", function() {
    temp = this.celsius;
  });

  // J5 code - this waits for the broadcast of V1, then turns on or off the led
  event.on('V1', function(param){
    if ( param == 1 || param == true ) {
      if ( DEBUG ) { console.log("led/pump on"); }
      led.on();
    } else {
      if ( DEBUG ) { console.log("led/pump off"); }
      led.off();
    }
  });

  // J5 code - this waits for the broadcast of V2, then turns on or off the ele
  event.on('V2', function(param){
    if (elementState == 1 && ( param == 1 || param == true )) {
      //if ( DEBUG ) { console.log("led/element on"); }
      ele.on();
    } else {
      //if ( DEBUG ) { console.log("led/element off"); }
      ele.off();
    }
  });

  // J5 code - this waits for the broadcast of V10 (master element)
  event.on('V10', function(param){
    if ( param == 1 || param == true ) {
      if ( DEBUG ) { console.log("element active"); }
      elementState = 1;
    } else {
      if ( DEBUG ) { console.log("element deactivated"); }
      elementState = 0;
    }
  });
});

// Blynk code - a 1/2 sec loop WRITING actual temp and set temp TO BLYNK (for history graph)
setInterval(function() {
  if ( temp != undefined ) {
    if ( DEBUG ) { console.log('Temp:', temp + ' C'); }
    V0.write(temp);
  }
}, 500);

// element control logic
setInterval(function() {
  if ( temp < setTemp ) {
    event.emit('V2',1);       // broadcasts V2 = 1 (on)
    if ( elementState == 1 ){ // IF the element master switch is ON...
      V2.write(255);          // writes 255 (full led) to LED in Blynk app
    } else {                  // IF not...
      V2.write(0);            // turns off
    }
  }
  else {
    V2.write(0);              // writes 0 (no led) to LED in Blynk app
    event.emit('V2',0);       // broadcasts V2 = 0 (off)
  }
}, 100);

// Blynk code - a 5 sec loop WRITING temp TO BLYNK
setInterval(function() {
  if ( undershoot != undefined ) {
    if ( DEBUG ) { console.log('Undershoot:', undershoot + ' C'); }
    V30.write(undershoot);
  }
  if ( overshoot != undefined ) {
    if ( DEBUG ) { console.log('Overshoot:', overshoot + ' C'); }
    V31.write(overshoot);
  }

  if ( setTemp != undefined ) {
    if ( DEBUG ) { console.log('Set Temp:', setTemp + ' C'); }
  }



}, 5000);

// Blynk code - RECEIVES V1 button press FROM BLYNK app and broadcasts the change
V1.on('write', function(param){
  if ( DEBUG ) { console.log("V1 ", param); }
  event.emit('V1',param);
});

// Blynk code - RECEIVES V2 button press from FROM BLYNK and broadcasts the change
V2.on('write', function(param){
  if ( DEBUG ) { console.log("V2 ", param); }
  event.emit('V2',param);
});

// Blynk code - RECEIVES set Temp V5 slider from FROM BLYNK and broadcasts the change
V5.on('write', function(param){
  if ( DEBUG ) { console.log("V5 ", param); }
  event.emit('V5',param);
  setTemp = param;
  V6.write(setTemp);
});

// Blynk code - RECEIVES master element V10 button from FROM BLYNK and broadcasts the change
V10.on('write', function(param){
  if ( DEBUG ) { console.log("V10 ", param); }
  event.emit('V10',param);
});
