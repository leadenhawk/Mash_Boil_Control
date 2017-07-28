# Mash_Boil_Control
This project is a Mash and boil controller for my electric BIAB homebrew system; this uses the Johnny-Five library on an Arduino via a Blynk android interface using a local Blynk server on Orange Pi. The Orange Pi also runs the JS code.

The Arduino Uno is flashed with ConfigurableFirmata via the Arduino IDE.


Aduino Pin          Hardware

  9        ==>     Element +ve
  
  10       ==>     DS18B20 data
  
  11       ==>     Pump +ve
  
  
  
  To run:
  
  Start local Blynk server by SSH into OrangePi Blynk Server
  
  execute:    cd Blynk 
  
  execute:    java -jar server-0.23.0.jar -dataFolder /home/nathan/Blynk &
  
  login to local Blynk server (barleybender) on phone
  
  locate mash_boil.js file
  
  execute:    node mash_boil.js
