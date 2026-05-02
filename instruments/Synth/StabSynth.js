console.log("Instrument Loaded: StabSynth v2025-01-20 21:07");

class StabSynth extends Instrument {
    constructor(audioContext) {
        super(audioContext);
        console.log("StabSynth has audioContext: " + audioContext);
        this.name = "StabSynth v2025-01-20 21:07";
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

    play(note, vol, decay = 16000) { // Default decay set to 16 seconds
        console.log("StabSynth plays(" + note + "," + vol + "," + decay + ")");
        vol *= 0.3; // Slightly lower initial volume for a softer pad
        const now = this.audioContext.currentTime;

        // Master volume
        const masterVolume = this.audioContext.createGain();
        masterVolume.gain.value = vol;
        masterVolume.connect(this.audioContext.destination);

        // Feedback delay setup
        const delayNode = this.audioContext.createDelay();
        const feedbackGain = this.audioContext.createGain();
        feedbackGain.gain.value = 0.6; // Higher feedback level for more resonation

        delayNode.delayTime.value = 0.15; // Slightly longer delay time for pad effect
        delayNode.connect(feedbackGain);
        feedbackGain.connect(delayNode);
        delayNode.connect(masterVolume);

        // Base frequency
        const freq = Instrument.midiToFrequency(note);

        // Harmonics and beat-modulated oscillators
        const harmonics = [
            { ratio: 1, amplitude: 1 },        // Fundamental
            { ratio: 1.2, amplitude: 0.9 },   // Slightly altered perfect fifth
            { ratio: 2, amplitude: 0.6 },     // Octave
            { ratio: 3, amplitude: 0.5 },     // Fifth octave
            { ratio: -1, amplitude: 0.4 }      // deep octave
        ];

        const activeNodes = []; // Track active nodes for cleanup

        harmonics.forEach(harmonic => {
            // Create multiple oscillators per harmonic for richness
            for (let i = 0; i < 3; i++) { // Three oscillators per harmonic
                const osc = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();

                // Frequency with beat modulation
                const beatOffset = i === 0 ? this.getBeat() : -this.getBeat();
                osc.frequency.value = freq * harmonic.ratio + beatOffset * 2;
                osc.type = "sawtooth"; // Using sawtooth wave for richer texture

                // Amplitude envelope with slower release for pad
                gainNode.gain.setValueAtTime(0, now);
                gainNode.gain.linearRampToValueAtTime(vol * harmonic.amplitude, now + 0.02); // Attack
                gainNode.gain.linearRampToValueAtTime(0.6 * vol * harmonic.amplitude, now + 0.1); // Slight drop
                gainNode.gain.exponentialRampToValueAtTime(0.0001, now + decay / 1000); // Slow release

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
window["TAG"].instruments.push(StabSynth);
console.log("Instrument Loaded: " + window["TAG"].instruments[window["TAG"].instruments.length - 1].name);
