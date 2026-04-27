package com.mathi.vetsafe;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.community.speechrecognition.SpeechRecognition;
import com.getcapacitor.community.tts.TextToSpeechPlugin;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(android.os.Bundle savedInstanceState) {
    registerPlugin(SpeechRecognition.class);
    registerPlugin(TextToSpeechPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
