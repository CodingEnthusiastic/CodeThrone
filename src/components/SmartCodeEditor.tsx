import React, { useRef, useCallback, useEffect, useState } from 'react';

interface SmartCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  contestMode?: boolean;
}

interface Suggestion {
  text: string;
  description: string;
  insertText: string;
  type: 'keyword' | 'snippet' | 'function' | 'variable';
}

// Smart suggestions based on context and language
const SUGGESTIONS: { [key: string]: { [key: string]: Suggestion[] } } = {
  cpp: {
    'for': [
      {
        text: 'for loop',
        description: 'Standard for loop',
        insertText: 'for(int i = 0; i < n; i++) {\n    \n}',
        type: 'snippet'
      },
      {
        text: 'for range',
        description: 'Range-based for loop',
        insertText: 'for(auto x : arr) {\n    \n}',
        type: 'snippet'
      }
    ],
    'if': [
      {
        text: 'if statement',
        description: 'If condition',
        insertText: 'if(condition) {\n    \n}',
        type: 'snippet'
      },
      {
        text: 'if-else',
        description: 'If-else statement',
        insertText: 'if(condition) {\n    \n} else {\n    \n}',
        type: 'snippet'
      }
    ],
    'while': [
      {
        text: 'while loop',
        description: 'While loop',
        insertText: 'while(condition) {\n    \n}',
        type: 'snippet'
      }
    ],
    'vector': [
      {
        text: 'vector<int>',
        description: 'Integer vector',
        insertText: 'vector<int> v;',
        type: 'snippet'
      },
      {
        text: 'vector<string>',
        description: 'String vector',
        insertText: 'vector<string> v;',
        type: 'snippet'
      }
    ],
    'cout': [
      {
        text: 'cout',
        description: 'Output stream',
        insertText: 'cout << "text" << endl;',
        type: 'function'
      }
    ],
    'cin': [
      {
        text: 'cin',
        description: 'Input stream',
        insertText: 'cin >> variable;',
        type: 'function'
      }
    ]
  },
  java: {
    'for': [
      {
        text: 'for loop',
        description: 'Standard for loop',
        insertText: 'for(int i = 0; i < n; i++) {\n    \n}',
        type: 'snippet'
      },
      {
        text: 'enhanced for',
        description: 'Enhanced for loop',
        insertText: 'for(int x : arr) {\n    \n}',
        type: 'snippet'
      }
    ],
    'if': [
      {
        text: 'if statement',
        description: 'If condition',
        insertText: 'if(condition) {\n    \n}',
        type: 'snippet'
      }
    ],
    'System': [
      {
        text: 'System.out.println',
        description: 'Print line',
        insertText: 'System.out.println("text");',
        type: 'function'
      }
    ],
    'Scanner': [
      {
        text: 'Scanner',
        description: 'Input scanner',
        insertText: 'Scanner sc = new Scanner(System.in);',
        type: 'snippet'
      }
    ]
  },
  python: {
    'for': [
      {
        text: 'for loop',
        description: 'For loop with range',
        insertText: 'for i in range(n):\n    pass',
        type: 'snippet'
      },
      {
        text: 'for enumerate',
        description: 'For loop with enumerate',
        insertText: 'for i, x in enumerate(arr):\n    pass',
        type: 'snippet'
      }
    ],
    'if': [
      {
        text: 'if statement',
        description: 'If condition',
        insertText: 'if condition:\n    pass',
        type: 'snippet'
      }
    ],
    'def': [
      {
        text: 'function',
        description: 'Define function',
        insertText: 'def function_name():\n    pass',
        type: 'snippet'
      }
    ],
    'print': [
      {
        text: 'print',
        description: 'Print statement',
        insertText: 'print("text")',
        type: 'function'
      }
    ]
  },
  c: {
    'for': [
      {
        text: 'for loop',
        description: 'Standard for loop',
        insertText: 'for(int i = 0; i < n; i++) {\n    \n}',
        type: 'snippet'
      }
    ],
    'if': [
      {
        text: 'if statement',
        description: 'If condition',
        insertText: 'if(condition) {\n    \n}',
        type: 'snippet'
      }
    ],
    'printf': [
      {
        text: 'printf',
        description: 'Formatted output',
        insertText: 'printf("format", args);',
        type: 'function'
      }
    ],
    'scanf': [
      {
        text: 'scanf',
        description: 'Formatted input',
        insertText: 'scanf("format", &variable);',
        type: 'function'
      }
    ]
  }
};

