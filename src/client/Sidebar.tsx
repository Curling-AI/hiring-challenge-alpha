import React from 'react';
import { FaGithub, FaLinkedin, FaGlobe } from 'react-icons/fa';
interface SidebarProps {
  onSuggestionClick: (suggestion: string) => void;
  isLoading: boolean;
  onClose: () => void;
  githubUrl?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
}

const suggestions = [
  "List available files",
  "List artists from the database",
  "List books from the document",
  "Search documents for \"Modern Economics\"",
  "What tables are in music.db?",
];

const Sidebar: React.FC<SidebarProps> = ({
  onSuggestionClick,
  isLoading,
  onClose,
  githubUrl = 'https://github.com/zaqueu-1',
  portfolioUrl = 'https://zaqueu.tech',
  linkedinUrl = 'https://www.linkedin.com/in/zaqueu1/',
}) => {
  return (
    <div className="w-64 min-w-64 bg-background-muted text-gray-100 px-4 py-2 flex flex-col h-full shadow-xl">
      <div className="flex justify-between items-center my-4">
        <h1 className="text-3xl text-gray-600 bg-background font-semibold p-2 border-2 border-gray-600 shadow-md rounded-md">
            use
            <span className="text-gray-500">
                .AI
            </span>
        </h1>
        <button 
          onClick={onClose} 
          className="md:hidden p-1"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 mb-6 mt-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSuggestionClick(suggestion)}
            disabled={isLoading}
            className="w-full shadow-md text-left text-white hover:opacity-80 bg-background disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded text-sm"
          >
            <span>• {`${suggestion}`} </span>
          </button>
        ))}
      </div>

      <div className="mt-auto py-4 flex justify-center space-x-4">
        {githubUrl && (
          <a href={githubUrl} target="_blank" rel="noopener noreferrer" title="GitHub" className="text-white hover:text-gray-400 shadow-md">
            <FaGithub size={24} />
          </a>
        )}
        {portfolioUrl && (
          <a href={portfolioUrl} target="_blank" rel="noopener noreferrer" title="Portfolio" className="text-white hover:text-gray-400 shadow-md">
            <FaGlobe size={24} />
          </a>
        )}
        {linkedinUrl && (
          <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="text-white hover:text-gray-400 shadow-md">
            <FaLinkedin size={24} />
          </a>
        )}
      </div>
    </div>
  );
};

export default Sidebar; 