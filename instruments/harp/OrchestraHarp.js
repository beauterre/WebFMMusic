console.log("Instrument Loaded: OrchestraHarp v2026-05-02 18:00");

class OrchestraHarp extends Instrument {
    constructor(audioContext) {
        super(audioContext);
        this.name = "OrchestraHarp v2026-05-02 18:00";
        this.audioContext = audioContext;
        this.activeNotes = new Map();
    }

    /**
     * @param {number} note - MIDI note
     * @param {number} vol - Volume
     * @param {number} decay - Decay in ms
     * @param {number|null} startTime - Absolute time in seconds
     */
    play(note, vol, decay = 4000, startTime = null) {
        const now = startTime !== null ? startTime : this.audioContext.currentTime;
        const freq = Instrument.midiToFrequency(note, this.scaleMap, this.basePitch);
        const durSeconds = decay / 1000;

        // 1. MASTER CHANNEL for this note
        const noteGain = this.audioContext.createGain();
        
        // 2. Tonal Filter (The "Wood" resonance)
        // A harp loses high frequencies quickly. We create a filter that decays.
        const toneFilter = this.audioContext.createBiquadFilter();
        toneFilter.type = "lowpass";
        toneFilter.frequency.setValueAtTime(3000, now);
        toneFilter.frequency.exponentialRampToValueAtTime(400, now + durSeconds);
        toneFilter.Q.setValueAtTime(1, now);

        noteGain.connect(toneFilter);
        toneFilter.connect(this.channel);

        // 3. ADDITIVE SYNTHESIS (The String Timbre)
        // Harp strings aren't pure sines; they have specific harmonic overtones.
        const harmonics = [
            { ratio: 1.0, amp: 1.0, type: 'sine' },    // Fundamental
            { ratio: 2.0, amp: 0.4, type: 'sine' },    // 1st Octave (strength)
            { ratio: 3.0, amp: 0.15, type: 'sine' },   // 3rd harmonic
            { ratio: 4.0, amp: 0.08, type: 'sine' },   // 2nd Octave
            { ratio: 1.005, amp: 0.6, type: 'sine' },  // SLIGHT DETUNE for "Chorus" effect
        ];

        const noteOscillators = [];

        harmonics.forEach(h => {
            const osc = this.audioContext.createOscillator();
            const g = this.audioContext.createGain();

            osc.type = h.type;
            osc.frequency.setValueAtTime(freq * h.ratio, now);

            // Harp Amplitude Envelope: Very sharp pluck, smooth decay
            g.gain.setValueAtTime(0, now);
            g.gain.linearRampToValueAtTime(vol * h.amp, now + 0.005); // Ultra-fast pluck
            g.gain.exponentialRampToValueAtTime(0.0001, now + durSeconds);

            osc.connect(g);
            g.connect(noteGain);
            
            osc.start(now);
            osc.stop(now + durSeconds + 0.1);

            noteOscillators.push({ osc, g });
        });

        // Final Note Volume Envelope
        noteGain.gain.setValueAtTime(1, now);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, now + durSeconds + 0.1);

        // Storage for stop()
        const finalStopTime = now + durSeconds + 0.1;
        this.activeNotes.set(note, {
            oscillators: noteOscillators,
            masterGain: noteGain,
            stopTime: finalStopTime
        });

        setTimeout(() => {
            if (this.activeNotes.get(note)?.stopTime === finalStopTime) {
                noteOscillators.forEach(({ osc, g }) => {
                    osc.disconnect();
                    g.disconnect();
                });
                toneFilter.disconnect();
                noteGain.disconnect();
                this.activeNotes.delete(note);
            }
        }, (durSeconds * 1000) + 200);
    }

    stop(note) {
        if (!this.activeNotes.has(note)) return;
        const now = this.audioContext.currentTime;
        const { oscillators, masterGain } = this.activeNotes.get(note);

        masterGain.gain.cancelScheduledValues(now);
        if (masterGain.gain.cancelAndHoldAtTime) {
            masterGain.gain.cancelAndHoldAtTime(now);
        } else {
            masterGain.gain.setValueAtTime(masterGain.gain.value, now);
        }
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

        oscillators.forEach(({ osc }) => {
            try { osc.stop(now + 0.2); } catch(e) {}
        });

        this.activeNotes.delete(note);
    }
}

window["TAG"].instruments.push(OrchestraHarp);
console.log("Instrument Loaded: " + window["TAG"].instruments[window["TAG"].instruments.length - 1].name);
