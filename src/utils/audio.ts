import lamejs from 'lamejs';

const SAMPLE_RATE = 24000;

/**
 * Converts a base64 string of raw 16-bit PCM little-endian audio into an Int16Array.
 */
export function base64ToInt16Array(base64: string): Int16Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  // Ensure word alignment for 16-bit samples
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength - (bytes.byteLength % 2)
  );
  return new Int16Array(buffer);
}

/**
 * Converts an Int16Array to a base64 string.
 */
export function int16ArrayToBase64(int16: Int16Array): string {
  const uint8 = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

/**
 * Concatenates multiple PCM Int16Array chunks with a silence gap (in milliseconds).
 */
export function concatenatePcmChunks(
  chunks: Int16Array[],
  silenceMs: number = 350,
  sampleRate: number = SAMPLE_RATE
): { combined: Int16Array; turnOffsets: { startSec: number; durationSec: number }[] } {
  const silenceSamplesCount = Math.floor((silenceMs / 1000) * sampleRate);
  const silenceChunk = new Int16Array(silenceSamplesCount);

  let totalLength = 0;
  for (let i = 0; i < chunks.length; i++) {
    totalLength += chunks[i].length;
    if (i < chunks.length - 1) {
      totalLength += silenceSamplesCount;
    }
  }

  const combined = new Int16Array(totalLength);
  const turnOffsets: { startSec: number; durationSec: number }[] = [];
  let currentOffset = 0;

  for (let i = 0; i < chunks.length; i++) {
    const startSec = currentOffset / sampleRate;
    const durationSec = chunks[i].length / sampleRate;
    turnOffsets.push({ startSec, durationSec });

    combined.set(chunks[i], currentOffset);
    currentOffset += chunks[i].length;

    if (i < chunks.length - 1) {
      combined.set(silenceChunk, currentOffset);
      currentOffset += silenceSamplesCount;
    }
  }

  return { combined, turnOffsets };
}

/**
 * Encodes 16-bit mono PCM into standard WAV format.
 */
export function pcmToWavBlob(pcm: Int16Array, sampleRate: number = SAMPLE_RATE): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataByteLength = pcm.length * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length minus RIFF identifier and length
  view.setUint32(4, 36 + dataByteLength, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (raw PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numChannels, true);
  // sample rate
  view.setUint32(24, sampleRate, true);
  // byte rate
  view.setUint32(28, byteRate, true);
  // block align
  view.setUint16(32, blockAlign, true);
  // bits per sample
  view.setUint16(34, bitsPerSample, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, dataByteLength, true);

  // Write PCM audio data
  const pcmBytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  const destBytes = new Uint8Array(buffer, 44);
  destBytes.set(pcmBytes);

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Encodes 16-bit mono PCM into an MP3 Blob using lamejs.
 */
export function pcmToMp3Blob(
  pcm: Int16Array,
  sampleRate: number = SAMPLE_RATE,
  kbps: number = 128
): Blob {
  try {
    // lamejs expects 1 channel, sampleRate, kbps
    // Handle both default and named export variations of lamejs
    const EncoderClass = (lamejs as unknown as { Mp3Encoder: typeof lamejs.Mp3Encoder }).Mp3Encoder || lamejs.Mp3Encoder;
    if (!EncoderClass) {
      console.warn('lamejs.Mp3Encoder not found, falling back to WAV blob');
      return pcmToWavBlob(pcm, sampleRate);
    }

    const mp3encoder = new EncoderClass(1, sampleRate, kbps);
    const mp3Data: Uint8Array[] = [];
    const sampleBlockSize = 1152;

    for (let i = 0; i < pcm.length; i += sampleBlockSize) {
      const sampleChunk = pcm.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3encoder.encodeBuffer(sampleChunk);
      if (mp3buf.length > 0) {
        mp3Data.push(new Uint8Array(mp3buf));
      }
    }

    const mp3End = mp3encoder.flush();
    if (mp3End.length > 0) {
      mp3Data.push(new Uint8Array(mp3End));
    }

    return new Blob(mp3Data, { type: 'audio/mp3' });
  } catch (err) {
    console.error('Error encoding MP3 with lamejs, falling back to WAV:', err);
    return pcmToWavBlob(pcm, sampleRate);
  }
}

/**
 * Triggers a download in the browser for a Blob.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 100);
}
