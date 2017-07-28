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
var V0 = new blynk.VirtualPin(0);   // for temperature (DS18B20)
var temp;

var V1 = new blynk.VirtualPin(1);   // ON/OFF button for the led (in place of the pump)
var V2 = new blynk.VirtualPin(2);   // Blynk LED for the led (in place of the element)

var V5 = new blynk.VirtualPin(5);   // SLIDER for Set Temp
var setTemp = 0;

var V6 = new blynk.VirtualPin(6);   // Displays Set Temp on Blynk Interface

var V8 = new blynk.VirtualPin(8);   // SLIDER for manual Temp
var manTemp = 0;

var V10 = new blynk.VirtualPin(10); // ON/OFF button for master element control
var elementState = 0;

var V12 = new blynk.VirtualPin(12); // PID/MAN button for element control mode
var inAuto = 1;

var V15 = new blynk.VirtualPin(15); // Displays Output % on Blynk Interface



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

  // sent the actual states & values to the Blynk Interface
  V5.write(setTemp);
  V8.write(manTemp);
  V10.write(elementState);
  V12.write(inAuto);

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

  // J5 code - this waits for the broadcast of V12 (element mode)
  event.on('V12', function(param){
  console.log(param);
    if ( param == 1 || param == true ) {
      if ( DEBUG ) { console.log("PID mode"); }
      inAuto = 1;
    } else {
      if ( DEBUG ) { console.log("Manual mode"); }
      inAuto = 0;
    }
  });

});


// Blynk code - a 1/2 sec loop WRITING temp and output TO BLYNK (for history graph)
setInterval(function() {
  if ( temp != undefined ) {
    if ( DEBUG ) { console.log('Temp:', temp + ' C'); }
    V0.write(temp);
  }
  if ( Output != undefined ) {
    var outputAsPercent = Output * (100/WindowSize);
    if ( DEBUG ) { console.log('Output:', outputAsPercent + ' %'); }
    V15.write(outputAsPercent.toFixed(1));
  }
}, 500);


/*
// simple ON/OFF element control logic - made redundant by PID control
setInterval(function() {
  if ( temp < setTemp ) {     // IF the temp is below the setTemp...
    event.emit('V2',1);       // broadcasts V2 = 1 (on)
    if ( elementState == 1 ){ // IF the element master switch is ON...
      V2.write(255);          // writes 255 (full led) to LED in Blynk app
    } else {                  // IF not...
      V2.write(0);            // turns off
    }
  }
  else {                      // IF the temp is not below the setTemp...
    V2.write(0);              // writes 0 (no led) to LED in Blynk app
    event.emit('V2',0);       // broadcasts V2 = 0 (off)
  }
}, 100);
*/


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

// Blynk code - RECEIVES master element V10 button from FROM BLYNK and broadcasts the change
V12.on('write', function(param){
  if ( DEBUG ) { console.log("V12 ", param); }
  event.emit('V12',param);
});

// Blynk code - RECEIVES set Temp V8 slider from FROM BLYNK and broadcasts the change
V8.on('write', function(param){
  if ( DEBUG ) { console.log("V8 ", param); }
  event.emit('V8',param);
  manTemp = param;
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
//SetMode(true);    //true = auto (PID mode) - false = manual (PID off)
SetSampleTime(50);
SetTunings(25, 50, 25);

//console.log(kp, kd, ki);
var WindowSize = 5000;
windowStartTime = millis();
SetOutputLimits(0, WindowSize);

// PID code
function Compute() {
  if(!inAuto) return;
  if ( temp != undefined ) {
    //nathan added this to convert the Brett Beauregard code with existing code
    Setpoint = setTemp;
    Input = temp;

    // How long since we lasat calculated
    var now = millis();
    var timeChange = now - lastTime;
    if ( timeChange >= SampleTime ) {

      // Compute all the working error variables
      var error = Setpoint - Input;
      var dInput = (Input - lastInput);

      // Compute I Output
      outputSum += (ki * error);

      // Compute P Output
      outputSum -= kp * dInput;
      if ( outputSum > outMax ) { outputSum = outMax; }
      else if ( outputSum < outMin ) { outputSum = outMin; }

      // Compute D Output and sum PID Output
      Output = outputSum - kd * dInput;
      //if ( DEBUG ) { console.log("Output: ", Output); }
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
  var SampleTimeInSec = SampleTime / 1000;
  kp = Kp;
  ki = Ki * SampleTimeInSec;
  kd = Kd / SampleTimeInSec;
}

var NewSampleTime;
function SetSampleTime ( NewSampleTime ) {
  if ( NewSampleTime > 0 ) {
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

/*
var Mode;
function SetMode(Mode) {
  var newAuto = ( Mode == true );
  if ( newAuto == !inAuto )
  {  //we just went from manual to auto
    Initialize();
  }
  inAuto = newAuto;
}

function Initialize() {
  lastInput = Input;
  outputSum = Output;
  if ( outputSum > outMax ) outputSum = outMax;
  else if ( outputSum < outMin ) outputSum = outMin;
}
*/

//This is the function that calls the PID code and controls the relay

/*First we decide on a window size (5000mS say.) We then
 * set the pid to adjust its output between 0 and that window
 * size.  Lastly, we add some logic that translates the PID
 * output into "Relay On Time" with the remainder of the
 * window being "Relay Off Time"*/

function manualMode() {
  if(inAuto) return;
  Output = manTemp * ( WindowSize / 100 );
}


setInterval(function() {
  // only 1 of the following will actually run
  Compute();     // call the PID mode code
  manualMode();  // call the Manual mode code

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
