
require('browser-env')();
 
// Now you have access to a browser like environment in Node.js:
 
typeof window;
// 'object'

var now = require("performance-now")

const Max = require('max-api');
Max.post(" -- load magenta");
const mm = require('@magenta/music');
	Max.post(" -- load tensorflow");
const tf = require('@tensorflow/tfjs-core');
var stepSequencer = require("./sequencer");

Max.post(" -- magenta fully loaded");

// Instantiate a new StepSequencer object

 
// node needs a fileserver to serve the model
const CHECKPOINTS_DIR =
    'http://127.0.0.1:8081/models';

mm.logging.verbosity = mm.logging.Level.DEBUG;

const MEL_CHECKPOINT = `${CHECKPOINTS_DIR}/music_rnn/basic_rnn`;
const DRUMS_CHECKPOINT = `${CHECKPOINTS_DIR}/music_rnn/drum_kit_rnn`;
const IMPROV_CHECKPOINT = `${CHECKPOINTS_DIR}/music_rnn/chord_pitches_improv`;

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

function emmitSeq(seq){
	var tempo = 120;
    var division = 4;
    var ss = new stepSequencer(	tempo, 
								seq.quantizationInfo.stepsPerQuarter,
 								seq.notes,
								seq.totalQuantizedSteps);
    Max.post(seq.quantizationInfo.stepsPerQuarter);
    ss.on('n', function (step) {
		Max.post(step);
		Max.outlet([step.pitch, 127, ( step.quantizedEndStep - step.quantizedStartStep ) ]);
	})

	// Begin playing the sequence
	ss.play();
}

async function runMelodyRnn(ns) {
  // Display the input.
  Max.post('now really start');
  const qns = mm.sequences.quantizeNoteSequence(ns, 4);
  Max.post('load RNN model');
  const melodyRnn = new mm.MusicRNN(MEL_CHECKPOINT);
  Max.post('init rnn');
  await melodyRnn.initialize();


  const continuation = await melodyRnn.continueSequence(qns, 20);
  Max.post("now sequence"); 
  Max.post(continuation);
  emmitSeq(continuation);

  melodyRnn.dispose();
  
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
  
  const improvRnn = new mm.MusicRNN(IMPROV_CHECKPOINT);
  await improvRnn.initialize();

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

});
	
