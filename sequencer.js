'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var NanoTimer = require('nanotimer');
var protobuf_1 = require("../magenta-js/music/es5/protobuf");
const Max = require('max-api');
var now = require("performance-now")	



function start() {
  if (this._running) return;
  this.step = 0;
  this._running = true;
  if (this.internalMetronome){
  	loop.call(this);
  }
}  	
	
function play() {
  if (this._playing) return;
  this._playing = true;
}

function record() {
  if (this._recording) return;
}

function loop() {
  var self = this;
  self.timer.setTimeout(function () {
    advance.call(self);
    if (self._playing) loop.call(self);
  }, '', self.timeout);
}

function checkforEmission() {
  if (this.sequence != undefined && (this.seqIndex < this.sequence.length)){
	var seqItem = this.sequence[this.seqIndex];
	if (this.step == seqItem.quantizedStartStep && 
	  this.seqIndex < this.sequence.length) {
		Max.post('emmit');
   		this.emit('n', seqItem);
    	this.seqIndex = this.seqIndex + 1;
  	}
  }
}

function checkForRecord() {
	if (this.notesIn.length === 0){
		return null;
	}	
	var ns = protobuf_1.NoteSequence.create({
    		ticksPerQuarter: 220,
    		totalTime: 1.5,
    		timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    		tempos: [{ time: 0, qpm: 120 }],
            notes: this.notesIn,
            totalTime: this.notesIn[this.notesIn.length - 1].endTime,
    
	});
	this.emit('o', ns);
	this.notesIn=[];
	this.onNotes.clear;
}	

async function advance() {
  checkforEmission.call(this)
  if (this._debug){
	var dl=' -- ' + this.step + '-' + this.totalSteps + '-' + this.seqIndex 
		 + '-' + this.onNotes.size + '-' + this.notesIn.length;
	if (this.sequence){
		dl=dl + ' - ' + this.sequence.length + '-' + this.seqIndex;
		if (this.sequence[this.seqIndex]) {
			dl=dl + '-' + this.sequence[this.seqIndex].quantizedStartStep
			+ '-' + this.sequence[this.seqIndex].quantizedEndStep;
		}
	}
	Max.post(dl);
  }	
  this.step = (this.step + 1);
  if (this.doLoop && this.step === this.totalSteps ){
	checkForRecord.call(this)
	this.step = 0
	this.seqIndex = 0;
  }
  //if (this.step === this.sequence.length) this.step = 0;
}

function resume() {
  if (this._playing) return;
  this._playing = true;
  loop.call(this);
}

function stop() {
  if (!this._playing) return;
  this._running = false;
  this.timer.clearTimeout();
}

function setTempo(tempo) {
  if (typeof tempo !== 'number') throw new TypeError('Tempo must be a number');
  this.tempo = tempo;
  this.timeout = Math.floor((60 / (this.tempo * this.division)) * 10e8) + 'n';
}

function setSequence(division, sequence) {
  if (typeof division !== 'number') throw new TypeError('Division must be a number');
  if (!(sequence instanceof Array)) throw new TypeError('Sequence must be an array');

  this.division = division;
  this.sequence = sequence;
  this.seqIndex = 0;
  this.timeout = Math.floor((60 / (this.tempo * this.division)) * 10e8) + 'n';
  if (this._debug){
		Max.post('set Sequence with length ' + this.sequence.length);
  		Max.post(this.sequence);
   }
}

function noteOn(pitch, velocity, timeStamp) {
	    var self = this
        var MILLIS_PER_SECOND = 1000;
        var note = new protobuf_1.NoteSequence.Note();
        note.pitch = pitch;
        note.startTime = (timeStamp - this.firstNoteTimestamp) / MILLIS_PER_SECOND;
        note.velocity = velocity;
        self.onNotes.set(pitch, note);
    };

function noteOff(pitch, timeStamp) {
	    var self = this
        var MILLIS_PER_SECOND = 1000;
        var note = self.onNotes.get(pitch);
        if (note) {
            note.endTime = (timeStamp - this.firstNoteTimestamp) / MILLIS_PER_SECOND;
			note.isDrum = false;
            self.notesIn.push(note);
        }
        self.onNotes.delete(pitch);
    };

function StepSequencer(tempo, division, totalSteps) {
  if (tempo && typeof tempo !== 'number') throw new TypeError('Tempo must be a number');
  if (	division && typeof division !== 'number') throw new TypeError('Division must be a number');

  this.tempo = tempo || 120;
  this.division = division || 4;
  this.step = 0;
  this.seqIndex = 0;
  this.totalSteps = totalSteps || 20;
  this._debug = true;
  this.doLoop = true;
  this.overwrite = true;
  this.internalMetronome = false;
  this.timer = new NanoTimer();
  this.timeout = Math.floor((60 / (this.tempo * this.division)) * 10e8) + 'n';
  this._playing = false;
  // recorder
  this._recording = false;
  this.notesIn = [];
  this.onNotes = new Map();

  this.firstNoteTimestamp = now();

  
  EventEmitter.call(this);
}



inherits(StepSequencer, EventEmitter);

StepSequencer.prototype.play = play;
StepSequencer.prototype.resume = resume;
StepSequencer.prototype.stop = stop;
StepSequencer.prototype.setTempo = setTempo;
StepSequencer.prototype.setSequence = setSequence;
StepSequencer.prototype.advance = advance;
StepSequencer.prototype.noteOn = noteOn;
StepSequencer.prototype.noteOff = noteOff;

module.exports = StepSequencer;
