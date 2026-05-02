if(typeof(window["TAG"])=="undefined") window["TAG"]={};
if(typeof(window["TAG"].instruments)=="undefined") window["TAG"].instruments=[];
console.log("instrument superclass loaded");


class Instrument {
    constructor(audioContext, basePitch = 440) {
        this.audioContext = audioContext;
        this.basePitch = basePitch;
        this.scaleMap = null;
        this.channel = this.audioContext.createGain();
	   this.channel.gain.value = 1.0; // Default full volume
        this.channel.connect(this.audioContext.destination);
    }

  // NEW: Method to balance the orchestra
    setVolume(val) {
        this.channel.gain.setTargetAtTime(val, this.audioContext.currentTime, 0.1);
    }
	
    static midiToFrequency(nr, scaleMap = null) {
        // 1. Check for a Global Tuning Object
        const tuning = window.GlobalTuning || { basePitch: 440, tet: 12 };
        const { basePitch, tet } = tuning;

        // 2. Priority: Scale Map
        if (scaleMap && scaleMap[nr]) {
            return scaleMap[nr];
        }

        // 3. Calculation: BasePitch * 2^((note - refNote) / TET)
        // refNote 69 is A4
        return basePitch * Math.pow(2, (nr - 69) / tet);
    }

    static midiToFrequencyJustIntonation(nr) {
        // Reserved for specific ratio-based logic
        return this.midiToFrequency(nr);
    }
}
