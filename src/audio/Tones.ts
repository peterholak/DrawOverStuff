// Simple audio context for playing tones
let audioContext: AudioContext | undefined;

function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new AudioContext();
    }
    return audioContext;
}

function playTone(frequency: number, duration: number = 0.1) {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Use sine wave for a pleasant tone
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;

    // Add a slight fade out
    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
}

export function playLayer1Tone() {
    playTone(262, 0.25); // C4 note (middle C), even longer duration
}

export function playLayer2Tone() {
    playTone(880); // A5 note, one octave higher
} 