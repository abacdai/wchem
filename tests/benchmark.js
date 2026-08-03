const { loadHandBridge, makeHand, makeOpenHand } = require('./harness');

const FRAMES = 2000;
const WARMUP = 200;
const { api } = loadHandBridge({ withCanvas: true });

for (let i = 0; i < WARMUP; i += 1) {
  api.processFrame({ landmarks: [makeHand(), makeOpenHand()] });
}

const t0 = process.hrtime.bigint();
for (let i = 0; i < FRAMES; i += 1) {
  api.processFrame({ landmarks: [makeHand(), makeOpenHand()] });
}
const elapsedMs = Number(process.hrtime.bigint() - t0) / 1e6;
const usPerFrame = (elapsedMs / FRAMES) * 1000;

console.log(`processFrame hot path: ${usPerFrame.toFixed(1)} µs/frame (2 hands, canvas + AR overlay, steady state)`);
console.log(`throughput equivalent: ${(1e6 / usPerFrame).toFixed(0)} frames/s of pure tracking loop`);
