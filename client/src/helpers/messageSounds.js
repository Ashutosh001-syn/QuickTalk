let audioContext;

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;
  audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
  return audioContext;
};

const playTone = (frequency, duration, volume) => {
  try {
    const context = getAudioContext();
    if (!context) return;
    if (context.state === 'suspended') context.resume();

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {
    // Audio is optional and may be blocked by the browser.
  }
};

export const playMessageSentSound = () => playTone(720, 0.09, 0.045);
export const playMessageReceivedSound = () => playTone(520, 0.16, 0.06);