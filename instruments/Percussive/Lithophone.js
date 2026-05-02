console.log("Instrument Loaded: Lithophone v2025-01-20 21:07");

class Lithophone extends Instrument {
    constructor(audioContext) {
        super(audioContext);
        console.log("Lithophone has audioContext: " + audioContext);
        this.name = "Lithophone v2025-01-20 21:07";
        this.audioContext = audioContext;
        this.beatmin = 0.5;
        this.beatmax = 1.5;
        
        // Added to support spontaneous stop() calls
        this.activeNotes = new Map();
    }

    setBeatMin(nr) { this.beatmin = nr; }
    setBeatMax(nr) { this.beatmax = nr; }
    getBeat() { return Math.random() * (this.beatmax - this.beatmin) + this.beatmin; }

        play(note, vol, decay = 800, startTime = null) { 
        // 1. HANDLE TIME
        const now = startTime !== null ? startTime : this.audioContext.currentTime;
        
        vol *= 0.5; 
        const durSeconds = decay / 1000;

        // Master volume
        const masterVolume = this.audioContext.createGain();
        masterVolume.gain.setValueAtTime(vol, now);

        // --- CHANGE 1: CONNECT TO CHANNEL ---
        // Instead of .destination, we connect to this.channel for Effects/Reverb
        masterVolume.connect(this.channel);

        // Feedback delay setup
        const delayNode = this.audioContext.createDelay();
        const feedbackGain = this.audioContext.createGain();
        
        feedbackGain.gain.setValueAtTime(0.2, now); 
        delayNode.delayTime.setValueAtTime(0.1, now); 
        
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        delayNode.connect(masterVolume);

        // --- CHANGE 2: MICROTONAL CALL ---
        // We pass this.scaleMap, this.basePitch to allow the global settings to work
        const freq = Instrument.midiToFrequency(note, this.scaleMap, this.basePitch);

        const harmonics = [
            { ratio: 1, amplitude: 1 },
            { ratio: 0.5, amplitude: 0.6 },
            { ratio: 0.25, amplitude: 0.4 },
            { ratio: 4, amplitude: 0.7 },
            { ratio: 6, amplitude: 0.6 }
        ];

        const noteOscillators = []; 

        harmonics.forEach(harmonic => {
            for (let i = 0; i < 2; i++) { 
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                const beatOffset = i === 0 ? this.getBeat() : -this.getBeat();
                osc.frequency.setValueAtTime(freq * harmonic.ratio + beatOffset * 5, now);
                osc.type = "square";

                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(vol * harmonic.amplitude, now + 0.001); 
                gainNode.gain.linearRampToValueAtTime(0.1 * vol * harmonic.amplitude, now + 0.2 * Math.pow(0.7, i)); 
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durSeconds); 

                osc.connect(gainNode);
                gainNode.connect(delayNode); 
                
                osc.start(now);
                osc.stop(now + durSeconds);

                noteOscillators.push({ osc, gainNode });
            }
        });

        const finalStopTime = now + durSeconds;
        this.activeNotes.set(note, {
            oscillators: noteOscillators,
            masterGain: masterVolume,
            stopTime: finalStopTime
        });

        setTimeout(() => {
            if (this.activeNotes.get(note)?.stopTime === finalStopTime) {
                noteOscillators.forEach(({ osc, gainNode }) => {
                    osc.disconnect();
                    gainNode.disconnect();
                });
                delayNode.disconnect();
                feedbackGain.disconnect();
                masterVolume.disconnect();
                this.activeNotes.delete(note);
            }
        }, (durSeconds * 1000) + 100);
    }

    // Added stop method for consistency with other instruments
    stop(note) {
        if (!this.activeNotes.has(note)) return;

        const now = this.audioContext.currentTime;
        const { oscillators, masterGain } = this.activeNotes.get(note);

        // Fade out the master volume of the lithophone strike
        masterGain.gain.cancelScheduledValues(now);
        masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

        oscillators.forEach(({ osc }) => {
            try { osc.stop(now + 0.1); } catch(e) {}
        });

        this.activeNotes.delete(note);
    }
}

window["TAG"].instruments.push(Lithophone);
console.log("Instrument Loaded: " + window["TAG"].instruments[window["TAG"].instruments.length - 1].name);
