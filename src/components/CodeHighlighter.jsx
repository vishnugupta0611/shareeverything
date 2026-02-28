"use client";
import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

const CodeHighlighter = ({ code, language = 'javascript', readOnly = false }) => {
  const { isDark } = useTheme();

  // Simple syntax highlighting for common languages
  const highlightCode = (code, lang) => {
    if (!code) return '';

    let highlighted = code;

    // JavaScript/TypeScript highlighting
    if (lang === 'javascript' || lang === 'typescript' || lang === 'jsx') {
      // Keywords
      highlighted = highlighted.replace(
        /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|try|catch|throw|new)\b/g,
        '<span class="text-purple-400 font-semibold">$1</span>'
      );
      
      // Strings
      highlighted = highlighted.replace(
        /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g,
        '<span class="text-green-400">$1$2$1</span>'
      );
      
      // Comments
      highlighted = highlighted.replace(
        /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
        '<span class="text-gray-500 italic">$1</span>'
      );
      
      // Numbers
      highlighted = highlighted.replace(
        /\b(\d+\.?\d*)\b/g,
        '<span class="text-yellow-400">$1</span>'
      );
    }

    // Python highlighting
    if (lang === 'python') {
      highlighted = highlighted.replace(
        /\b(def|class|import|from|return|if|else|elif|for|while|try|except|with|as|pass|break|continue|lambda|yield|global|nonlocal)\b/g,
        '<span class="text-purple-400 font-semibold">$1</span>'
      );
      
      highlighted = highlighted.replace(
        /(["'])((?:\\.|(?!\1)[^\\])*?)\1/g,
        '<span class="text-green-400">$1$2$1</span>'
      );
      
      highlighted = highlighted.replace(
        /(#.*$)/gm,
        '<span class="text-gray-500 italic">$1</span>'
      );
    }

    // HTML highlighting
    if (lang === 'html') {
      highlighted = highlighted.replace(
        /(&lt;\/?)([a-zA-Z][a-zA-Z0-9]*)(.*?)(&gt;)/g,
        '<span class="text-blue-400">$1</span><span class="text-red-400">$2</span><span class="text-yellow-400">$3</span><span class="text-blue-400">$4</span>'
      );
    }

    // CSS highlighting
    if (lang === 'css') {
      highlighted = highlighted.replace(
        /([a-zA-Z-]+)(\s*:\s*)([^;]+)(;?)/g,
        '<span class="text-blue-400">$1</span><span class="text-white">$2</span><span class="text-green-400">$3</span><span class="text-white">$4</span>'
      );
    }

    return highlighted;
  };

  const highlightedCode = highlightCode(code, language);

  return (
    <div className={`relative rounded-xl overflow-hidden ${isDark ? 'bg-gray-900' : 'bg-gray-100'} border ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-2 ${isDark ? 'bg-gray-800' : 'bg-gray-200'} border-b ${isDark ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
          </div>
          <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {language}
          </span>
        </div>
        <button
          onClick={() => navigator.clipboard.writeText(code)}
          className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-300 text-gray-700 hover:bg-gray-400'} transition-colors`}
        >
          Copy
        </button>
      </div>
      
      {/* Code content */}
      <div className="p-4 overflow-x-auto">
        <pre className={`text-sm ${isDark ? 'text-gray-100' : 'text-gray-800'} font-mono leading-relaxed`}>
          <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
        </pre>
      </div>
    </div>
  );
};

export default CodeHighlighter;