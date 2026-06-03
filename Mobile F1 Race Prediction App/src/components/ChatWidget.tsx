import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  MessageSquare, 
  X, 
  Bot, 
  Trash2, 
  RefreshCw,
  Zap
} from 'lucide-react';
// @ts-ignore
import { useTheme } from './../components/ThemeContext.tsx'; 

// 🟢 CONFIG
const API_BASE = 'https://isreal-falconiform-seasonedly.ngrok-free.dev';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const QUICK_ACTIONS = [
  "Update News",
  "Who is winning?",
  "Ferrari News",
  "Lando Norris Stats"
];

// Consistent spacing
const SPACING = {
  SECTION_MARGIN: 'mb-8', 
  SECTION_PADDING: 'px-3', 
  CARD_PADDING: 'p-3', 
  CARD_GAP: 'p-3', 
  BORDER_WIDTH: 'border-8', 
  BORDER_RADIUS: 'rounded-2xl', 
  CONTENT_GAP: 'space-y-6', 
  HEADER_MARGIN: 'mb-3', 
  COMPONENT_GAP: 'gap-3', 
  MESSAGE_GAP: 'gap-2', 
} as const;

// 🟢 FIX: Robust Message Renderer that handles Lists & Newlines correctly
const renderMessageWithLinks = (text: string, isDark: boolean) => {
  // 1. Split text by newlines to force vertical stacking
  const lines = text.split('\n');

  return lines.map((line, lineIndex) => {
    // If line is empty (double newline), render a spacer
    if (!line.trim()) {
      return <div key={lineIndex} className="h-2" />; 
    }

    // 2. Find URLs within the line
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = line.split(urlRegex);

    return (
      <div key={lineIndex} className="leading-relaxed break-words">
        {parts.map((part, partIndex) => {
          if (part.match(urlRegex)) {
            return (
              <a 
                key={partIndex} 
                href={part} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`font-bold underline ml-1 inline-flex items-center transition-colors ${
                  isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'
                }`}
              >
                Read Article &rarr;
              </a>
            );
          }
          return <span key={partIndex}>{part}</span>;
        })}
      </div>
    );
  });
};

