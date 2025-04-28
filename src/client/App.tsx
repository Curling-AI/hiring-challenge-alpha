import React, { useState } from 'react';

interface Message {
  type: 'user' | 'agent';
  content: string;
  sources?: string[];
}

const App: React.FC = () => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsLoading(true);
    setMessages(prev => [...prev, { type: 'user', content: question }]);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages(prev => [...prev, {
          type: 'agent',
          content: data.answer,
          sources: data.sources,
        }]);
      } else {
        setMessages(prev => [...prev, {
          type: 'agent',
          content: `Erro: ${data.error}`,
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'agent',
        content: 'Erro ao processar sua pergunta. Por favor, tente novamente.',
      }]);
    } finally {
      setIsLoading(false);
      setQuestion('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-200">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="p-6 mb-8">
          <div className="h-96 overflow-y-auto mb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`mb-4 p-4 rounded-lg ${
                  message.type === 'user' ? 'bg-gray-100 ml-8' : 'mr-8'
                }`}
              >
                <p className="text-gray-600">{message.content}</p>
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 text-sm text-gray-600">
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
          </div>

          <form onSubmit={handleSubmit} className="flex bg-gray-300 py-2 px-4 gap-4 border border-gray-400 rounded-xl">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something..."
              className="flex-1 focus:outline-none bg-gray-300 text-gray-600"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gray-400 text-white px-4 py-2 rounded-lg hover:bg-gray-500 disabled:bg-gray-500"
            >
              {isLoading ? 'Processing...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default App; 