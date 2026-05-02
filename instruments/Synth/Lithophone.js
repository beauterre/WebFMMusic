console.log("Instrument Loaded: Lithophone v2025-01-20 21:07");

class Lithophone extends Instrument {
    constructor(audioContext) {
        super(audioContext);
        console.log("Lithophone has audioContext: " + audioContext);
        this.name = "Lithophone v2025-01-20 21:07";
        this.audioContext = audioContext;
        this.beatmin = 0.5;
        this.beatmax = 1.5;
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

    play(note, vol, decay = 800) { // Default decay set to 6 seconds
        console.log("Lithophone plays(" + note + "," + vol + "," + decay + ")");
        vol *= 0.5; // Amplified for strong percussive effect
        const now = this.audioContext.currentTime;

        // Master volume
        const masterVolume = this.audioContext.createGain();
        masterVolume.gain.value = vol;
        masterVolume.connect(this.audioContext.destination);

        // Feedback delay setup
        const delayNode = this.audioContext.createDelay();
        const feedbackGain = this.audioContext.createGain();
        feedbackGain.gain.value = 0.2; // Moderate feedback

        delayNode.delayTime.value = 0.1; // Longer delay to create a deep echo
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        delayNode.connect(masterVolume);

        // Base frequency
        const freq = Instrument.midiToFrequency(note);

        // Lithophone-specific harmonics (deeper, earthy tones)
        const harmonics = [
            { ratio: 1, amplitude: 1 },        // Fundamental
            { ratio: 0.5, amplitude: 0.6 },   // Lower fifth (deep resonance)
            { ratio: 0.25, amplitude: 0.4 },     // Octave (gives a big "stone" feel)
            { ratio: 4, amplitude: 0.7 },     // Higher octave harmonic
            { ratio: 6, amplitude: 0.6 }      // Further overtones (subtle)
        ];

        const activeNodes = []; // Track active nodes for cleanup

        harmonics.forEach(harmonic => {
            // Create multiple oscillators per harmonic for a more resonant, natural tone
            for (let i = 0; i < 2; i++) { // Two oscillators per harmonic for a more solid, natural feel
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                // Frequency with beat modulation for slight detuning (for realism)
                const beatOffset = i === 0 ? this.getBeat() : -this.getBeat();
                osc.frequency.value = freq * harmonic.ratio + beatOffset * 5;
                osc.type = "square"; // Square wave for a more solid, bell-like timbre

                // Amplitude envelope with moderate attack and long decay
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(vol * harmonic.amplitude, now + 0.001); // Attack
                gainNode.gain.linearRampToValueAtTime(0.1 * vol * harmonic.amplitude, now + 0.2*Math.pow(0.7,i)); // Slight drop
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay / 1000); // Release

                // Connect nodes
                osc.connect(gainNode);
                gainNode.connect(delayNode); // Connect to delay node for feedback
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
window["TAG"].instruments.push(Lithophone);
console.log("Instrument Loaded: " + window["TAG"].instruments[window["TAG"].instruments.length - 1].name);
