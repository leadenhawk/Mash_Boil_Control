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
  connector : new Blynk.TcpClient( options = { addr:"192.168.1.74", port:8442 } )
});

//set Virtual Pins and associated variables
var V0 = new blynk.VirtualPin(0);   // Virtual Pin 0 - for temperature (DS18B20)
var temp;

var V1 = new blynk.VirtualPin(1);   // Virtual Pin 1 - ON/OFF button for the led (in place of the pump)
var V2 = new blynk.VirtualPin(2);   // Virtual Pin 2 - Blynk LED for the led (in place of the element)

var V10 = new blynk.VirtualPin(10); // VirtualPin 10 - ON/OFF button for master element control
var elementState = 0;

var V5 = new blynk.VirtualPin(5);   // VirtualPin 5 - SLIDER for Set Temp
var setTemp = 0;

var V6 = new blynk.VirtualPin(6);

var V30 = new blynk.VirtualPin(30); // VP30 - undershoot value
var V31 = new blynk.VirtualPin(31); // VP31 - overshoot value
var undershoot = 2;
var overshoot = 5;

// J5 startup
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


/*
// simple ON/OFF element control logic
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
*/


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

// A function I wrote that does the same as the Arduino millis() function
function millis() {
  var d = new Date();
  var n = d.getTime();
  return n;
}

// Converted from Brett Beauregard's PID tutorials
// converted to Proportional on Measurement rather than on Error.
// http://brettbeauregard.com/blog/2017/06/introducing-proportional-on-measurement/
// On/Off & Initialization & Direction tutorials not implemented

// variables
var lastTime = millis();
var Input, Output, Setpoint;
var outputSum = 0, lastInput = 0;
var kp, ki, kd;
var SampleTime;
var outMin, outMax;


// Setup
SetSampleTime(50);
SetTunings(25, 25, 50);

//console.log(kp, kd, ki);
var WindowSize = 5000;
windowStartTime = millis();
SetOutputLimits(0, WindowSize);


// PID code
function Compute() {
  if ( temp != undefined ) {
    //nathan added this to convert the Brett Beauregard code with existing code
    Setpoint = setTemp;
    Input = temp;
    //console.log("temp: ", temp);
    //console.log("Setpoint: ", Setpoint);
    //console.log("Input: ", Input);


    // How long since we lasat calculated
    var now = millis();
    var timeChange = now - lastTime;
    //console.log("timeChange: ",timeChange);

    if(timeChange>=SampleTime) {
      // Compute all the working error variables
      var error = Setpoint - Input;
      console.log("error: ", error);
      var dInput = (Input - lastInput);
      //console.log("Input: ", Input);
      //console.log("lastInput: ", lastInput);
      outputSum += (ki * error);
      //console.log("outputSum-ki: ", outputSum);

      // Compute PID Output
      outputSum -= kp * dInput;
      //console.log("kp: ", kp);
      //console.log("dInput: ", dInput);
      //console.log("outputSum-kp: ", outputSum);

      if ( outputSum > outMax ) { outputSum = outMax; }
      else if ( outputSum < outMin ) { outputSum = outMin; }

      // Compute Rest of PID Output
      Output = outputSum - kd * dInput;
      console.log("Output: ", Output);

      if ( Output > outMax ) { Output = outMax; }
      else if ( Output < outMin ) { Output = outMin; }

      //Remember some variables for next time
      lastInput = Input;
      lastTime = now;
    }
  }
}

var Kp;
var Ki;
var Kd;

function SetTunings(Kp, Ki, Kd) {
  var SampleTimeInSec = (SampleTime)/1000;
  kp = Kp;
  ki = Ki * SampleTimeInSec;
  kd = Kd / SampleTimeInSec;
}

var NewSampleTime;
function SetSampleTime(NewSampleTime){
  if (NewSampleTime > 0) {
    var ratio  = NewSampleTime / SampleTime;
    ki *= ratio;
    kd /= ratio;
    SampleTime = NewSampleTime;
  }
}

var Min, Max;
function SetOutputLimits(Min, Max){
  if ( Min > Max ) return;
  outMin = Min;
  outMax = Max;

  if ( Output > outMax ) { Output = outMax; }
  else if ( Output < outMin ) { Output = outMin; }

  if ( outputSum > outMax ) { outputSum = outMax; }
  else if ( outputSum < outMin ) { outputSum = outMin; }
}


//This is the function that calls the PID code and controls the relay

/*First we decide on a window size (5000mS say.) We then
 * set the pid to adjust its output between 0 and that window
 * size.  Lastly, we add some logic that translates the PID
 * output into "Relay On Time" with the remainder of the
 * window being "Relay Off Time"*/

setInterval(function() {
  // call the PID code
  Compute();

  // turn the element on/off based on pid output (taken from Arduino PID RelayOutput Example)
  var now = millis();

  if ( now - windowStartTime > WindowSize ) { //time to shift the Relay Window
    windowStartTime += WindowSize;
  }

  if ( Output > now - windowStartTime ) {
    event.emit('V2',1);       // turn on the element!
    if ( elementState == 1 ){ // IF the element master switch is ON...
      V2.write(255);          // writes 255 (full led) to LED in Blynk app
    } else {                  // IF not...
      V2.write(0);            // turns off
    }
  } else {
    event.emit('V2',0);       // turn off the element!
    V2.write(0);
  }
}, SampleTime);
