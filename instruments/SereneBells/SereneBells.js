console.log("Instrument Loaded: SereneBells v2026-05-02-145:38");

class SereneBells extends Instrument {
    constructor(audioContext) {
        super(audioContext);
        console.log("Serenebells has audioContext: " + audioContext);
        this.name = "SereneBells v2026-05-02-145:38";
        this.audioContext = audioContext;
        this.beatmin = 0.5;
        this.beatmax = 8;
        
        // Added for the new testbed stop capacity
        this.activeNotes = new Map();
    }

    setBeatMin(nr) { this.beatmin = nr; }
    setBeatMax(nr) { this.beatmax = nr; }
    getBeat() { return Math.random() * (this.beatmax - this.beatmin) + this.beatmin; }

    // ADDED: startTime parameter for offline rendering
    play(note, vol, decay = 10000, startTime = null) {
        // USE THIS instead of this.audioContext.currentTime everywhere below
        const now = startTime !== null ? startTime : this.audioContext.currentTime;

        var o1 = this.audioContext.createOscillator();
        var o2 = this.audioContext.createOscillator();
        var o3 = this.audioContext.createOscillator();
        var o4 = this.audioContext.createOscillator();

        var vol1 = this.audioContext.createGain();
        var vol2 = this.audioContext.createGain();
        var masterVolume = this.audioContext.createGain();

        masterVolume.connect(this.audioContext.destination);
        vol2.connect(masterVolume);
        vol1.connect(masterVolume);

        o1.connect(vol1);
        o2.connect(vol2);

        var reactiontime = 5 / 1000;
        var panPosition = Math.random() * 2 - 1;
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

        // ORIGINAL LOGIC - Now using 'now'
        vol1.gain.linearRampToValueAtTime(0, now + reactiontime);
        vol2.gain.linearRampToValueAtTime(0, now + reactiontime);
        masterVolume.gain.linearRampToValueAtTime(0, now + reactiontime);

        o1.start(now + reactiontime);
        o2.start(now + reactiontime);
        o3.start(now + reactiontime);
        o4.start(now + reactiontime);

        var attack = 5;
        var freq = Instrument.midiToFrequency(note) + Math.random();

        panner1.pan.setValueAtTime(panPosition, now + reactiontime);
        panner2.pan.setValueAtTime(-panPosition, now + reactiontime);

        var freq1 = freq;
        var freq2 = freq + this.getBeat();
        
        o1.frequency.linearRampToValueAtTime(freq, now);
        o2.frequency.linearRampToValueAtTime(freq2, now);
        var freqdif = 0.500 / Math.abs(freq2 - freq1);
        o3.frequency.linearRampToValueAtTime(freq, now);
        o4.frequency.linearRampToValueAtTime(freq2, now);

        var voldim = 600;
        if (note > 14) voldim = 1200;
        if (note > 40) voldim = 2400;

        vol1.gain.linearRampToValueAtTime(15 / voldim, now + reactiontime * 2 + attack / 1000);
        vol1.gain.linearRampToValueAtTime(6 / voldim, now + reactiontime * 2 + (attack + decay / 4) / 1000);
        vol1.gain.linearRampToValueAtTime(4 / voldim, now + reactiontime * 2 + (attack + decay / 3) / 1000);
        
        var duration = (attack + decay) / 1000;
        var fixedDuration = Math.round(duration * (freq1 * 2)) / (freq1 * 2);
        vol1.gain.linearRampToValueAtTime(0.0001, now + reactiontime * 2 + fixedDuration);

        vol2.gain.linearRampToValueAtTime(15 / voldim, now + reactiontime * 2 + attack / 1000);
        vol2.gain.linearRampToValueAtTime(2 / voldim, now + reactiontime * 2 + (attack + decay / 4) / 1000);

        masterVolume.gain.linearRampToValueAtTime(1, now + reactiontime * 2 + freqdif);

        o1.stop(now + reactiontime + fixedDuration);
        o3.stop(now + reactiontime + fixedDuration);

        fixedDuration = Math.round(duration * (freq2 * 2)) / (freq2 * 2);
        vol2.gain.linearRampToValueAtTime(0.0001, now + reactiontime * 2 + fixedDuration);

        o2.stop(now + reactiontime + fixedDuration);
        o4.stop(now + reactiontime + fixedDuration);

        // Tracking for stop() capacity
        const finalStopTime = now + reactiontime + Math.max(fixedDuration, 0.1); 
        this.activeNotes.set(note, {
            oscillators: [o1, o2, o3, o4],
            gains: [vol1, vol2, masterVolume],
            stopTime: finalStopTime
        });

        setTimeout(() => {
            if (this.activeNotes.get(note)?.stopTime === finalStopTime) {
                this.activeNotes.delete(note);
            }
        }, (finalStopTime - now) * 1000 + 100);

        var bellEvent = new CustomEvent('bellFired', { detail: { special: false, freq: freq, warble: Math.abs(freq2 - freq1) } });
        document.dispatchEvent(bellEvent);
    }

    // Added to prevent errors in the Master Testbed
    stop(note) {
        if (!this.activeNotes.has(note)) return;
        const now = this.audioContext.currentTime;
        const { oscillators, gains } = this.activeNotes.get(note);
        gains.forEach(g => {
            g.gain.cancelScheduledValues(now);
            g.gain.setValueAtTime(g.gain.value, now);
            g.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
        });
        oscillators.forEach(o => { try { o.stop(now + 0.2); } catch(e) {} });
        this.activeNotes.delete(note);
    }
}

window["TAG"].instruments.push(SereneBells);
console.log("Instrument Loaded: " + window["TAG"].instruments[window["TAG"].instruments.length - 1].name);


