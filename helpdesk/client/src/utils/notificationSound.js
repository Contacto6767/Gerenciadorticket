// Soft marimba-style "pling" using Web Audio API
// Two ascending notes: E5 (659Hz) then A5 (880Hz), 90ms apart

let audioCtx = null;
let soundEnabled = (() => {
  try {
    const stored = localStorage.getItem('notificationSound');
    return stored === null ? true : stored === '1';
  } catch {
    return true;
  }
})();

export function initAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function setSoundEnabled(val) {
  soundEnabled = val;
  localStorage.setItem('notificationSound', val ? '1' : '0');
}

export function getSoundEnabled() {
  const stored = localStorage.getItem('notificationSound');
  return stored === null ? true : stored === '1';
}

function playNote(freq, startTime, masterGain) {
  const now = startTime;
  const attackTime = 0.005;
  const decayTime = 0.300;

  const osc1 = audioCtx.createOscillator();
  const gain1 = audioCtx.createGain();
  osc1.type = 'sine';
  osc1.frequency.value = freq;
  gain1.gain.setValueAtTime(0, now);
  gain1.gain.linearRampToValueAtTime(1.0, now + attackTime);
  gain1.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayTime);
  osc1.connect(gain1);
  gain1.connect(masterGain);
  osc1.start(now);
  osc1.stop(now + attackTime + decayTime);

  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2;
  gain2.gain.setValueAtTime(0, now);
  gain2.gain.linearRampToValueAtTime(0.15, now + attackTime);
  gain2.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayTime);
  osc2.connect(gain2);
  gain2.connect(masterGain);
  osc2.start(now);
  osc2.stop(now + attackTime + decayTime);
}

export function playNotificationSound() {
  if (!soundEnabled || !audioCtx) return;
  if (audioCtx.state === 'suspended') audioCtx.resume();

  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.25;
  masterGain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;
  playNote(659, now, masterGain);         // E5
  playNote(880, now + 0.090, masterGain); // A5
}
