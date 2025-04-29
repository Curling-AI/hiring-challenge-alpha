import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import Sidebar from './Sidebar';
import { IoMdArrowUp } from "react-icons/io";
import { FaSpinner } from "react-icons/fa";

interface Message {
  type: 'user' | 'agent';
  content: string;
  sources?: string[];
  isLoadingPlaceholder?: boolean;
}

const CHAT_HISTORY_KEY = 'multiSourceAgentChatHistory';

const App: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    const parsed = savedHistory ? JSON.parse(savedHistory) : [];
    return parsed.filter((msg: Message) => !msg.isLoadingPlaceholder);
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages.filter(msg => !msg.isLoadingPlaceholder)));
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || isLoading) return;

    const newUserMessage: Message = { type: 'user', content: trimmedQuestion };
    const currentHistory = [...messages];
    
    setMessages(prev => [
      ...prev, 
      newUserMessage, 
      { type: 'agent', content: '', isLoadingPlaceholder: true }
    ]);
    
    setQuestion('');
    setIsLoading(true);

    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: trimmedQuestion,
          history: currentHistory
        }), 
      });

      const data = await response.json();

      setMessages(prev => 
        prev.map(msg => 
          msg.isLoadingPlaceholder 
            ? { 
                ...msg, 
                content: data.success ? data.answer : `Error: ${data.error || 'Unknown server error'}`, 
                sources: data.success ? data.sources : undefined, 
                isLoadingPlaceholder: false 
              } 
            : msg
        )
      );

    } catch (error) {
       setMessages(prev => 
         prev.map(msg => 
           msg.isLoadingPlaceholder 
             ? { 
                 ...msg, 
                 content: 'Error connecting to the server. Please try again.', 
                 isLoadingPlaceholder: false 
               } 
             : msg
         )
       );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuestion(suggestion);
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <div className="h-screen flex bg-background relative overflow-x-hidden">
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="md:hidden absolute top-4 left-4 z-30 p-2 bg-gray-700 text-white rounded"
        aria-label="Toggle sidebar"
      >
        ☰
      </button>

      <div className={`
        fixed top-0 left-0 h-full z-20 
        transition-transform transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:static md:translate-x-0 md:h-auto md:relative md:z-auto
      `}>
        <Sidebar 
          onSuggestionClick={handleSuggestionClick} 
          isLoading={isLoading}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-10 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close sidebar overlay"
        ></div>
      )}
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col max-w-7xl mx-auto w-full overflow-hidden px-4 pt-8 pb-4">
          <div className={`
            flex-1 overflow-y-auto mb-4 space-y-2 pr-2 md:pt-0 no-scrollbar
            ${messages.length === 0 ? 'flex flex-col justify-center items-center' : ''}
          `}>
            {messages.length === 0 ? (
              <div className="text-center">
                <p className="text-white text-4xl">Ask me anything!</p>
                <p className="text-gray-400 text-2xl mt-2">Or choose an option on the sidebar to get started.</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`rounded-lg max-w-[80%] w-fit text-white ${ 
                      message.type === 'user' ? 'text-right' : 'text-left'
                    }`}
                  >
                    {message.type === 'agent' ? (
                      message.isLoadingPlaceholder ? (
                        <div className="px-2 py-1 inline-block bg-white opacity-80 rounded-lg">
                          <span className="thinking-animation text-xl"></span>
                        </div>
                      ) : (
                        <div className="px-4 py-2 inline-block prose prose-sm max-w-none break-words overflow-hidden text-left text-white">
                          <ReactMarkdown>
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      )
                    ) : (
                      <p className="px-4 py-2 inline-block break-words overflow-hidden bg-background-muted rounded-lg text-left">
                        {message.content}
                      </p>
                    )}
                    {!message.isLoadingPlaceholder && message.sources && message.sources.length > 0 && (
                      <div className={`mt-2 text-sm text-gray-600 ${message.type === 'user' ? 'text-right' : 'text-left'}`}> 
                        <p className="font-semibold">Fontes utilizadas:</p>
                        <ul className="list-disc list-inside">
                          {message.sources.map((source, i) => (
                            <li key={i}>{source}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <form 
            ref={formRef} 
            onSubmit={handleSubmit} 
            className={`flex bg-background-muted py-2 px-4 gap-4 border border-gray-600 rounded-full items-center mb-2 
                       transition-all duration-300 ease-in-out 
                       ${messages.length > 0 ? 'mt-auto' : ''}
            `}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something..."
              className="flex-1 focus:outline-none bg-background-muted text-white placeholder-gray-400"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-white text-background p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center hover:bg-gray-200"
              style={{ width: '34px', height: '34px', flexShrink: 0 }}
            >
              {isLoading 
                ? <FaSpinner className="animate-spin text-gray-700" size={18} />
                : <IoMdArrowUp className="text-gray-700" size={18} />
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App; 