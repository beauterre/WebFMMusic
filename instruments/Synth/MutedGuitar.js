console.log("Instrument Loaded: MutedGuitar v2025-01-20 21:30");

class MutedGuitar extends Instrument {
    constructor(audioContext) {
        super(audioContext);
        console.log("MutedGuitar has audioContext: " + audioContext);
        this.name = "MutedGuitar v2025-01-20 21:30";
        this.audioContext = audioContext;
        this.beatmin = 0.3;
        this.beatmax = 1;
    }

    setBeatMin(nr) {
        this.beatmin = nr;
    }

    setBeatMax(nr) {
        this.beatmax = nr;
    }

    getBeat() {
        return Math.random() * (this.beatmax - this.beatmin) + this.beatmin;
    }

    play(note, vol, decay = 2000) { // Default decay set to 2 seconds
        console.log("MutedGuitar plays(" + note + "," + vol + "," + decay + ")");
        vol *= 0.4; // Slightly reduced volume for a natural MutedGuitar tone
        const now = this.audioContext.currentTime;

        // Master volume
        const masterVolume = this.audioContext.createGain();
        masterVolume.gain.value = vol;
        masterVolume.connect(this.audioContext.destination);

        // MutedGuitar delay setup (a subtle reverb to mimic acoustic space)
        const delayNode = this.audioContext.createDelay();
        const feedbackGain = this.audioContext.createGain();
        feedbackGain.gain.value = 0.3; // Light feedback for acoustic feel

        delayNode.delayTime.value = 0.0125; // Short delay
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        delayNode.connect(masterVolume);

        // Base frequency
        const freq = Instrument.midiToFrequency(note);

        // MutedGuitar-specific harmonics (plucked string resonance)
        const harmonics = [
            { ratio: 1, amplitude: 1 },        // Fundamental frequency
            { ratio: 2, amplitude: 0.6 },      // 2nd harmonic (octave)
            { ratio: 3, amplitude: 0.3 },      // 3rd harmonic (fifth)
            { ratio: 4, amplitude: 0.2 },      // 4th harmonic
            { ratio: 5, amplitude: 0.1 }       // 5th harmonic (subtle overtone)
        ];

        const activeNodes = []; // Track active nodes for cleanup

        harmonics.forEach(harmonic => {
            // Create multiple oscillators per harmonic for a natural, rich tone
            for (let i = 0; i < 2; i++) { // More oscillators to emulate string interaction
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                // Frequency with slight detuning for a more realistic sound
                const beatOffset = this.getBeat();
                osc.frequency.value = freq * harmonic.ratio + beatOffset;

                osc.type = "sine"; // Sine wave for smoother, string-like resonance

                // Amplitude envelope with quick attack and longer decay
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(vol * harmonic.amplitude, now + 0.0001); // plucked attack
                gainNode.gain.linearRampToValueAtTime(0.05 * vol * harmonic.amplitude, now + 0.05*Math.pow(0.99,i));gainNode.gain.linearRampToValueAtTime(0.025 * vol * harmonic.amplitude, now + 0.1*Math.pow(0.99,i)); // Slight drop
                gainNode.gain.exponentialRampToValueAtTime(0.00001, now + decay / 1000); // Longer decay

                // Connect nodes
                osc.connect(gainNode);
                gainNode.connect(delayNode); // Connect to delay node for subtle reverb
                osc.start(now);
                osc.stop(now + decay / 1000);

                // Track nodes for cleanup
                activeNodes.push({ osc, gainNode });
            }
        });

        // Cleanup nodes after they finish
        setTimeout(() => {
            activeNodes.forEach(({ osc, gainNode }) => {
                osc.disconnect();
                gainNode.disconnect();
            });
            delayNode.disconnect();
            feedbackGain.disconnect();
            masterVolume.disconnect();
        }, decay); // Ensure cleanup after the sound has fully decayed

       
    }
}

// Add to list
window["TAG"].instruments.push(MutedGuitar);
console.log("Instrument Loaded: " + window["TAG"].instruments[window["TAG"].instruments.length - 1].name);