export function ChatWidget() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      text: "🏎️ Hi! I'm your F1 Insider. I can fetch the latest news or predict race results.", 
      sender: 'bot', 
      timestamp: new Date()
    }
  ]);
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    handleResize(); 
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getChatDimensions = () => {
    const isMobile = windowWidth < 500;
    const isTablet = windowWidth >= 768 && windowWidth < 1024;
    
    if (isMobile) {
      const isLandscape = windowWidth > window.innerHeight;
      return {
        width: 'calc(100vw - 24px)', 
        height: isLandscape ? '80vh' : '75vh',
        maxHeight: isLandscape ? '90vh' : '85vh',
        maxWidth: '100%',
        position: 'bottom-6 inset-x-3'
      };
    } else if (isTablet) {
      return {
        width: 'min(500px, calc(100vw - 48px))',
        height: '70vh',
        maxHeight: '700px',
        maxWidth: '500px',
        position: 'bottom-24 right-6'
      };
    } else {
      return {
        width: 'min(400px, calc(100vw - 48px))',
        height: '65vh',
        maxHeight: '600px',
        maxWidth: '400px',
        position: 'bottom-24 right-6'
      };
    }
  };

  const getBorderColor = (section: 'chat' | 'message' | 'input') => {
    if (isDark) {
      switch(section) {
        case 'chat': return 'border-neutral-800';
        case 'message': return 'border-neutral-700';
        case 'input': return 'border-neutral-700';
        default: return 'border-neutral-800';
      }
    } else {
      switch(section) {
        case 'chat': return 'border-red-200';
        case 'message': return 'border-red-100';
        case 'input': return 'border-slate-200';
        default: return 'border-slate-200';
      }
    }
  };

  const getChatBg = () => {
    if (isDark) {
      return { background: 'linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%)', color: '#ffffff' };
    } else {
      return { background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', color: '#1e293b' };
    }
  };

  const getMessageStyle = (sender: 'user' | 'bot') => {
    if (isDark) {
      return sender === 'user' ? 'bg-red-600 text-white border-red-700' : 'bg-neutral-800 text-neutral-200 border-neutral-700';
    } else {
      return sender === 'user' ? 'bg-red-600 text-white border-red-500' : 'bg-slate-100 text-slate-900 border-slate-200';
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => scrollToBottom(), [messages, isOpen, loading]);

  const handleSend = async (textOverride?: string) => {
    const textToSend = textOverride || input;
    if (!textToSend.trim()) return;

    const userMsg: Message = { 
      id: Date.now(), 
      text: textToSend, 
      sender: 'user', 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' 
        },
        body: JSON.stringify({ message: userMsg.text })
      });
      
      const data = await res.json();
      
      const botReply = data.reply.toLowerCase();
      const userRequest = textToSend.toLowerCase();
      
      if (
          userRequest.includes("update news") || 
          botReply.includes("found") || 
          botReply.includes("updated") ||
          botReply.includes("articles")
      ) {
        console.log("📣 ChatWidget: Triggering Global News Refresh!");
        window.dispatchEvent(new Event('newsUpdated'));
        setTimeout(() => window.dispatchEvent(new Event('newsUpdated')), 1000);
      }
      
      const botMsg: Message = { 
        id: Date.now() + 1, 
        text: data.reply, 
        sender: 'bot', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, botMsg]);
      
    } catch (e) {
      const errorMsg: Message = { 
        id: Date.now() + 1, 
        text: "⚠️ Connection Error. Ensure app.py is running.", 
        sender: 'bot', 
        timestamp: new Date() 
      };
      setMessages(prev => [...prev, errorMsg]);
    }
    setLoading(false);
  };

  const clearChat = () => {
    setMessages([{ 
      id: Date.now(), 
      text: "Chat cleared. What else can I help you with?", 
      sender: 'bot', 
      timestamp: new Date() 
    }]);
  };

  const chatBgStyle = getChatBg();
  const chatDimensions = getChatDimensions();
  
  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={() => setIsOpen(false)}
          style={{ zIndex: 99998 }}
        />
      )}
      
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          style={{ 
            position: 'fixed', 
            bottom: windowWidth < 768 ? '80px' : '100px',
            right: windowWidth < 768 ? '16px' : '20px',
            zIndex: 99999 
          }}
          className={`${windowWidth < 768 ? 'w-14 h-14' : 'w-16 h-16'} bg-red-600 hover:bg-red-700 text-white rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95`}
        >
          <MessageSquare className={`${windowWidth < 768 ? 'w-7 h-7' : 'w-8 h-8'} fill-current`} />
          <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-neutral-900 rounded-full"></span>
        </button>
      ) : (
        <div 
          className={`fixed z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 ${chatDimensions.position}`}
          style={{ 
            zIndex: 99999,
            width: chatDimensions.width,
            height: chatDimensions.height,
            maxHeight: chatDimensions.maxHeight,
            maxWidth: chatDimensions.maxWidth
          }}
        >
          <div className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${getBorderColor('chat')} h-full overflow-hidden`}>
            <div className={SPACING.CARD_GAP + ' h-full'}>
              <div 
                className={`${SPACING.BORDER_RADIUS} h-full flex flex-col overflow-hidden`}
                style={chatBgStyle}
              >
                {/* Header */}
                <div className={`p-4 border-b shrink-0 ${isDark ? 'bg-neutral-900 border-neutral-800' : 'bg-white/50 border-slate-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`${windowWidth < 768 ? 'w-8 h-8' : 'w-10 h-10'} rounded-full flex items-center justify-center shadow-lg ${isDark ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-red-500 to-red-700'}`}>
                        <Bot className={`${windowWidth < 768 ? 'w-5 h-5' : 'w-6 h-6'} text-white`} />
                      </div>
                      <div>
                        <h3 className={`font-bold ${windowWidth < 768 ? 'text-xs' : 'text-sm'} flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          F1 Insider
                          <span className={`w-2 h-2 rounded-full animate-pulse ${isDark ? 'bg-green-500' : 'bg-green-600'}`}></span>
                        </h3>
                        <span className={`${windowWidth < 768 ? 'text-[9px]' : 'text-[10px]'} font-medium tracking-wide ${isDark ? 'text-neutral-400' : 'text-slate-600'}`}>POWERED BY AI & RSS</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={clearChat} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setIsOpen(false)} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-white/10 text-neutral-400 hover:text-white' : 'hover:bg-slate-100 text-slate-500 hover:text-slate-900'}`}>
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages List */}
                <div className={`flex-1 overflow-y-auto p-4 ${SPACING.CONTENT_GAP} scrollbar-thin ${isDark ? 'scrollbar-thumb-neutral-800 scrollbar-track-transparent' : 'scrollbar-thumb-slate-300 scrollbar-track-transparent'}`}>
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${getBorderColor('message')} max-w-[90%] ${windowWidth < 768 ? 'max-w-[95%]' : ''}`}>
                        <div className={SPACING.CARD_GAP}>
                          <div className={`${SPACING.BORDER_RADIUS} ${SPACING.CARD_PADDING} ${windowWidth < 768 ? 'text-xs' : 'text-sm'} shadow-md border ${msg.sender === 'user' ? 'rounded-br-sm' : 'rounded-bl-sm'} ${getMessageStyle(msg.sender)}`}>
                            {/* 🟢 RENDERER CALLED HERE */}
                            {renderMessageWithLinks(msg.text, isDark)}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] mt-1 px-1 ${isDark ? 'text-neutral-500' : 'text-slate-500'}`}>
                        {msg.sender === 'user' ? 'You' : 'AI'} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  {loading && (
                    <div className="flex justify-start">
                      <div className={`relative ${SPACING.BORDER_RADIUS} ${SPACING.BORDER_WIDTH} ${getBorderColor('message')}`}>
                        <div className={SPACING.CARD_GAP}>
                          <div className={`${SPACING.BORDER_RADIUS} ${SPACING.CARD_PADDING} border ${isDark ? 'bg-neutral-800 border-neutral-700' : 'bg-slate-100 border-slate-200'} flex ${SPACING.MESSAGE_GAP} items-center w-fit`}>
                            <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.3s] ${isDark ? 'bg-neutral-500' : 'bg-slate-400'}`}></span>
                            <span className={`w-2 h-2 rounded-full animate-bounce [animation-delay:-0.15s] ${isDark ? 'bg-neutral-500' : 'bg-slate-400'}`}></span>
                            <span className={`w-2 h-2 rounded-full animate-bounce ${isDark ? 'bg-neutral-500' : 'bg-slate-400'}`}></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Actions */}
                {!loading && (
                  <div className={`px-4 pb-2 flex ${SPACING.COMPONENT_GAP} overflow-x-auto scrollbar-hide shrink-0 ${isDark ? 'bg-neutral-950/50' : 'bg-white/50'}`}>
                    {QUICK_ACTIONS.map((action, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSend(action)}
                        className={`flex-shrink-0 ${windowWidth < 768 ? 'text-[10px] px-2 py-1' : 'text-xs px-3 py-1.5'} rounded-full transition-all whitespace-nowrap active:scale-95 flex items-center ${SPACING.MESSAGE_GAP} ${isDark ? 'bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300' : 'bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700'}`}
                      >
                        {action.includes("Update") ? <RefreshCw className={`${windowWidth < 768 ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${isDark ? 'text-neutral-400' : 'text-slate-500'}`} /> : <Zap className={`${windowWidth < 768 ? 'w-2.5 h-2.5' : 'w-3 h-3'} ${isDark ? 'text-yellow-500' : 'text-yellow-600'}`} />}
                        {windowWidth < 768 ? (action === "Update News" ? "Update News" : action === "Who is winning?" ? " Who is winning?" : action === "Ferrari News" ? " Ferrari N" : "Norris News") : action}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input Area */}
                <div className={`px-4 py-2 border-t shrink-0 ${isDark ? 'bg-neutral-900/80 border-neutral-800' : 'bg-white/80 border-slate-200'}`}>
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex-1 relative">
                      <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask about drivers..."
                        className={`w-full rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-0 focus:ring-offset-1 transition-all placeholder:${isDark ? 'text-neutral-400' : 'text-slate-500'} ${isDark ? 'bg-neutral-800/90 border border-neutral-700 text-white focus:border-red-500 focus:ring-red-500/40' : 'bg-white border border-slate-300 text-slate-900 focus:border-red-500 focus:ring-red-500/40'}`}
                        onKeyDown={e => e.key === 'Enter' && handleSend()}
                        disabled={loading} 
                      />
                    </div>
                    <button 
                      onClick={() => handleSend()}
                      disabled={loading || !input.trim()}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] ${isDark ? 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white' : 'bg-gradient-to-br from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white'} disabled:opacity-50 disabled:hover:from-red-600 disabled:hover:to-red-700 disabled:hover:scale-100 disabled:shadow-md flex-shrink-0`}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}