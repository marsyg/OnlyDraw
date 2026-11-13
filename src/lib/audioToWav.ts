/**
 * Audio processing utilities for Wispr Flow Voice API
 * Converts browser MediaRecorder audio (typically WebM / OGG) into 16kHz mono 16-bit PCM WAV.
 * Reference: https://api-docs.wisprflow.ai/quickstart and https://api-docs.wisprflow.ai/rest_api_quickstart
 */

export async function convertBlobTo16kHzWav(audioBlob: Blob): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('Audio conversion must run in the browser');
  }

  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    throw new Error('AudioContext is not supported in this browser');
  }

  const audioContext = new AudioContextClass();
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Wispr Flow requires 16kHz mono PCM16 WAV
  const targetSampleRate = 16000;
  const resampleRatio = targetSampleRate / audioBuffer.sampleRate;
  const newLength = Math.max(1, Math.floor(audioBuffer.length * resampleRatio));

  const offlineAudioContext = new OfflineAudioContext(1, newLength, targetSampleRate);

  const source = offlineAudioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineAudioContext.destination);
  source.start(0);

  const renderedBuffer = await offlineAudioContext.startRendering();

  const numberOfChannels = 1;
  const dataByteLength = renderedBuffer.length * numberOfChannels * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  const writeString = (v: DataView, offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  let offset = 0;

  // RIFF chunk descriptor
  writeString(view, offset, 'RIFF');
  offset += 4;
  view.setUint32(offset, 36 + dataByteLength, true);
  offset += 4;
  writeString(view, offset, 'WAVE');
  offset += 4;

  // fmt sub-chunk
  writeString(view, offset, 'fmt ');
  offset += 4;
  view.setUint32(offset, 16, true); // Subchunk1Size (16 for PCM)
  offset += 4;
  view.setUint16(offset, 1, true); // AudioFormat (1 = PCM)
  offset += 2;
  view.setUint16(offset, numberOfChannels, true); // Mono (1)
  offset += 2;
  view.setUint32(offset, targetSampleRate, true); // SampleRate (16000)
  offset += 4;
  view.setUint32(offset, targetSampleRate * numberOfChannels * 2, true); // ByteRate
  offset += 4;
  view.setUint16(offset, numberOfChannels * 2, true); // BlockAlign
  offset += 2;
  view.setUint16(offset, 16, true); // BitsPerSample (16)
  offset += 2;

  // data sub-chunk
  writeString(view, offset, 'data');
  offset += 4;
  view.setUint32(offset, dataByteLength, true);
  offset += 4;

  // Write PCM samples (16-bit signed integer)
  const channelData = renderedBuffer.getChannelData(0);
  for (let i = 0; i < renderedBuffer.length; i++) {
    const sample = channelData[i] ?? 0;
    const clamped = Math.max(-1, Math.min(1, sample));
    const intSample = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([view], { type: 'audio/wav' });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const parts = reader.result.split(',');
        resolve(parts[1] || '');
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

