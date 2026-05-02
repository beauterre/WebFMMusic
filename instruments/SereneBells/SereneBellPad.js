console.log("Instrument Loaded: SereneBellPad vol2024-28-04-14:08");

class SereneBellPad extends Instrument {
    constructor(audioContext)
	{
		super(audioContext);
		this.name="SereneBellPad v2024-31-05-12:58";		
		console.log("got "+audioContext)
		this.audioContext=audioContext;
		this.beatmin=0.5;
		this.beatmax=8;
		/*
		Delta Waves (0.5 Hz - 4 Hz)
		Theta Waves (4 Hz - 8 Hz)
		Alpha Waves (8 Hz - 13 Hz)
		Beta Waves (13 Hz - 30 Hz)
		Gamma Waves (30 Hz and above)
		*/
    }
	setBeatMin(nr)
	{
		console.log("setBeatMin: " +nr);
		this.beatmin=nr;
	}
	setBeatMax(nr)
	{
		this.beatmax=nr;
	}
	getBeat()
	{
		return Math.random()*(this.beatmax-this.beatmin)+this.beatmin;
	}
	
    play(note,vol) 
	{
// start of play function
		//console.log("SereneBellPad playing Midinote:"+note+", volume:"+vol);
		// don't bother with polyphony, just create a tone!

        var o1 = this.audioContext.createOscillator();
        var o2 = this.audioContext.createOscillator();
	    var o3 = this.audioContext.createOscillator();
	    var o4 = this.audioContext.createOscillator();// four oscillators to a tone..
		
		//o1.type = 'triangle';
		//o2.type = 'square';
		//o3.type = 'triangle';
		//o4.type = 'square';
		
        var vol1 = this.audioContext.createGain(); // three volumes..
        var vol2 = this.audioContext.createGain();
        var masterVolume = this.audioContext.createGain(); // master volume

        masterVolume.connect(this.audioContext.destination);
        vol2.connect(masterVolume);
        vol1.connect(masterVolume);
 				

        o1.connect(vol1);
        o2.connect(vol2);

		var reactiontime=5/1000;// works better on some browsers
       

	

        var panPosition= Math.random()*2 - 1; // Normalize index to range [-1, 1];
        var panner1 = this.audioContext.createStereoPanner();
        var panner2 = this.audioContext.createStereoPanner();
               
        o1.connect(panner1);
        o2.connect(panner1);
        o3.connect(panner2);
        o4.connect(panner2);
        panner1.connect(vol1);
        panner1.connect(vol2);
        panner2.connect(vol1);
        panner2.connect(vol2);
        //console.log("osc created");
		
		// now create the tone..
		
		  // quiet
		vol1.gain.linearRampToValueAtTime(0, this.audioContext.currentTime+reactiontime);// first to 0, then freq change
		vol2.gain.linearRampToValueAtTime(0, this.audioContext.currentTime+reactiontime);
		masterVolume.gain.linearRampToValueAtTime(0, this.audioContext.currentTime+reactiontime);
		
		 o1.start(this.audioContext.currentTime+reactiontime);
        o2.start(this.audioContext.currentTime+reactiontime);
        o3.start(this.audioContext.currentTime+reactiontime);
        o4.start(this.audioContext.currentTime+reactiontime);

		
		var attack=5;
		var decay=12000; // 10 seconds default, not 100 :)
		
		//console.log("note: "+note)
 		var freq=Instrument.midiToFrequency(note)+Math.random();// slight detune.
		//console.log("freq: "+freq)
		//console.log(Instrument.midiToFrequency)

		// longer decay for lower notes
		  decay+=(10000000/freq)*Math.random();

	
		  // set panning
		panner1.pan.setValueAtTime(panPosition,this.audioContext.currentTime+reactiontime);
		panner2.pan.setValueAtTime(-panPosition,this.audioContext.currentTime+reactiontime);

	
	  // new freqs
		var freq1=freq;
		var freq2=freq+this.getBeat();
		// freq is not defined..
		o1.frequency.linearRampToValueAtTime(freq, this.audioContext.currentTime);
		o2.frequency.linearRampToValueAtTime(freq2, this.audioContext.currentTime);// max 5 hz detune of second wave..
		var freqdif=0.500/Math.abs(freq2-freq1);
		if(freqdif>1) freqdif=Math.abs(freq2-freq1)/2; // gives very spacey bells in the beginning.. I like it.
	// still..
//    masterVolume.gain.linearRampToValueAtTime(0.00001, this.audioContext.currentTime+reactiontime+freqdif);
		o3.frequency.linearRampToValueAtTime(freq, this.audioContext.currentTime+freqdif);
		o4.frequency.linearRampToValueAtTime(freq2, this.audioContext.currentTime+freqdif);// max 5 hz detune of second wave..
    
		var voldim=600/vol;//vol*(note-80)*300;
		if(note>14) voldim=1200/vol;
		if(note>40) voldim=2400/vol;
		console.log("note:"+note+",voldim:"+voldim);
		
		 // set envelope
		vol1.gain.linearRampToValueAtTime(0/voldim, this.audioContext.currentTime+reactiontime*2+ attack / 1000);
		vol1.gain.linearRampToValueAtTime(8/voldim, this.audioContext.currentTime+reactiontime*2 + (attack + decay/4) / 1000);
		vol1.gain.linearRampToValueAtTime(4/voldim, this.audioContext.currentTime+reactiontime*2 + (attack + decay/3) / 1000);
		var duration= (attack + decay) / 1000
		var fixedDuration = Math.round(duration * (freq1*2)) / (freq1*2);
		vol1.gain.linearRampToValueAtTime(0.0001, this.audioContext.currentTime+reactiontime*2 + fixedDuration);

		vol2.gain.linearRampToValueAtTime(0/voldim, this.audioContext.currentTime+reactiontime*2 + attack / 1000);
		vol2.gain.linearRampToValueAtTime(8/voldim, this.audioContext.currentTime+reactiontime*2 + (attack + decay/4) / 1000);

    masterVolume.gain.linearRampToValueAtTime(1, this.audioContext.currentTime+reactiontime*2+freqdif);// only hear it after it reaches the right tone.

	 o1.stop(this.audioContext.currentTime+reactiontime+fixedDuration);
     o3.stop(this.audioContext.currentTime+reactiontime+fixedDuration);
    
	
    fixedDuration = Math.round(duration * (freq2*2)) / (freq2*2);
    
    vol2.gain.linearRampToValueAtTime(0.0001, this.audioContext.currentTime + reactiontime*2 +fixedDuration);

     o2.stop(this.audioContext.currentTime+reactiontime+fixedDuration);
     o4.stop(this.audioContext.currentTime+reactiontime+fixedDuration);
  
  
   // Dispatch a custom event when a bell is fired
    var bellEvent = new CustomEvent('bellFired', { detail: { special: false, freq: freq, warble: Math.abs(freq2-freq1) } });
    document.dispatchEvent(bellEvent);		

// end of noteOn function
	}
}

// add to list
window["TAG"].instruments.push(SereneBellPad);
console.log("Instrument Loaded: "+window["TAG"].instruments[window["TAG"].instruments.length-1].name);
