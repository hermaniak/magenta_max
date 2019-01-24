
require('browser-env')();
 
// Now you have access to a browser like environment in Node.js:
 
typeof window;
// 'object'

var now = require("performance-now")
const { exec } = require('child_process');

const Max = require('max-api');
Max.post(" -- load magenta");
const mm = require('@magenta/music');
	Max.post(" -- load tensorflow");
const tf = require('@tensorflow/tfjs-core');
var stepSequencer = require("./sequencer");
const recorder = require("@magenta/music/es5/core/recorder");
Max.post(" -- magenta fully loaded");

// Instantiate a new StepSequencer object

 
// node needs a fileserver to serve the model
const CHECKPOINTS_DIR =
    'http://127.0.0.1:8081/models';

mm.logging.verbosity = mm.logging.Level.DEBUG;

const MEL_CHECKPOINT = `${CHECKPOINTS_DIR}/music_rnn/basic_rnn`;
const DRUMS_CHECKPOINT = `${CHECKPOINTS_DIR}/music_rnn/drum_kit_rnn`;
const IMPROV_CHECKPOINT = `${CHECKPOINTS_DIR}/music_rnn/chord_pitches_improv`;

var NS_HEADER = {
    ticksPerQuarter: 220,
    totalTime: 1.5,
    timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    tempos: [{ time: 0, qpm: 120 }]
	};
	
	
var MELODY_NS = {
    ticksPerQuarter: 220,
    totalTime: 1.5,
    timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    tempos: [{ time: 0, qpm: 120 }],
    notes: [
        {
            instrument: 0,
            program: 0,
            startTime: 0,
            endTime: 0.5,
            pitch: 60,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 0.5,
            endTime: 1.0,
            pitch: 60,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 1.0,
            endTime: 1.5,
            pitch: 67,
            velocity: 100,
            isDrum: false
        },
        {
            instrument: 0,
            program: 0,
            startTime: 1.5,
            endTime: 2.0,
            pitch: 67,
            velocity: 100,
            isDrum: false
        }
    ]
};
var DRUMS_NS = {
    ticksPerQuarter: 220,
    totalTime: 1.5,
    timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    tempos: [{ time: 0, qpm: 120 }],
    notes: [
        { startTime: 0, endTime: 0.5, pitch: 35, velocity: 100, isDrum: true }, {
            instrument: 0,
            startTime: 0.5,
            endTime: 1.0,
            pitch: 39,
            velocity: 100,
            isDrum: true
        },
        {
            instrument: 0,
            startTime: 0.5,
            endTime: 1.0,
            pitch: 43,
            velocity: 100,
            isDrum: true
        },
        { startTime: 1.0, endTime: 1.5, pitch: 35, velocity: 100, isDrum: true }, {
            instrument: 0,
            startTime: 1.5,
            endTime: 2.0,
            pitch: 39,
            velocity: 100,
            isDrum: true
        },
        {
            instrument: 0,
            startTime: 1.5,
            endTime: 2.0,
            pitch: 43,
            velocity: 100,
            isDrum: true
        }
    ]
};

function startFileServer(){
	Max.post('start fileserver');
	exec('/Users/hermannbauerecker/Music/HAI/max/node_modules/http-server/bin/http-server /Users/hermannbauerecker/file-serve', (err, stdout, stderr) => {
  	if (err) {
    	Max.post('fileserver stopped with error ' + err);
    	return;
  	}

  	// the *entire* stdout and stderr (buffered)
  	Max.post(`stdout: ${stdout}`);
  	Max.post(`stderr: ${stderr}`);
	});
}

function initMagenta(){
	Max.post('init rnn');
	const improvRnn = new mm.MusicRNN(MEL_CHECKPOINT);
    improvRnn.initialize();
	return improvRnn;
}

function emmitSeq(seq){
    Max.post(seq.quantizationInfo.stepsPerQuarter);
    ss.setSequence(seq.quantizationInfo.stepsPerQuarter, seq.notes)

	// Begin playing the sequence
	ss.play();
}

async function runMelodyRnn(ns) {
  // Display the input.
  const qns = mm.sequences.quantizeNoteSequence(ns, 4);
  Max.post('load RNN model');
  
  const continuation = rnn.continueSequence(qns, 20);
  Max.post("now sequence"); 
  Max.post(continuation);
  continuation.then (function (continuation){
	Max.post('now we output');
  	emmitSeq(continuation);
  })
  
}

async function runDrumsRnn() {
  // Display the input.
  const qns = mm.sequences.quantizeNoteSequence(DRUMS_NS, 4);

  const drumsRnn = new mm.MusicRNN(DRUMS_CHECKPOINT);
  await drumsRnn.initialize();

  const start = performance.now();
  const continuation = await drumsRnn.continueSequence(qns, 20);
  drumsRnn.dispose();
}

async function runImprovRnn() {
  // Display the input.
  const qns = mm.sequences.quantizeNoteSequence(MELODY_NS, 4);
  
  const start = performance.now();
  const continuation = await improvRnn.continueSequence(qns, 20, 1.0, ['Cm']);
  improvRnn.dispose();
}

var toMs = ( step, bpm ) => step * 60 * 1000 / ( bpm * 4 );


Max.addHandler("bang", () => {
	try {
  		Promise
      	.all([
        	runMelodyRnn(MELODY_NS),
        	//runDrumsRnn(),
        	//runImprovRnn(),
      	])
      
	} catch (err) {
  		Max.post(err);
	}
	
});

Max.addHandler("note", (pitch, vel) => {
	Max.post('pitch' + pitch + ' - ' + vel);
	if (vel === 0){
		ss.noteOff(pitch,performance.now());
	} else {
		ss.noteOn(pitch,vel,performance.now());
	}
});

Max.addHandler("tic", (pitch, vel) => {
    ss.advance()
});

// main
var tempo = 120;
var division = 4;
var ss = new stepSequencer(	tempo, division, 20)
 
ss.on('n', function (step) {
		Max.post(step);
		Max.outlet([step.pitch, 127, ( step.quantizedEndStep - step.quantizedStartStep ) ]);
})

ss.on('o', function (ns) {
       	runMelodyRnn(ns);
		
})
								
//seq.totalQuantizedSteps)

startFileServer();

rnn=initMagenta();
//rnn.dispose();
