console.log("Instrument Loaded: FeltPiano v2025-04-28-Scheduled");

class FeltPiano extends Instrument {
    constructor(audioContext) {
        super(audioContext);
        this.name = "FeltPiano v2025-04-28-Scheduled";
        this.audioContext = audioContext;
        
        // Map voor actieve noten (voor het geval dat we een noot voortijdig willen stoppen)
        this.activeNotes = new Map();
        
        // Global Low Pass Filter voor de "felt" dofheid
        this.mainFilter = this.audioContext.createBiquadFilter();
        this.mainFilter.type = "lowpass";
        this.mainFilter.frequency.setValueAtTime(1800, this.audioContext.currentTime);
        this.mainFilter.Q.setValueAtTime(0.7, this.audioContext.currentTime);
        this.mainFilter.connect(this.audioContext.destination);
    }

    /**
     * @param {number} note - MIDI noot
     * @param {number} vol - Volume (0-1)
     * @param {number} duration - Duur in milliseconden
     */
    play(note, vol, duration = 2000) {
        const now = this.audioContext.currentTime;
        const freq = Instrument.midiToFrequency(note);
        const durSeconds = duration / 1000;

        // 1. OSCILLATORS
        const carrier = this.audioContext.createOscillator();
        carrier.type = "sine";
        carrier.frequency.setValueAtTime(freq, now);

        const modulator = this.audioContext.createOscillator();
        modulator.type = "sine";
        modulator.frequency.setValueAtTime(freq * 2, now);

        const modGain = this.audioContext.createGain();
        const carrierGain = this.audioContext.createGain();
        
        // 2. ROUTING
        modulator.connect(modGain);
        modGain.connect(carrier.frequency);
        carrier.connect(carrierGain);
        carrierGain.connect(this.mainFilter);

        // 3. ENVELOPES
        const attack = 0.02;
        const release = 0.4; // De natuurlijke "uitstervings-tijd" van de snaar

        // Modulator Envelope: Korte piek (hamer) -> doffe toon
        modGain.gain.setValueAtTime(0, now);
        modGain.gain.linearRampToValueAtTime(freq * 1.5, now + attack); 
        modGain.gain.exponentialRampToValueAtTime(freq * 0.05, now + 0.1);

        // Amplitude Envelope: 
        // Start zacht -> Peak -> Hold tot duration -> Release
        carrierGain.gain.setValueAtTime(0, now);
        carrierGain.gain.linearRampToValueAtTime(vol * 0.6, now + attack);
        
        // Houd de noot vast tot de duration is bereikt
        carrierGain.gain.setValueAtTime(vol * 0.6, now + durSeconds);
        
        // Start de release fase (het vilt dat de snaar dempt)
        carrierGain.gain.exponentialRampToValueAtTime(0.001, now + durSeconds + release);

        // 4. SCHEDULING
        carrier.start(now);
        modulator.start(now);
        
        // Stop de oscillators definitief na de volledige duration + release
        const finalStopTime = now + durSeconds + release;
        carrier.stop(finalStopTime);
        modulator.stop(finalStopTime);

        // Sla op in map voor eventuele externe stop() calls
        this.activeNotes.set(note, {
            carrier: carrier,
            modulator: modulator,
            gain: carrierGain,
            stopTime: finalStopTime
        });

        // Opschonen van de map zodra de noot klaar is
        setTimeout(() => {
            if (this.activeNotes.get(note)?.stopTime === finalStopTime) {
                this.activeNotes.delete(note);
            }
        }, (durSeconds + release) * 1000 + 100);
    }

    // Optioneel: forceer stop van een noot (bijv. bij een plotselinge harmoniewissel)
    stop(note) {
        if (!this.activeNotes.has(note)) return;

        const now = this.audioContext.currentTime;
        const { carrier, modulator, gain } = this.activeNotes.get(note);

        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        carrier.stop(now + 0.3);
        modulator.stop(now + 0.3);
        this.activeNotes.delete(note);
    }
}

window["TAG"].instruments.push(FeltPiano);
console.log("Instrument Loaded: " + window["TAG"].instruments[window["TAG"].instruments.length-1].name);
