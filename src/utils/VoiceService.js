import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

class VoiceService {
  constructor() {
    this.isListening = false;
    this.isSpeaking = false;
  }

  // ── Text to Speech ──────────────────────────────────────────
  async speak(text, options = {}) {
    try {
      if (this.isSpeaking) await this.stopSpeaking();
      this.isSpeaking = true;
      if (Capacitor.isNativePlatform()) {
        await TextToSpeech.speak({
          text,
          lang: options.lang || 'en-US',
          rate: options.rate || 1.0,
          pitch: options.pitch || 1.0,
          volume: options.volume || 1.0,
          category: 'ambient',
        });
      } else {
        await this.webSpeak(text, options);
      }
    } catch (error) {
      console.error('TTS error:', error);
      throw error;
    } finally {
      this.isSpeaking = false;
    }
  }

  async stopSpeaking() {
    try {
      if (Capacitor.isNativePlatform()) {
        await TextToSpeech.stop();
      } else {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
      }
    } catch (e) {
      console.error('stopSpeaking error:', e);
    } finally {
      this.isSpeaking = false;
    }
  }

  webSpeak(text, options) {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window)) { resolve(); return; }

      // Cancel any ongoing speech first
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = options.lang || 'en-US';
      utterance.rate = options.rate || 0.9;
      utterance.pitch = options.pitch || 1.0;
      utterance.volume = options.volume || 1.0;

      utterance.onend = () => {
        this.isSpeaking = false;
        resolve();
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
        resolve();
      };

      // Chrome bug: speechSynthesis pauses after ~15s, this keeps it alive
      const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(keepAlive);
        } else {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 10000);

      utterance.onend = () => {
        clearInterval(keepAlive);
        this.isSpeaking = false;
        resolve();
      };
      utterance.onerror = () => {
        clearInterval(keepAlive);
        this.isSpeaking = false;
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  // ── Speech to Text ──────────────────────────────────────────
  async startListening(language = 'ta-IN') {
    if (this.isListening) {
      await this.stopListening();
    }

    if (Capacitor.isNativePlatform()) {
      // Request permission
      const perm = await SpeechRecognition.requestPermissions();
      if (perm.speechRecognition !== 'granted') {
        throw new Error('Microphone permission denied');
      }

      // Check availability
      const { available } = await SpeechRecognition.available();
      if (!available) throw new Error('Speech recognition not available');

      return new Promise(async (resolve, reject) => {
        this.isListening = true;

        // Clean up any previous listeners
        await SpeechRecognition.removeAllListeners();

        // Listen for results
        SpeechRecognition.addListener('partialResults', (data) => {
          if (data.matches && data.matches.length > 0) {
            SpeechRecognition.stop();
            SpeechRecognition.removeAllListeners();
            this.isListening = false;
            resolve(data.matches[0]);
          }
        });

        // Also listen for final results (some devices fire this instead)
        SpeechRecognition.addListener('listeningState', (state) => {
          if (state.status === 'stopped') {
            SpeechRecognition.removeAllListeners();
            this.isListening = false;
            resolve(null);
          }
        });

        try {
          await SpeechRecognition.start({
            language,
            maxResults: 5,
            partialResults: true,
            popup: false,
          });
        } catch (e) {
          await SpeechRecognition.removeAllListeners();
          this.isListening = false;
          reject(e);
        }
      });

    } else {
      // Web browser fallback
      return this.webListen(language);
    }
  }

  async stopListening() {
    try {
      if (Capacitor.isNativePlatform()) {
        await SpeechRecognition.stop();
        await SpeechRecognition.removeAllListeners();
      }
    } catch (e) {
      console.error('stopListening error:', e);
    } finally {
      this.isListening = false;
    }
  }

  webListen(language) {
    return new Promise((resolve, reject) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { reject(new Error('Speech recognition not supported in browser')); return; }

      this.isListening = true;
      const rec = new SR();
      rec.lang = language;
      rec.continuous = false;
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      let result = null;

      rec.onresult = (e) => {
        result = e.results[0][0].transcript;
      };
      rec.onerror = (e) => {
        this.isListening = false;
        if (e.error === 'no-speech') resolve(null);
        else reject(new Error(e.error));
      };
      rec.onend = () => {
        this.isListening = false;
        resolve(result);
      };
      rec.start();
    });
  }

  async isAvailable() {
    try {
      if (Capacitor.isNativePlatform()) {
        const { available } = await SpeechRecognition.available();
        return available;
      }
      return ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
    } catch { return false; }
  }

  getStatus() {
    return { isListening: this.isListening, isSpeaking: this.isSpeaking };
  }
}

export default new VoiceService();
