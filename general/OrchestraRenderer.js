/**
 * OrchestraRenderer handles the "Pre-recording" of music.
 * It uses an OfflineAudioContext to render sounds as fast as the CPU allows,
 * producing a sample-accurate AudioBuffer that can be played back without clicks.
 */
class OrchestraRenderer {
    /**
     * @param {Array} score - Array of note events. 
     * Format: [{ instrument: InstrumentClass, note: 60, vol: 0.5, start: 0, duration: 1000 }, ...]
     * @param {number} totalDurationSeconds - Total length of the render in seconds
     * @param {number} sampleRate - Audio sample rate (default 44100)
     */
    async renderOrchestra(score, totalDurationSeconds, sampleRate = 44100) {
        // 1. Create the Offline Context
        // This context does not connect to speakers; it renders to a buffer.
        const offlineCtx = new OfflineAudioContext(
            2, // Stereo
            sampleRate * totalDurationSeconds, 
            sampleRate
        );

        // 2. Instantiate instruments
        // We use a map so if the score has 50 piano notes, 
        // we only create ONE instance of the FeltPiano class.
        const instrumentInstances = {};

        score.forEach(event => {
            const InstClass = event.instrument;
            
            // Check if we already have an instance of this instrument for this render
            if (!instrumentInstances[InstClass.name]) {
                instrumentInstances[InstClass.name] = new InstClass(offlineCtx);
            }

            const inst = instrumentInstances[InstClass.name];
            
            /**
             * IMPORTANT: For this to work, your instrument.play() must be updated to:
             * play(note, vol, duration, startTime = null) {
             *    const now = startTime !== null ? startTime : this.audioContext.currentTime;
             *    ...
             * }
             */
            inst.play(
                event.note, 
                event.vol, 
                event.duration, 
                event.start // Pass the precise start time from the score
            );
        });

        // 3. Render the entire timeline to an AudioBuffer
        // This is an asynchronous process.
        const renderedBuffer = await offlineCtx.startRendering();
        return renderedBuffer;
    }
}
