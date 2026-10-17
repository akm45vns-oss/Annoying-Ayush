import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  X, 
  Trash2, 
  Sparkles, 
  RotateCcw, 
  AlertCircle,
  Bot,
  Heart
} from 'lucide-react';
import { soundManager } from '../utils/audioEffects';
import { generateOfflineFallback, detectCharacterReaction } from '../utils/aiPersonality';
import { loadChatHistory, saveChatHistory, clearChatHistory } from '../utils/chatStorage';

export default function ChatPanel({
  isOpen,
  onClose,
  gfName = 'Babe',
  ayushName = 'Ayush',
  onAyushReply = () => {}
}) {
  const [messages, setMessages] = useState(() => {
    const saved = loadChatHistory();
    if (saved && saved.length > 0) return saved;
    // Friendly initial welcome message
    return [
      {
        id: 'welcome-1',
        sender: 'ayush',
        text: `Hey ${gfName}! ❤️ Type anything to me—ask me what I'm doing, tease me, or send me some love!`,
        timestamp: Date.now(),
        isOfflineFallback: true
      }
    ];
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [apiStatus, setApiStatus] = useState('checking'); // 'live' | 'offline' | 'checking'
  const [activeProvider, setActiveProvider] = useState('');
  const [lastFailedMessage, setLastFailedMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const isSubmittingRef = useRef(false);

  // Auto-scroll to bottom of message list on new messages or typing state change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages, isTyping]);

  // Persist messages whenever updated
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // Probe API readiness on mount so status badge transitions from 'checking' to actual live/offline status
  useEffect(() => {
    let isMounted = true;
    fetch('/api/chat', { method: 'GET', signal: AbortSignal.timeout(4000) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        if (data && data.configured) {
          setApiStatus('live');
          if (data.provider) setActiveProvider(data.provider);
        } else {
          setApiStatus('offline');
          setActiveProvider('offline');
        }
      })
      .catch(() => {
        if (isMounted) {
          setApiStatus('offline');
          setActiveProvider('offline');
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Quick emoji buttons for fast sweet messages
  const quickEmojis = ['❤️', '😘', '🥺', '😂', '🧸', '🌸'];

  const handleAddEmoji = (emoji) => {
    soundManager.playPop();
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const handleClearChat = () => {
    soundManager.playPop();
    if (window.confirm(`Clear your chat history with ${ayushName}?`)) {
      clearChatHistory();
      const freshWelcome = [
        {
          id: 'welcome-reset',
          sender: 'ayush',
          text: `All fresh! What's on your mind today, ${gfName}? 🥰`,
          timestamp: Date.now(),
          isOfflineFallback: true
        }
      ];
      setMessages(freshWelcome);
      setErrorMessage('');
      setLastFailedMessage(null);
    }
  };

  const handleSend = async (textToSend = inputText) => {
    const text = textToSend.trim();
    if (!text || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    soundManager.playPop();
    setErrorMessage('');
    setLastFailedMessage(null);

    const userMsgId = 'msg-' + Date.now();
    const newUserMsg = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: Date.now()
    };

    // Build bounded conversation history from the PREVIOUS messages (before the new user msg),
    // so the current user turn is not duplicated in both history[] and the message field.
    const historyPayload = messages.slice(-6).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    const nextMessages = [...messages, newUserMsg];
    setMessages(nextMessages);
    setInputText('');
    setIsTyping(true);

    try {
      // Call server-side endpoint (/api/chat)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
          gfName,
          ayushName
        }),
        signal: AbortSignal.timeout(13000)
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data && data.ok) {
        // Successful response (either from Live AI or server fallback)
        const isOffline = !!data.isOfflineFallback;
        setApiStatus(isOffline ? 'offline' : 'live');
        if (data.provider) setActiveProvider(data.provider);

        const replyText = data.reply;
        const reaction = data.reaction || detectCharacterReaction(replyText);

        const aiMsg = {
          id: 'reply-' + Date.now(),
          sender: 'ayush',
          text: replyText,
          timestamp: Date.now(),
          isOfflineFallback: isOffline,
          provider: data.provider || (isOffline ? 'offline' : 'ai')
        };

        setMessages((prev) => [...prev, aiMsg]);
        soundManager.playChime();
        onAyushReply(replyText, reaction);
      } else if (data && data.configured === false) {
        // AI API key not configured on server: Seamless Smart Offline Fallback
        setApiStatus('offline');
        setActiveProvider('offline');
        const fallback = generateOfflineFallback(text, gfName, ayushName);

        const fallbackMsg = {
          id: 'reply-' + Date.now(),
          sender: 'ayush',
          text: fallback.reply,
          timestamp: Date.now(),
          isOfflineFallback: true
        };

        setMessages((prev) => [...prev, fallbackMsg]);
        soundManager.playChime();
        onAyushReply(fallback.reply, fallback.reaction);
      } else {
        // Fallback gracefully without leaving user in error
        const fallback = generateOfflineFallback(text, gfName, ayushName);
        const fallbackMsg = {
          id: 'reply-' + Date.now(),
          sender: 'ayush',
          text: fallback.reply,
          timestamp: Date.now(),
          isOfflineFallback: true
        };
        setMessages((prev) => [...prev, fallbackMsg]);
        setApiStatus('offline');
        setActiveProvider('offline');
        soundManager.playChime();
        onAyushReply(fallback.reply, fallback.reaction);
      }
    } catch (err) {
      console.warn('Chat request error, using fallback or allowing retry:', err.message);
      setLastFailedMessage(text);
      setErrorMessage(
        'Could not reach AI server. You can retry, or tap below for an offline answer.'
      );
      soundManager.playBoing();
    } finally {
      setIsTyping(false);
      isSubmittingRef.current = false;
    }
  };

  const handleUseOfflineFallback = () => {
    if (!lastFailedMessage) return;
    const fallback = generateOfflineFallback(lastFailedMessage, gfName, ayushName);
    const fallbackMsg = {
      id: 'reply-' + Date.now(),
      sender: 'ayush',
      text: fallback.reply,
      timestamp: Date.now(),
      isOfflineFallback: true
    };
    setMessages((prev) => [...prev, fallbackMsg]);
    setLastFailedMessage(null);
    setErrorMessage('');
    soundManager.playChime();
    onAyushReply(fallback.reply, fallback.reaction);
  };

  const handleRetry = () => {
    if (!lastFailedMessage) return;
    // The user bubble is already in the messages list from the first send attempt.
    // We must NOT call handleSend() here — that would push a second identical user bubble.
    // Instead, directly re-issue the API call with the current messages state.
    const text = lastFailedMessage;
    setLastFailedMessage(null);
    setErrorMessage('');
    setIsTyping(true);

    const historyPayload = messages.slice(-7, -1).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text
    }));

    isSubmittingRef.current = true;

    fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, history: historyPayload, gfName, ayushName }),
      signal: AbortSignal.timeout(13000)
    })
      .then((res) => res.json().catch(() => null).then((data) => ({ res, data })))
      .then(({ res, data }) => {
        if (res.ok && data && data.ok) {
          const isOffline = !!data.isOfflineFallback;
          setApiStatus(isOffline ? 'offline' : 'live');
          if (data.provider) setActiveProvider(data.provider);
          const replyText = data.reply;
          const reaction = data.reaction || detectCharacterReaction(replyText);
          setMessages((prev) => [
            ...prev,
            { id: 'reply-' + Date.now(), sender: 'ayush', text: replyText, timestamp: Date.now(), isOfflineFallback: isOffline, provider: data.provider || (isOffline ? 'offline' : 'ai') }
          ]);
          soundManager.playChime();
          onAyushReply(replyText, reaction);
        } else {
          const fallback = generateOfflineFallback(text, gfName, ayushName);
          setMessages((prev) => [
            ...prev,
            { id: 'reply-' + Date.now(), sender: 'ayush', text: fallback.reply, timestamp: Date.now(), isOfflineFallback: true }
          ]);
          setApiStatus('offline');
          setActiveProvider('offline');
          soundManager.playChime();
          onAyushReply(fallback.reply, fallback.reaction);
        }
      })
      .catch((err) => {
        console.warn('Retry failed:', err.message);
        setLastFailedMessage(text);
        setErrorMessage('Still could not reach AI server. Tap "Use Offline Answer" to continue.');
        soundManager.playBoing();
      })
      .finally(() => {
        setIsTyping(false);
        isSubmittingRef.current = false;
      });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="chat-panel-container"
      role="region"
      aria-label={`Chat with ${ayushName}`}
    >
      {/* Top Drag Handle / Header */}
      <div className="chat-header">
        <div className="chat-header-identity">
          <div className="chat-avatar-wrapper">
            <Bot size={18} className="chat-avatar-icon" />
            <span className={`status-dot ${apiStatus === 'live' ? 'online' : 'offline'}`} />
          </div>
          <div>
            <h3 className="chat-title">Chat with {ayushName}</h3>
            <div className="chat-status-indicator">
              {apiStatus === 'live' ? (
                <span className="status-badge live-badge">
                  ⚡ Live AI {activeProvider ? `(${activeProvider.toUpperCase()})` : ''}
                </span>
              ) : apiStatus === 'checking' ? (
                <span className="status-badge checking-badge" title="Testing AI connection...">
                  ⏳ Connecting...
                </span>
              ) : (
                <span className="status-badge offline-badge" title="Pre-programmed failover mode active.">
                  📱 Pre-programmed Mode
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="chat-header-actions">
          <button
            type="button"
            className="chat-icon-btn"
            onClick={handleClearChat}
            title="Clear conversation history"
            aria-label="Clear conversation history"
          >
            <Trash2 size={16} />
          </button>

          <button
            type="button"
            className="chat-icon-btn chat-close-btn"
            onClick={() => {
              soundManager.playPop();
              onClose();
            }}
            title="Close chat"
            aria-label="Close chat"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages-stream">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div 
              key={m.id} 
              className={`chat-bubble-row ${isUser ? 'user-row' : 'ayush-row'}`}
            >
              {!isUser && (
                <div className="bubble-avatar">
                  <Heart size={12} className="bubble-avatar-heart" />
                </div>
              )}
              <div className={`chat-bubble ${isUser ? 'user-bubble' : 'ayush-bubble'}`}>
                <p className="bubble-text">{m.text}</p>
                <div className="bubble-meta">
                  {m.isOfflineFallback && !isUser && (
                    <span className="offline-tag">Pre-programmed</span>
                  )}
                  <span className="bubble-time">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Animated Typing Indicator */}
        {isTyping && (
          <div className="chat-bubble-row ayush-row">
            <div className="bubble-avatar">
              <Sparkles size={12} className="bubble-avatar-heart" />
            </div>
            <div className="chat-bubble ayush-bubble typing-bubble">
              <span className="typing-dot dot-1" />
              <span className="typing-dot dot-2" />
              <span className="typing-dot dot-3" />
            </div>
          </div>
        )}

        {/* Error / Retry Banner */}
        {errorMessage && (
          <div className="chat-error-card">
            <div className="error-text-row">
              <AlertCircle size={15} className="error-icon" />
              <span>{errorMessage}</span>
            </div>
            <div className="error-actions-row">
              <button
                type="button"
                className="error-action-btn retry-btn"
                onClick={handleRetry}
              >
                <RotateCcw size={12} />
                <span>Retry</span>
              </button>
              <button
                type="button"
                className="error-action-btn fallback-btn"
                onClick={handleUseOfflineFallback}
              >
                <span>Use Offline Answer</span>
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Emoji Bar */}
      <div className="chat-quick-emojis">
        {quickEmojis.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className="quick-emoji-btn"
            onClick={() => handleAddEmoji(emoji)}
            aria-label={`Insert ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* Input Composer Bar */}
      <div className="chat-input-bar">
        <input
          ref={inputRef}
          type="text"
          className="chat-text-input"
          value={inputText}
          maxLength={300}
          placeholder={`Message ${ayushName}...`}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
          aria-label="Type a message"
        />

        <button
          type="button"
          className="chat-send-btn"
          onClick={() => handleSend()}
          disabled={!inputText.trim() || isTyping}
          title="Send message (Enter)"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
