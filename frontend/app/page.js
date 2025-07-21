'use client';

import { useState, useEffect, useRef } from 'react';

export default function Home() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);

  // Fetch chats on mount
  useEffect(() => {
    const fetchChats = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('http://localhost:5000/api/chat');
        const data = await res.json();
        setChats(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch chats:', err);
        setChats([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchChats();
  }, []);

  // Load messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      const loadMessages = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`http://localhost:5000/api/chat/${selectedChat.id}/messages`);
          const data = await res.json();
          setMessages(Array.isArray(data) ? data : []);
        } catch (err) {
          console.error('Failed to load messages:', err);
          setMessages([]);
        } finally {
          setIsLoading(false);
        }
      };
      loadMessages();
    } else {
      setMessages([]);
    }
  }, [selectedChat]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const chat = await res.json();
      setChats([chat, ...chats]);
      setSelectedChat(chat);
      setMessages([]);
    } catch (err) {
      console.error('Failed to create chat:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !selectedChat || isStreaming) return;

    const userMsg = { role: 'user', content: input.trim() };
    setInput('');
    setMessages(prev => [...prev, userMsg]);
    
    setIsStreaming(true);

    try {
      const res = await fetch(`http://localhost:5000/api/chat/${selectedChat.id}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input }),
      });

      if (!res.body) {
        throw new Error('No response body');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let botMessage = '';
      
      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const events = chunk.split('\n\n').filter(Boolean);
        
        for (const event of events) {
          if (event.startsWith('data:')) {
            try {
              const data = JSON.parse(event.replace('data:', ''));
              if (data.token) {
                botMessage += data.token;
                // Update the last message (assistant) with new content
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    content: botMessage
                  };
                  return newMessages;
                });
              }
            } catch (e) {
              console.error('Error parsing event:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '⚠️ Failed to get response. Please try again.' 
      }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    try {
      await fetch(`http://localhost:5000/api/chat/${chatId}`, { method: 'DELETE' });
      setChats(chats.filter(chat => chat.id !== chatId));
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg p-4 flex flex-col">
        <button
          onClick={handleNewChat}
          disabled={isLoading}
          className="bg-blue-600 text-white px-4 py-3 rounded-lg mb-4 w-full hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
        >
          <span>+ New Chat</span>
          {isLoading && (
            <svg className="animate-spin ml-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
        </button>
        
        <div className="text-sm text-gray-500 mb-2 px-2">Recent Chats</div>
        
        <div className="flex-1 overflow-y-auto space-y-1">
          {chats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setSelectedChat(chat)}
              className={`flex justify-between items-center p-3 rounded-lg cursor-pointer transition ${
                selectedChat?.id === chat.id 
                  ? 'bg-blue-100 border border-blue-200' 
                  : 'hover:bg-gray-100'
              }`}
            >
              <div className="truncate pr-2">
                <div className="font-medium text-gray-800 truncate">{chat.title}</div>
                <div className="text-xs text-gray-500">
                  {new Date(chat.createdAt).toLocaleDateString()}
                </div>
              </div>
              <button 
                onClick={(e) => handleDeleteChat(chat.id, e)}
                className="text-gray-400 hover:text-red-500 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 pb-20">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="flex items-center">
                    <svg className="animate-spin h-5 w-5 mr-3 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Loading messages...</span>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-500 max-w-md">
                    <div className="text-lg font-medium mb-2">Start a conversation</div>
                    <p className="mb-4">Ask anything to your AI assistant. It can help with questions, ideas, and more.</p>
                  </div>
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-4">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl p-4 ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white rounded-br-none'
                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.content}</div>
                      </div>
                    </div>
                  ))}
                  
                  {isStreaming && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 text-gray-800 rounded-xl rounded-bl-none p-4 max-w-[80%]">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-100"></div>
                          <div className="w-2 h-2 rounded-full bg-gray-500 animate-bounce delay-200"></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-white">
              <div className="max-w-3xl mx-auto flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !isStreaming && handleSend()}
                  disabled={isStreaming}
                  className="flex-1 border px-4 py-3 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  placeholder="Type your message..."
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
              <div className="text-xs text-gray-500 text-center mt-2">
                AI assistant may produce inaccurate information
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <h2 className="text-2xl font-medium text-gray-700 mb-4">No chat selected</h2>
              <p className="text-gray-500 mb-6">
                Select an existing chat or create a new one to start the conversation
              </p>
              <button
                onClick={handleNewChat}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
              >
                Create New Chat
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}