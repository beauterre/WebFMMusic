class OrchestraRenderer {
    /**
     * @param {Array} score - Array of notes: [{ instrument: InstrumentClass, note: 60, vol: 0.5, start: 0, duration: 1000 }, ...]
     * @param {number} totalDurationSeconds - Total length of the piece
     * @param {number} sampleRate - usually 44100
     */
    async renderOrchestra(score, totalDurationSeconds, sampleRate = 44100) {
        // 1. Create the Offline Context
        const offlineCtx = new OfflineAudioContext(
            2, // Stereo
            sampleRate * totalDurationSeconds, 
            sampleRate
        );

        // 2. Instantiate the instruments using the offline context
        // We create a map so we don't create 100 copies of the same instrument
        const instrumentInstances = {};

        score.forEach(event => {
            const InstClass = event.instrument;
            if (!instrumentInstances[InstClass.name]) {
                instrumentInstances[InstClass.name] = new InstClass(offlineCtx);
            }

            const inst = instrumentInstances[InstClass.name];
            
            // Your Instrument.play() uses this.audioContext.currentTime.
            // In OfflineAudioContext, we need to shift the time.
            // We have to modify the play method slightly or wrap it.
            
            // Note: Since your current .play() uses this.audioContext.currentTime, 
            // we need to handle the offset. I'll show you the fix below.
            inst.play(event.note, event.vol, event.duration, event.start);
        });

        // 3. Render everything to a buffer
        const renderedBuffer = await offlineCtx.startRendering();
        return renderedBuffer;
    }
}