// Auto-completion pairs for different characters
const AUTO_PAIRS: { [key: string]: string } = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`'
};

const SmartCodeEditor: React.FC<SmartCodeEditorProps> = ({
  value,
  onChange,
  language,
  disabled = false,
  placeholder = "Write your code here...",
  className = "",
  contestMode = false
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });

  // Get suggestions based on current word
  const getCurrentWord = useCallback((text: string, cursorPos: number) => {
    const beforeCursor = text.substring(0, cursorPos);
    const words = beforeCursor.split(/[\s\(\)\{\}\[\];,]/);
    return words[words.length - 1] || '';
  }, []);

  // Get relevant suggestions
  const getSuggestions = useCallback((word: string) => {
    if (!word || word.length < 1) return [];
    
    const langSuggestions = SUGGESTIONS[language] || {};
    let allSuggestions: Suggestion[] = [];
    
    // Check for exact matches first
    if (langSuggestions[word]) {
      allSuggestions = [...langSuggestions[word]];
    }
    
    // Then check for partial matches
    Object.keys(langSuggestions).forEach(key => {
      if (key.toLowerCase().startsWith(word.toLowerCase()) && key !== word) {
        allSuggestions.push(...langSuggestions[key]);
      }
    });
    
    return allSuggestions.slice(0, 6); // Limit to 6 suggestions
  }, [language]);

  // Handle input changes and show suggestions
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    onChange(newValue);
    
    // Get current word for suggestions
    const currentWord = getCurrentWord(newValue, cursorPos);
    const newSuggestions = getSuggestions(currentWord);
    
    if (newSuggestions.length > 0 && currentWord.length > 0) {
      setSuggestions(newSuggestions);
      setSelectedSuggestion(0);
      setShowSuggestions(true);
      
      // Calculate suggestion box position
      const textarea = textareaRef.current;
      if (textarea) {
        const rect = textarea.getBoundingClientRect();
        const lineHeight = 20; // Approximate line height
        const lines = newValue.substring(0, cursorPos).split('\n');
        const currentLine = lines.length - 1;
        const currentCol = lines[lines.length - 1].length;
        
        setSuggestionPosition({
          top: rect.top + (currentLine * lineHeight) + lineHeight + 5,
          left: rect.left + (currentCol * 8) + 10 // Approximate character width
        });
      }
    } else {
      setShowSuggestions(false);
    }
  }, [onChange, getCurrentWord, getSuggestions]);

  // Handle key down events
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: currentValue } = textarea;

    // Handle suggestions navigation
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => Math.max(prev - 1, 0));
        return;
      } else if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        const suggestion = suggestions[selectedSuggestion];
        if (suggestion) {
          insertSuggestion(suggestion);
        }
        return;
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }

    // Handle Tab key for indentation
    if (e.key === 'Tab' && !showSuggestions) {
      e.preventDefault();
      const beforeTab = currentValue.substring(0, selectionStart);
      const afterTab = currentValue.substring(selectionEnd);
      const newValue = beforeTab + '    ' + afterTab; // 4 spaces
      
      onChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 4;
      }, 0);
      return;
    }

    // Handle Enter key for smart indentation
    if (e.key === 'Enter') {
      e.preventDefault();
      const beforeCursor = currentValue.substring(0, selectionStart);
      const afterCursor = currentValue.substring(selectionEnd);
      const currentLine = beforeCursor.split('\n').pop() || '';
      
      // Calculate current indentation
      const indentMatch = currentLine.match(/^(\s*)/);
      let currentIndent = indentMatch ? indentMatch[1] : '';
      
      // Check if we need extra indentation
      let extraIndent = '';
      const trimmedLine = currentLine.trim();
      
      if (language === 'python') {
        if (trimmedLine.endsWith(':')) {
          extraIndent = '    ';
        }
      } else {
        if (trimmedLine.endsWith('{')) {
          extraIndent = '    ';
        }
      }
      
      const newValue = beforeCursor + '\n' + currentIndent + extraIndent + afterCursor;
      onChange(newValue);
      
      setTimeout(() => {
        const newCursorPos = selectionStart + 1 + currentIndent.length + extraIndent.length;
        textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      }, 0);
      return;
    }

    // Handle auto-pairing
    if (AUTO_PAIRS[e.key]) {
      e.preventDefault();
      const beforeCursor = currentValue.substring(0, selectionStart);
      const afterCursor = currentValue.substring(selectionEnd);
      const pair = AUTO_PAIRS[e.key];
      
      const newValue = beforeCursor + e.key + pair + afterCursor;
      onChange(newValue);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
      }, 0);
      return;
    }

    // Handle closing brackets/quotes - skip if next character matches
    if (')]}"\'`'.includes(e.key)) {
      const nextChar = currentValue[selectionStart];
      if (nextChar === e.key) {
        e.preventDefault();
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
        }, 0);
        return;
      }
    }
  }, [showSuggestions, suggestions, selectedSuggestion, onChange, language]);

  // Insert selected suggestion
  const insertSuggestion = useCallback((suggestion: Suggestion) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, value: currentValue } = textarea;
    const currentWord = getCurrentWord(currentValue, selectionStart);
    
    // Replace the current word with the suggestion
    const beforeWord = currentValue.substring(0, selectionStart - currentWord.length);
    const afterWord = currentValue.substring(selectionStart);
    
    const newValue = beforeWord + suggestion.insertText + afterWord;
    onChange(newValue);
    
    setShowSuggestions(false);
    
    // Set cursor position
    setTimeout(() => {
      const newCursorPos = beforeWord.length + suggestion.insertText.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
      textarea.focus();
    }, 0);
  }, [getCurrentWord, onChange]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'snippet': return '📝';
      case 'function': return '🔧';
      case 'keyword': return '🔑';
      case 'variable': return '📦';
      default: return '💡';
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        className={`
          w-full h-96 p-4 border border-gray-300 rounded-md 
          font-mono text-sm resize-none
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${className}
        `}
        style={{
          tabSize: 4,
          MozTabSize: 4,
          lineHeight: '1.5',
          whiteSpace: 'pre'
        }}
        placeholder={placeholder}
        disabled={disabled}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
      />
      
      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-w-sm"
          style={{
            top: suggestionPosition.top,
            left: suggestionPosition.left
          }}
        >
          <div className="p-2 border-b border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-600 font-medium">
              💡 Suggestions (Press Tab to accept)
            </div>
          </div>
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              className={`p-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === selectedSuggestion ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
              }`}
              onClick={() => insertSuggestion(suggestion)}
            >
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getTypeIcon(suggestion.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900">{suggestion.text}</div>
                  <div className="text-xs text-gray-500 truncate">{suggestion.description}</div>
                </div>
              </div>
            </div>
          ))}
          <div className="p-2 bg-gray-50 text-xs text-gray-500 border-t">
            ↑↓ Navigate • Tab/Enter Select • Esc Close
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartCodeEditor;
