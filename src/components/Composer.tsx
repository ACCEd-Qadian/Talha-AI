import React, { useRef, useEffect, useState } from 'react';
import {
  Send,
  Square,
  Paperclip,
  Mic,
  MicOff,
  Globe,
  X,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Attachment, Theme } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { soundFX } from '../utils/audio';

interface ComposerProps {
  onSendMessage: (content: string, attachment?: Attachment) => void;
  onStopGeneration: () => void;
  isStreaming: boolean;
  enableSearch: boolean;
  onToggleSearch: () => void;
  selectedLanguage: string;
  theme: Theme;
}

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  onStopGeneration,
  isStreaming,
  enableSearch,
  onToggleSearch,
  selectedLanguage,
  theme,
}) => {
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isDark = theme === 'dark';

  const {
    isSupported: isSpeechSupported,
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 140)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if (isStreaming) {
      onStopGeneration();
      return;
    }

    const trimmed = input.trim();
    if (!trimmed && !attachment) return;

    if (isListening) {
      stopListening();
    }

    soundFX.playSend();
    onSendMessage(trimmed, attachment || undefined);
    setInput('');
    setAttachment(null);
    resetTranscript();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    if (file.size > 20 * 1024 * 1024) {
      setUploadError('File exceeds 20MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Index = result.indexOf(';base64,');
      const base64Data = base64Index !== -1 ? result.substring(base64Index + 8) : result;

      setAttachment({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        data: base64Data,
        previewUrl: file.type.startsWith('image/') ? result : '',
      });
      soundFX.playClick();
    };

    reader.onerror = () => {
      setUploadError('Failed to read file.');
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const toggleMic = () => {
    soundFX.playClick();
    if (isListening) {
      stopListening();
    } else {
      let langCode = 'hi-IN';
      if (selectedLanguage === 'English') langCode = 'en-US';
      if (selectedLanguage === 'Urdu') langCode = 'ur-PK';
      if (selectedLanguage === 'Punjabi') langCode = 'pa-IN';
      startListening(langCode);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-3 sm:px-4 pb-2 sm:pb-3 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      {/* Attachment Preview Card */}
      {attachment && (
        <div
          className={`mb-1.5 flex items-center justify-between rounded-xl p-2 text-xs backdrop-blur-md border ${
            isDark
              ? 'border-cyan-500/30 bg-slate-900/90 text-slate-200'
              : 'border-slate-200 bg-white text-slate-800 shadow-xs'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {attachment.previewUrl ? (
              <img
                src={attachment.previewUrl}
                alt={attachment.name}
                className="w-9 h-9 rounded-lg object-cover border border-slate-700/50"
              />
            ) : (
              <div
                className={`p-1.5 rounded-lg border ${
                  isDark
                    ? 'bg-cyan-950/60 text-cyan-400 border-cyan-500/20'
                    : 'bg-cyan-50 text-cyan-700 border-cyan-200'
                }`}
              >
                <FileText className="w-4 h-4" />
              </div>
            )}
            <div className="truncate">
              <span className="font-medium text-[11px] sm:text-xs truncate block">{attachment.name}</span>
              <span className="text-[10px] text-slate-400">
                {(attachment.size / 1024).toFixed(1)} KB
              </span>
            </div>
          </div>
          <button
            onClick={() => setAttachment(null)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="mb-1.5 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-950/60 p-2 text-[11px] text-rose-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto text-rose-400">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Voice Recognition Active Indicator */}
      {isListening && (
        <div
          className={`mb-1.5 flex items-center justify-between rounded-xl p-2 text-xs backdrop-blur-md animate-pulse border ${
            isDark
              ? 'border-cyan-500/40 bg-cyan-950/70 text-cyan-200'
              : 'border-cyan-400 bg-cyan-50 text-cyan-800'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping" />
            <span className="text-[11px] font-medium">Listening ({selectedLanguage})... Speak now.</span>
          </div>
          <button
            onClick={stopListening}
            className="text-[10px] font-semibold text-cyan-600 dark:text-cyan-300 hover:underline px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/60"
          >
            Done
          </button>
        </div>
      )}

      {speechError && (
        <div className="mb-1.5 text-[11px] text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-500/30 rounded-xl p-2">
          {speechError}
        </div>
      )}

      {/* Main Composer Box */}
      <div
        className={`relative rounded-2xl border transition-all ${
          isDark
            ? 'border-slate-800 bg-[#0c1224]/95 shadow-xl backdrop-blur-xl focus-within:border-cyan-500/70'
            : 'border-slate-200/90 bg-white shadow-lg shadow-slate-200/40 focus-within:border-cyan-500'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isListening
              ? 'Listening to voice...'
              : 'Ask TALHA AI anything...'
          }
          rows={1}
          className={`w-full bg-transparent px-3.5 pt-2.5 sm:pt-3 pb-1 text-sm placeholder-slate-400 focus:outline-none resize-none leading-relaxed ${
            isDark ? 'text-slate-100' : 'text-slate-800'
          }`}
        />

        {/* Bottom Toolbar Controls (Touch-Friendly & Spaced on Mobile) */}
        <div
          className={`flex items-center justify-between px-2 sm:px-3 py-1.5 border-t ${
            isDark ? 'border-slate-800/60' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center gap-1">
            {/* File Upload Button */}
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              accept="image/*,application/pdf,text/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                fileInputRef.current?.click();
              }}
              className={`p-2 rounded-xl transition ${
                isDark
                  ? 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
                  : 'text-slate-500 hover:text-cyan-700 hover:bg-slate-100'
              }`}
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Voice Input Button */}
            {isSpeechSupported && (
              <button
                type="button"
                onClick={toggleMic}
                className={`p-2 rounded-xl transition ${
                  isListening
                    ? 'bg-cyan-500 text-white shadow-sm animate-pulse'
                    : isDark
                    ? 'text-slate-400 hover:text-cyan-300 hover:bg-slate-800'
                    : 'text-slate-500 hover:text-cyan-700 hover:bg-slate-100'
                }`}
                title={isListening ? 'Stop mic' : 'Voice input'}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            {/* Web Search Grounding Toggle */}
            <button
              type="button"
              onClick={() => {
                soundFX.playClick();
                onToggleSearch();
              }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] sm:text-xs font-medium transition ${
                enableSearch
                  ? isDark
                    ? 'border border-cyan-500/50 bg-cyan-950/60 text-cyan-300 shadow-2xs'
                    : 'border border-cyan-400 bg-cyan-50 text-cyan-700 font-semibold'
                  : isDark
                  ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
              }`}
              title="Toggle Web Search"
            >
              <Globe className={`w-3.5 h-3.5 ${enableSearch ? 'text-cyan-500' : 'text-slate-400'}`} />
              <span className="hidden xs:inline">Search</span>
              {enableSearch && (
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              )}
            </button>
          </div>

          {/* Send / Stop Button */}
          <div className="flex items-center gap-1.5">
            {isStreaming ? (
              <button
                type="button"
                onClick={() => {
                  soundFX.playClick();
                  onStopGeneration();
                }}
                className={`flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-rose-900/40 hover:text-rose-300'
                    : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                }`}
              >
                <Square className="w-3 h-3 fill-current" />
                <span className="text-[11px]">Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!input.trim() && !attachment}
                className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 text-white shadow-sm hover:from-cyan-400 hover:to-indigo-500 transition disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                title="Send"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-0.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div
        className={`mt-1.5 text-center text-[10px] sm:text-[11px] truncate px-2 ${
          isDark ? 'text-slate-500' : 'text-slate-400'
        }`}
      >
        TALHA AI • Created by MOHAMMED TALHA
      </div>
    </div>
  );
};
