'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// Web Speech API interface declarations for TypeScript compatibility fallback
interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives?: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onend: ((this: IWindowSpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: IWindowSpeechRecognition, ev: { error: string; message?: string }) => void) | null;
  onresult: ((this: IWindowSpeechRecognition, ev: ISpeechRecognitionEvent) => void) | null;
  onaudiostart?: (() => void) | null;
  onaudioend?: (() => void) | null;
  onsoundstart?: (() => void) | null;
  onsoundend?: (() => void) | null;
  onspeechstart?: (() => void) | null;
  onspeechend?: (() => void) | null;
  onnomatch?: (() => void) | null;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    item(index: number): {
      isFinal: boolean;
      length: number;
      item(index: number): { transcript: string; confidence: number };
      [index: number]: { transcript: string; confidence: number };
    };
    [index: number]: {
      isFinal: boolean;
      length: number;
      item(index: number): { transcript: string; confidence: number };
      [index: number]: { transcript: string; confidence: number };
    };
  };
}

type SpeechRecognitionConstructor = new () => IWindowSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

export interface UseWebSpeechOptions {
  lang?: string;
  onTranscriptChange?: (text: string, isFinal: boolean) => void;
  onAutoSubmit?: (finalText: string) => void;
}

export function useWebSpeech(options: UseWebSpeechOptions = {}) {
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');
  const [activeService, setActiveService] = useState<'assemblyai' | 'web-speech' | null>(null);

  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [synthesisSupported, setSynthesisSupported] = useState(false);

  // AssemblyAI references
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Web Speech fallback reference
  const recognitionRef = useRef<IWindowSpeechRecognition | null>(null);
  const isManuallyStoppedRef = useRef(false);

  // Check browser capabilities on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasRecognition = Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
      const hasSynthesis = typeof window.speechSynthesis !== 'undefined';
      const hasAudioContext = typeof window.AudioContext !== 'undefined' || typeof (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext !== 'undefined';
      const hasWebSocket = typeof window.WebSocket !== 'undefined';

      console.log('[VoiceInput] Engine capabilities:', {
        assemblyAIStreamingSupported: hasAudioContext && hasWebSocket,
        webSpeechSupported: hasRecognition,
        speechSynthesisSupported: hasSynthesis,
      });

      setRecognitionSupported(hasRecognition || hasAudioContext);
      setSynthesisSupported(hasSynthesis);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (wsRef.current) {
        try {
          wsRef.current.close();
        } catch {
          // ignore
        }
      }
      if (scriptProcessorRef.current) {
        try {
          scriptProcessorRef.current.disconnect();
        } catch {
          // ignore
        }
      }
      if (audioContextRef.current) {
        try {
          void audioContextRef.current.close();
        } catch {
          // ignore
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Fallback to browser Web Speech API
  const startWebSpeechFallback = useCallback(() => {
    if (typeof window === 'undefined') return;
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      console.warn('[WebSpeech] Browser does not support Web Speech API');
      return;
    }

    try {
      console.log('[WebSpeech] Starting Web Speech API fallback...');
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      const activeLang =
        optionsRef.current.lang ||
        (typeof navigator !== 'undefined' ? navigator.language : 'en-US') ||
        'en-US';
      recognition.lang = activeLang;

      recognition.onstart = () => {
        console.log('[WebSpeech] Web Speech API listening');
        setActiveService('web-speech');
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = 0; i < event.results.length; ++i) {
          const item = event.results[i];
          if (!item || !item[0]) continue;
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const combined = (finalTranscript + (interimTranscript ? ' ' + interimTranscript : '')).trim();
        console.log('[WebSpeech] onresult:', { combined, finalTranscript, interimTranscript });

        if (combined) {
          setTranscript(combined);
          optionsRef.current.onTranscriptChange?.(combined, Boolean(finalTranscript));
          if (finalTranscript && optionsRef.current.onAutoSubmit) {
            optionsRef.current.onAutoSubmit(finalTranscript.trim());
          }
        }
      };

      recognition.onerror = (event) => {
        console.warn('[WebSpeech] onerror:', event.error, event.message || '');
        if (event.error === 'not-allowed') {
          setError('Microphone permission was denied. Please allow microphone access.');
          setTimeout(() => setError(null), 5000);
        } else if (event.error === 'network') {
          setError('Voice connection error. Please check your internet connection.');
          setTimeout(() => setError(null), 5000);
        }
      };

      recognition.onend = () => {
        console.log('[WebSpeech] onend: Recognition finished');
        if (activeService === 'web-speech') {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('[WebSpeech] Failed to start Web Speech fallback:', err);
    }
  }, [activeService]);

  const stopListening = useCallback(() => {
    console.log('[VoiceInput] stopListening called');
    isManuallyStoppedRef.current = true;

    // 1. Terminate AssemblyAI streaming WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        console.log('[AssemblyAI] Sending Terminate message to finalize transcript...');
        wsRef.current.send(JSON.stringify({ type: 'Terminate' }));
        setTimeout(() => {
          if (wsRef.current) {
            try {
              wsRef.current.close(1000, 'Session Completed');
            } catch {
              // ignore
            }
            wsRef.current = null;
          }
        }, 500);
      } catch (err) {
        console.warn('[AssemblyAI] Error sending terminate:', err);
      }
    }

    // 2. Disconnect and stop audio processor
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch {
        // ignore
      }
      scriptProcessorRef.current = null;
    }

    if (audioContextRef.current) {
      try {
        void audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }

    // 3. Stop microphone media tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // 4. Stop Web Speech recognition if active
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    setIsListening(false);
    setIsTranscribing(false);
  }, []);

  const startListening = useCallback(async () => {
    if (typeof window === 'undefined') return;
    console.log('[VoiceInput] startListening called');

    isManuallyStoppedRef.current = false;
    setError(null);
    setTranscript('');

    // Cancel any active speech synthesis
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    // Stop existing listeners if active
    stopListening();

    // 1. Fetch temporary token from server route (/api/assemblyai/token)
    let token: string | null = null;
    try {
      console.log('[AssemblyAI] Fetching short-lived streaming token from /api/assemblyai/token...');
      const tokenRes = await fetch('/api/assemblyai/token');
      if (tokenRes.ok) {
        const tokenData = (await tokenRes.json()) as { token: string };
        token = tokenData.token;
        console.log('[AssemblyAI] Token retrieved successfully');
      } else {
        console.warn('[AssemblyAI] Server token route returned error:', tokenRes.status);
      }
    } catch (tokenErr) {
      console.warn('[AssemblyAI] Error fetching token:', tokenErr);
    }

    // If token generation failed, fallback immediately to Web Speech
    if (!token) {
      console.log('[VoiceInput] Token unavailable, falling back to Web Speech API...');
      startWebSpeechFallback();
      return;
    }

    // 2. Acquire microphone stream
    let stream: MediaStream;
    try {
      console.log('[VoiceInput] Requesting microphone access...');
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;
    } catch (micErr) {
      console.error('[VoiceInput] Microphone access error:', micErr);
      setError('Microphone permission denied. Please allow microphone access in your browser.');
      setTimeout(() => setError(null), 5000);
      return;
    }

    // 3. Connect to AssemblyAI Streaming v3 WebSocket
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioCtx();
      audioContextRef.current = audioContext;

      const sampleRate = audioContext.sampleRate || 16000;
      console.log('[AssemblyAI] AudioContext sampleRate:', sampleRate);

      const wsUrl = `wss://streaming.assemblyai.com/v3/ws?token=${encodeURIComponent(token)}&sample_rate=${sampleRate}`;
      console.log('[AssemblyAI] Connecting WebSocket to AssemblyAI Streaming v3...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[AssemblyAI] WebSocket connected! Audio streaming active.');
        setActiveService('assemblyai');
        setIsListening(true);
        setError(null);

        // Setup audio processing pipeline: MediaStreamSource -> ScriptProcessorNode
        const source = audioContext.createMediaStreamSource(stream);
        // 4096 buffer size provides smooth streaming packets without latency
        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        processor.onaudioprocess = (e) => {
          if (ws.readyState === WebSocket.OPEN) {
            const inputData = e.inputBuffer.getChannelData(0);
            // Convert Float32Array (-1.0 to 1.0) into 16-bit signed PCM
            const pcm16 = new Int16Array(inputData.length);
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i] ?? 0));
              pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }
            ws.send(pcm16.buffer);
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as {
            type: string;
            transcript?: string;
            end_of_turn?: boolean;
            id?: string;
          };

          if (data.type === 'Turn') {
            const currentTurn = (data.transcript || '').trim();
            console.log('[AssemblyAI] Turn transcript:', {
              text: currentTurn,
              end_of_turn: data.end_of_turn,
            });

            if (currentTurn) {
              setTranscript(currentTurn);
              optionsRef.current.onTranscriptChange?.(currentTurn, Boolean(data.end_of_turn));
              if (data.end_of_turn && optionsRef.current.onAutoSubmit) {
                optionsRef.current.onAutoSubmit(currentTurn);
              }
            }
          } else if (data.type === 'Begin') {
            console.log('[AssemblyAI] Session started:', data.id);
          } else if (data.type === 'Termination') {
            console.log('[AssemblyAI] Session terminated cleanly');
          }
        } catch (parseErr) {
          console.warn('[AssemblyAI] Message parse error:', parseErr);
        }
      };

      ws.onerror = (wsErr) => {
        console.warn('[AssemblyAI] WebSocket error encountered:', wsErr);
        // If WebSocket fails while listening, fallback to Web Speech
        if (!isManuallyStoppedRef.current) {
          console.log('[VoiceInput] Falling back to Web Speech due to WebSocket issue...');
          startWebSpeechFallback();
        }
      };

      ws.onclose = (closeEvent) => {
        console.log('[AssemblyAI] WebSocket closed with code:', closeEvent.code, closeEvent.reason);
        if (activeService === 'assemblyai') {
          setIsListening(false);
        }
      };
    } catch (wsSetupErr) {
      console.error('[AssemblyAI] Setup error:', wsSetupErr);
      startWebSpeechFallback();
    }
  }, [startWebSpeechFallback, stopListening, activeService]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      void startListening();
    }
  }, [isListening, startListening, stopListening]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      console.log('[VoiceInput] Speech synthesis cancelled');
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  const speak = useCallback((text: string, voiceOptions?: { rate?: number; pitch?: number; lang?: string }) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('[VoiceInput] Speech synthesis not supported');
      setError('Speech synthesis is not supported in this browser.');
      return;
    }

    const cleanText = text.replace(/[*_#`[\]()]/g, '').trim();
    if (!cleanText) return;

    console.log('[VoiceInput] Speaking response text:', cleanText);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = voiceOptions?.lang || 'en-US';
    utterance.rate = voiceOptions?.rate ?? 1.0;
    utterance.pitch = voiceOptions?.pitch ?? 1.0;

    utterance.onstart = () => {
      console.log('[VoiceInput] Speech synthesis playback started');
      setIsSpeaking(true);
    };
    utterance.onend = () => {
      console.log('[VoiceInput] Speech synthesis playback finished');
      setIsSpeaking(false);
    };
    utterance.onerror = (err) => {
      console.warn('[VoiceInput] Speech synthesis error:', err);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  return {
    isListening,
    isTranscribing,
    isSpeaking,
    transcript,
    error,
    activeService,
    recognitionSupported,
    synthesisSupported,
    startListening,
    stopListening,
    toggleListening,
    speak,
    stopSpeaking,
  };
}
