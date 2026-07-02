import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, X, MessageCircle, Image, Paperclip } from 'lucide-react';
import { API_BASE_URL } from '../config';

const ChatWindow = ({ request, sender, receiverId, receiverName, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch messages
  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/messages/chat`, {
        params: {
          request_id: request.id,
          user1_id: sender.id,
          user2_id: receiverId
        }
      });
      setMessages(response.data);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    } finally {
      setLoading(false);
    }
  };

  // Play notification chime using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      gain1.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
      osc1.start(audioCtx.currentTime);
      osc1.stop(audioCtx.currentTime + 0.15);

      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain2.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.25);
      }, 80);
    } catch (e) {
      console.warn("Audio Context blocked or failed:", e);
    }
  };

  const prevMessagesCount = useRef(0);

  // Monitor incoming messages count
  useEffect(() => {
    if (messages.length > prevMessagesCount.current) {
      if (prevMessagesCount.current > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.sender_id !== sender.id) {
          playNotificationSound();
        }
      }
      prevMessagesCount.current = messages.length;
    }
  }, [messages, sender.id]);

  // Scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initial load and polling setup
  useEffect(() => {
    fetchMessages();

    // Poll every 3 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [request.id, sender.id, receiverId]);

  // Scroll on message change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send text message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const messageText = text.trim();
    setText(''); // Clear input instantly

    try {
      await axios.post(`${API_BASE_URL}/messages`, {
        request_id: request.id,
        sender_id: sender.id,
        receiver_id: receiverId,
        message: messageText,
        image_attachment: ''
      });
      
      fetchMessages();
    } catch (err) {
      console.error(err);
      alert('Failed to send message.');
    }
  };

  // Send image attachment
  const handleSendImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result;
        try {
          await axios.post(`${API_BASE_URL}/messages`, {
            request_id: request.id,
            sender_id: sender.id,
            receiver_id: receiverId,
            message: '',
            image_attachment: base64String
          });
          fetchMessages();
        } catch (err) {
          console.error(err);
          alert('Failed to send image.');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-content" style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column', height: '600px' }}>
        
        {/* Chat Header */}
        <div className="modal-header" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'inline-flex', padding: '0.5rem', borderRadius: '50%', background: 'rgba(59,130,246,0.1)', color: 'var(--primary)' }}>
              <MessageCircle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{receiverName}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Regarding: {request.title}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Chat Messages */}
        <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'rgba(10, 14, 23, 0.2)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading chat...</div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No messages yet. Start the conversation by sending a message below!
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === sender.id;
              return (
                <div 
                  key={msg.id} 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column',
                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                    maxWidth: '80%'
                  }}
                >
                  <div 
                    style={{ 
                      padding: msg.image_attachment ? '0.35rem' : '0.75rem 1rem', 
                      borderRadius: isMe ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                      background: isMe ? 'linear-gradient(135deg, var(--primary) 0%, #1d4ed8 100%)' : 'var(--surface-border)',
                      color: 'white',
                      fontSize: '0.925rem',
                      lineHeight: '1.4',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    {msg.message && <div>{msg.message}</div>}
                    {msg.image_attachment && (
                      <img 
                        src={msg.image_attachment} 
                        alt="Shared media" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '220px', 
                          borderRadius: '12px', 
                          display: 'block', 
                          cursor: 'pointer' 
                        }} 
                        onClick={() => {
                          const w = window.open();
                          w.document.write(`<img src="${msg.image_attachment}" style="max-width:100%; max-height:100vh; display:block; margin:auto;" />`);
                        }}
                      />
                    )}
                  </div>
                  <span 
                    style={{ 
                      fontSize: '0.7rem', 
                      color: 'var(--text-muted)', 
                      marginTop: '0.2rem', 
                      alignSelf: isMe ? 'flex-end' : 'flex-start' 
                    }}
                  >
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Chat Input */}
        <div style={{ borderTop: '1px solid var(--surface-border)', background: 'var(--bg-secondary)', padding: '1rem' }}>
          <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            
            {/* Attachment Button */}
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={() => fileInputRef.current.click()}
              style={{ borderRadius: '50%', width: '42px', height: '42px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              <Paperclip size={18} />
            </button>
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleSendImage} 
            />

            <input 
              type="text" 
              className="form-control" 
              placeholder="Type a message..." 
              value={text}
              onChange={(e) => setText(e.target.value)}
              style={{ borderRadius: '9999px', padding: '0.6rem 1.25rem', flex: 1 }}
              required={!fileInputRef.current?.files?.length}
              autoComplete="off"
            />

            <button type="submit" className="btn btn-primary" style={{ borderRadius: '50%', width: '42px', height: '42px', padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Send size={16} />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};

export default ChatWindow;
