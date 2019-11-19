// server variables
let dataServer;
let pubKey = 'pub-c-e42c40df-bfb1-444c-a144-d7fd83d2a8ac';
let subKey = 'sub-c-1bd66d64-fff1-11e9-80c9-52f2b2dcd554';

/////API vars

let weather = "";

let json;



//name used to sort your messages. used like a radio station. can be called anything
let channelName = "soundSend";




let minSize = 20;
let colors;
let points = []
let center;
//minor scale array. low is m inversion, high is M inversion
let scaleArray = [38, 41, 50, 53, 57, 60, 64, 67, 72, 76, 79];

//let scaleArray = [ 38,41, 50, 53, 57, 60, 64, 69, 72, 76,79];
//let scaleArray2 = [ 38,41, 50, 53, 57, 60, 64, 69, 72, 76,79];


function preload() {
  // The URL for the JSON data (replace "imperial" with "metric" for celsius)
  let url = "https://api.openweathermap.org/data/2.5/weather?q=Toronto&units=metric&APPID=4dd27e4bd7805e9b025cab12e21fd861";
  json = loadJSON(url);

}



function setup() {



  ///API
  temperature = json.main.temp;
  pressure = json.main.pressure;
  windspeed = json.wind.speed;
  cloudiness = json.clouds.all

  // Grab the description, look how we can "chain" calls.
  weather = json.weather[0].description;




  colorMode(HSB, 360, 100, 100, 100);
  //背景色を指定
  background(0, 0, 0);
  blendMode(ADD);
  //frameRate(20);
  dataServer = new PubNub({
    publish_key: pubKey, //get these from the pubnub account online
    subscribe_key: subKey,
    ssl: true //enables a secure connection. This option has to be used if using the OCAD webspace
  });

  //attach callbacks to the pubnub object to handle messages and connections
  dataServer.addListener({
    message: readIncoming
  });
  dataServer.subscribe({
    channels: [channelName]
  });






  ///////////////////////////
  createCanvas(windowWidth, windowHeight);
  textSize(40);
  textAlign(CENTER, CENTER);
  noStroke();

  center = createVector(width / 2, height / 2);
  maxRadius = min(center.x, center.y) * 1.5;

  minSize *= min(width, height) / 1080;

  colors = [color("#000000"), color("002CA4"), color("0132BA"), color("164DE5"), color("#ffffff")];


}

//if (maxRadius > 0) {
//fill(0, 0, 255);
//ellipse(100, 100, 100);



function add(messX, messY) {
  let v = createVector(messX, messY);

  //avoid add inside other
  for (let j = 0; j < points.length; j++) {
    if (v.dist(points[j].pos) < minSize * 8) {
      return;
    }


  }
  //avoid add too close to the border
  if (v.dist(center) > maxRadius - minSize * 3)
    return;

  //sound
  let osc = new p5.SinOsc();
  let osc2 = new p5.SinOsc();
  let envelope = new p5.Envelope();
  envelope.setRange(0.07, 0.0001); //attackLevel, releaseLevel
  envelope.setADSR(0.005, 0.7, 0.1, 0.4); //attackTime, decayTime, sustainRatio, releaseTime


  delay = new p5.Delay();

  // delay.process() accepts 4 parameters:
  // source, delayTime, feedback, filter frequency
  // play with these numbers!!
  delay.process(osc, 0.4, 0.6, 300);
  delay.process(osc2, 0.4, 0.6, 300);
  //reverb = new p5.Reverb();

  // sonnects soundFile to reverb with a
  // reverbTime of 6 seconds, decayRate of 0.2%
  //reverb.process(osc, 1, 0.9);


  points.push({
    pos: v.copy(),
    size: minSize + 10,
    growDir: 1,
    collide: false,
    played: false,
    playedTime: 0,
    envelope: envelope,
    osc: osc,
    osc2: osc2,
  });
}





function draw() {
  background(0);
  fill(0);

  let curTime = millis();
  //Weather maps
  //mapped according to average range in toronto
  temp = map(temperature, -10, 10, 0, 1);
  press = map(pressure, 1000, 1040, 0, 1);
  wind = map(windspeed, 2, 9, 0, 1);
  clouds = map(cloudiness, 0, 100, 0, 1);

  //console.log(["temp: " +temp ],["press: " +press ],["wind: " +wind ],["clouds: " +clouds]);


  //update size of sound shape

  for (let i = 0; i < points.length; i++) {
    let d1 = points[i].pos;
    let s1 = points[i].size;
    let growPct = map(s1, minSize, maxRadius, 0, 1, true);


    //sound
    points[i].played = false;
    if (points[i].collide) {
      points[i].collide = false;
      if (curTime - points[i].playedTime > 50) {
        points[i].played = true;
        points[i].playedTime = curTime;

        let midiValue = scaleArray[floor((1 - (growPct)) * (scaleArray.length - 1))];
        let freqValue = midiToFreq(midiValue);
        points[i].osc.freq(freqValue);
        points[i].osc2.freq(freqValue / 8);
        points[i].osc.start();
        //points[i].osc2.start();
        points[i].envelope.play(points[i].osc, 0, 0.1);
        points[i].envelope.play(points[i].osc2, 0, 0.1);
        //console.log(["midiValue: " +midiValue]);
      }
    }

    //distance from other circles
    for (let j = 0; j < points.length; j++) {
      if (i == j) continue;
      let d2 = points[j].pos;
      let r = (s1 + points[j].size) * 0.5;
      if (d1.dist(d2) < r) {
        points[i].collide = true;

      }
    }

    //how big circle can go 
    if (d1.dist(center) > maxRadius - s1 / 2) {
      points[i].collide = true;
    }

    //speed of growing

    if (points[i].collide || s1 < minSize) points[i].growDir *= -1;
    points[i].size += points[i].growDir * ((temp + clouds) * 2);

    //draw
    //fill(points[i].played ? 255 : lerpColors(growPct, colors));
    rectMode(CENTER);
    ellipse(points[i].pos.x, points[i].pos.y, points[i].size, points[i].size);


    let x = width / 2;
    let y = height / 2;
    let d = width / 2 * 0.85;

    let line_count = 100;
    for (let i = 0; i < line_count; i++) {
      let t = i / line_count * 5;

    }
    stroke(0, 0, 255);
    noFill();


  }


  //////////////////how many circles allowed

  if (points.length > (5 + clouds + wind + temp)) {
    points.splice(0, 1);
  }
}

function mousePressed() {
  dataServer.publish({
    channel: channelName,
    message: {
      x: mouseX,
      y: mouseY
    }
  });
}

//not used in final
function lerpColors(t, colors) {
  let i = Math.floor(t * (colors.length - 1));
  if (i < 0) return colors[0];
  if (i >= colors.length - 1) return colors[colors.length - 1];

  let percent = (t - i / (colors.length - 1)) * (colors.length - 1);
  return color(
    colors[i] + percent * (colors[i + 1] - colors[i]),
    colors[i] + percent * (colors[i + 1] - colors[i]),
    colors[i] + percent * (colors[i + 1] - colors[i])

  )
}





function readIncoming(inMessage) //when new data comes in it triggers this function, 
{ // this works becsuse we subscribed to the channel in setup()

  // simple error check to match the incoming to the channelName
  if (inMessage.channel == channelName) {
    add(inMessage.message.x, inMessage.message.y);
    console.log(inMessage);
  }
}