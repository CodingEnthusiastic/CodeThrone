import React, { useRef, useCallback, useEffect } from 'react';

interface SmartCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  contestMode?: boolean; // New prop for contest restrictions
}

// Auto-completion pairs for different characters
const AUTO_PAIRS: { [key: string]: string } = {
  '(': ')',
  '[': ']',
  '{': '}',
  '"': '"',
  "'": "'",
  '`': '`'
};

// Language-specific indentation keywords
const INDENT_KEYWORDS: { [key: string]: string[] } = {
  cpp: ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'try', 'catch', 'class', 'struct', 'namespace'],
  java: ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'try', 'catch', 'class', 'interface', 'enum'],
  python: ['if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'def', 'class', 'with'],
  c: ['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'struct']
};

const SmartCodeEditor: React.FC<SmartCodeEditorProps> = ({
  value,
  onChange,
  language,
  disabled = false,
  placeholder = "Write your code here...",
  className = "",
  contestMode = false // New prop with default value
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handle tab key for proper indentation (4 spaces)
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd, value: currentValue } = textarea;

    // Handle Tab key - insert 4 spaces
    if (e.key === 'Tab') {
      e.preventDefault();
      const beforeTab = currentValue.substring(0, selectionStart);
      const afterTab = currentValue.substring(selectionEnd);
      const newValue = beforeTab + '    ' + afterTab; // 4 spaces
      
      onChange(newValue);
      
      // Set cursor position after the spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = selectionStart + 4;
      }, 0);
      return;
    }

    // Handle Shift+Tab for dedentation
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault();
      const lines = currentValue.split('\n');
      const currentLineStart = currentValue.lastIndexOf('\n', selectionStart - 1) + 1;
      const currentLineEnd = currentValue.indexOf('\n', selectionStart);
      const currentLine = lines[currentValue.substring(0, selectionStart).split('\n').length - 1];
      
      if (currentLine.startsWith('    ')) {
        const beforeLine = currentValue.substring(0, currentLineStart);
        const afterLine = currentValue.substring(currentLineEnd === -1 ? currentValue.length : currentLineEnd);
        const dedentedLine = currentLine.substring(4);
        const newValue = beforeLine + dedentedLine + afterLine;
        
        onChange(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = Math.max(currentLineStart, selectionStart - 4);
        }, 0);
      }
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
      
      // Language-specific indentation rules
      if (language === 'python') {
        if (trimmedLine.endsWith(':')) {
          extraIndent = '    ';
        }
      } else {
        // For C/C++/Java - check for opening braces or keywords
        if (trimmedLine.endsWith('{') || 
            INDENT_KEYWORDS[language]?.some(keyword => 
              new RegExp(`\\b${keyword}\\b.*\\($|\\b${keyword}\\b\\s*$`).test(trimmedLine)
            )) {
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
      
      // Special handling for quotes - don't auto-pair if already inside quotes
      if ((e.key === '"' || e.key === "'") && selectionStart > 0) {
        const charBefore = currentValue[selectionStart - 1];
        const charAfter = currentValue[selectionStart];
        
        // If we're closing an existing quote, just move cursor
        if (charAfter === e.key) {
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
          }, 0);
          return;
        }
        
        // Don't auto-pair quotes inside strings
        const beforeText = beforeCursor;
        const quoteCount = (beforeText.match(new RegExp(e.key === '"' ? '"' : "'", 'g')) || []).length;
        if (quoteCount % 2 === 1) {
          // We're inside a string, just insert the character
          const newValue = beforeCursor + e.key + afterCursor;
          onChange(newValue);
          setTimeout(() => {
            textarea.selectionStart = textarea.selectionEnd = selectionStart + 1;
          }, 0);
          return;
        }
      }
      
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

    // Handle Backspace for auto-pair deletion
    if (e.key === 'Backspace') {
      const charBefore = currentValue[selectionStart - 1];
      const charAfter = currentValue[selectionStart];
      
      if (charBefore && AUTO_PAIRS[charBefore] === charAfter) {
        e.preventDefault();
        const beforeCursor = currentValue.substring(0, selectionStart - 1);
        const afterCursor = currentValue.substring(selectionStart + 1);
        const newValue = beforeCursor + afterCursor;
        
        onChange(newValue);
        
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = selectionStart - 1;
        }, 0);
        return;
      }
    }
  }, [value, onChange, language]);

  // Handle paste events to maintain proper indentation
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Block pasting in contest mode
    if (contestMode) {
      e.preventDefault();
      alert('Pasting is not allowed in contest mode!');
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    e.preventDefault();
    
    const { selectionStart, selectionEnd, value: currentValue } = textarea;
    const beforeCursor = currentValue.substring(0, selectionStart);
    const afterCursor = currentValue.substring(selectionEnd);
    
    // Get current line indentation
    const currentLineStart = beforeCursor.lastIndexOf('\n') + 1;
    const currentLine = beforeCursor.substring(currentLineStart);
    const indentMatch = currentLine.match(/^(\s*)/);
    const currentIndent = indentMatch ? indentMatch[1] : '';
    
    // Process pasted text to maintain indentation
    const lines = pastedText.split('\n');
    const processedLines = lines.map((line, index) => {
      if (index === 0) return line; // First line keeps original indentation
      if (line.trim() === '') return line; // Empty lines stay empty
      
      // Remove existing indentation and add current indentation
      const trimmedLine = line.replace(/^\s*/, '');
      return currentIndent + trimmedLine;
    });
    
    const processedText = processedLines.join('\n');
    const newValue = beforeCursor + processedText + afterCursor;
    
    onChange(newValue);
    
    setTimeout(() => {
      const newCursorPos = selectionStart + processedText.length;
      textarea.selectionStart = textarea.selectionEnd = newCursorPos;
    }, 0);
  }, [onChange, contestMode]);

  // Handle copy events with contest mode restrictions
  const handleCopy = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (contestMode) {
      e.preventDefault();
      alert('Copying is not allowed in contest mode!');
      return;
    }
  }, [contestMode]);

  // Handle cut events with contest mode restrictions
  const handleCut = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (contestMode) {
      e.preventDefault();
      alert('Cutting is not allowed in contest mode!');
      return;
    }
  }, [contestMode]);

  // Handle context menu (right-click) with contest mode restrictions
  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    if (contestMode) {
      e.preventDefault();
      alert('Right-click is disabled in contest mode!');
      return;
    }
  }, [contestMode]);

  // Apply syntax highlighting classes based on language
  const getLanguageClass = () => {
    switch (language) {
      case 'cpp': return 'language-cpp';
      case 'java': return 'language-java';
      case 'python': return 'language-python';
      case 'c': return 'language-c';
      default: return '';
    }
  };

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onCopy={handleCopy}
        onCut={handleCut}
        onContextMenu={handleContextMenu}
        className={`
          w-full h-96 p-4 border border-gray-300 rounded-md 
          font-mono text-sm resize-none
          focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${getLanguageClass()}
          ${className}
          ${contestMode ? 'select-none' : ''}
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
        // Additional contest mode restrictions
        {...(contestMode && {
          'data-contest-mode': 'true',
          style: {
            ...{
              tabSize: 4,
              MozTabSize: 4,
              lineHeight: '1.5',
              whiteSpace: 'pre'
            },
            userSelect: 'text', // Allow text selection but restrict copy
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          }
        })}
      />
    </div>
  );
};

export default SmartCodeEditor;
