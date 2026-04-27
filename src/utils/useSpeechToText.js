import { useState, useCallback } from 'react'
import VoiceService from './VoiceService'

export function useSpeechToText(lang = 'ta-IN') {
  const [isListening, setIsListening] = useState(false)

  const startListening = useCallback(async (onResult) => {
    try {
      setIsListening(true)
      // ✅ Pass lang string directly, not an options object
      const result = await VoiceService.startListening(lang)
      if (result) {
        onResult(result)
      }
    } catch (error) {
      console.error('startListening error:', error)
    } finally {
      setIsListening(false)
    }
  }, [lang])

  const stopListening = useCallback(async () => {
    await VoiceService.stopListening()
    setIsListening(false)
  }, [])

  const toggle = useCallback((onResult) => {
    if (isListening) stopListening()
    else startListening(onResult)
  }, [isListening, startListening, stopListening])

  return { isListening, toggle, startListening, stopListening }
}