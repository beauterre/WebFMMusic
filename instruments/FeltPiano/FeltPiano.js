console.log("Instrument Loaded: FeltPiano v2025-04-28-Scheduled");

class FeltPiano extends Instrument {
    constructor(audioContext) {
        super(audioContext);
        this.name = "FeltPiano v2025-04-28-Scheduled";
        this.audioContext = audioContext;
        this.activeNotes = new Map();
        
        this.mainFilter = this.audioContext.createBiquadFilter();
        this.mainFilter.type = "lowpass";
        this.mainFilter.frequency.setValueAtTime(1200, this.audioContext.currentTime);
        this.mainFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
        this.mainFilter.connect(this.channel);
    }

    play(note, vol, duration = 2000, startTime = null) {
        const now = startTime !== null ? startTime : this.audioContext.currentTime;
        const freq = Instrument.midiToFrequency(note, this.scaleMap, this.basePitch);
        const durSeconds = duration / 1000;

        const carrier = this.audioContext.createOscillator();
        carrier.type = "sine";
        carrier.frequency.setValueAtTime(freq, now);

        const modulator = this.audioContext.createOscillator();
        modulator.type = "sine";
        modulator.frequency.setValueAtTime(freq * 2, now);

        const modGain = this.audioContext.createGain();
        const carrierGain = this.audioContext.createGain();
        
        modulator.connect(modGain);
        modGain.connect(carrier.frequency); 
        carrier.connect(carrierGain);
        carrierGain.connect(this.mainFilter);

        const attack = 0.01; 
        const release = 0.3;

        modGain.gain.setValueAtTime(0, now);
        modGain.gain.linearRampToValueAtTime(freq * 0.5, now + attack); 
        modGain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);

        carrierGain.gain.setValueAtTime(0, now);
        carrierGain.gain.linearRampToValueAtTime(vol * 0.6, now + attack);
        
        // FIX: Ensure the ramps don't overlap. 
        // We go from peak -> slight drop -> final decay.
        if(durSeconds >= 0.1) {
            carrierGain.gain.exponentialRampToValueAtTime(vol * 0.1, now + 0.1);
            carrierGain.gain.exponentialRampToValueAtTime(0.001, now + durSeconds);
        } else {
            carrierGain.gain.exponentialRampToValueAtTime(0.001, now + durSeconds);
        }
        
        carrierGain.gain.setValueAtTime(0.001, now + durSeconds);
        carrierGain.gain.exponentialRampToValueAtTime(0.0001, now + durSeconds + release);

        carrier.start(now);
        modulator.start(now);
        
        const finalStopTime = now + durSeconds + release;
        carrier.stop(finalStopTime);
        modulator.stop(finalStopTime);

        this.activeNotes.set(note, {
            carrier: carrier,
            modulator: modulator,
            gain: carrierGain,
            stopTime: finalStopTime
        });

        setTimeout(() => {
            if (this.activeNotes.get(note)?.stopTime === finalStopTime) {
                this.activeNotes.delete(note);
            }
        }, (durSeconds + release) * 1000 + 100);
    }

    stop(note) {
        if (!this.activeNotes.has(note)) return;
        
        const now = this.audioContext.currentTime;
        const { carrier, modulator, gain } = this.activeNotes.get(note);

        // FIX: Use cancelScheduledValues and then a very fast ramp to 0.
        // Since we can't easily get the current value of a ramp, 
        // we use a very short linear ramp to "catch" the current sound 
        // and then a fast exponential fade to kill it.
        
        gain.gain.cancelScheduledValues(now);
        
        // We set the value to exactly what it is NOW to prevent the "pop" or "jump"
        // If cancelAndHoldAtTime is available (modern browsers), it's better.
        if (gain.gain.cancelAndHoldAtTime) {
            gain.gain.cancelAndHoldAtTime(now);
        } else {
            // Fallback for older browsers: just set it to current value
            gain.gain.setValueAtTime(gain.gain.value, now);
        }
        
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

        carrier.stop(now + 0.1);
        modulator.stop(now + 0.1);
        this.activeNotes.delete(note);
    }
}

window["TAG"].instruments.push(FeltPiano);
console.log("Instrument Loaded: " + window["TAG"].instruments[window["TAG"].instruments.length-1].name);
