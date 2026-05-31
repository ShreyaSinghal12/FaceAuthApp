// Converts raw camera frame data to normalized Float32Array
// that MobileFaceNet expects: 112x112x3, values between -1 and 1

const INPUT_SIZE = 112;

export function preprocessFrame(
  frameData: Uint8Array,
  frameWidth: number,
  frameHeight: number
): Float32Array {
  const output = new Float32Array(INPUT_SIZE * INPUT_SIZE * 3);
  
  const xScale = frameWidth / INPUT_SIZE;
  const yScale = frameHeight / INPUT_SIZE;

  let outputIdx = 0;

  for (let y = 0; y < INPUT_SIZE; y++) {
    for (let x = 0; x < INPUT_SIZE; x++) {
      // Sample pixel from source frame
      const srcX = Math.floor(x * xScale);
      const srcY = Math.floor(y * yScale);
      const srcIdx = (srcY * frameWidth + srcX) * 4; // RGBA

      // Normalize from [0, 255] to [-1, 1]
      output[outputIdx++] = (frameData[srcIdx] / 127.5) - 1;     // R
      output[outputIdx++] = (frameData[srcIdx + 1] / 127.5) - 1; // G
      output[outputIdx++] = (frameData[srcIdx + 2] / 127.5) - 1; // B
      // Alpha channel ignored
    }
  }

  return output;
}