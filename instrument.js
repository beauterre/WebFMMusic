
// make room for the list

	if(typeof(window["TAG"])=="undefined") window["TAG"]={};
	if(typeof(window["TAG"].instruments)=="undefined") window["TAG"].instruments=[];
console.log("instrument superclass loaded");

class Instrument {
    constructor(audioContext,basePitch) 
	{
        this.audioContext = audioContext;
        this.basePitch = basePitch;
		if(basePitch==null) this.basePitch=440;
 		// basePitch not implemented yet, assume 440.. 55,110,220,440
        this.baseNr = this.basePitch/2;
       this.baseNr = this.baseNr/2;
       this.baseNr = this.baseNr/2;
		console.log("Instrument baseNr set to "+ this.baseNr )
    }
	
	static midiToFrequency(nr)
	{
		var freq= 55*Math.pow(2,nr/12); // this.baseNr==55 ->440 undefined???
		return freq;
	}
	static midiToFrequencyJustIntonation(nr)
	{
		console.log("midiToFrequencyJustIntonation not implemented")
		return 200;
	}

}




