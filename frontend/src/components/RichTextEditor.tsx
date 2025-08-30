import React, { useState, useRef, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBold, 
  faItalic, 
  faUnderline, 
  faListUl, 
  faListOl,
  faQuoteLeft,
  faLink,
  faUnlink,
  faUndo,
  faRedo
} from '@fortawesome/free-solid-svg-icons';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter description...',
  disabled = false,
  className = '',
  maxLength = 5000
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [currentLength, setCurrentLength] = useState(0);

  useEffect(() => {
    if (editorRef.current) {
      // Only set innerHTML if the value is different to avoid cursor jumping
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value;
      }
      setCurrentLength(value.length);
    }
  }, [value]);

  const execCommand = (command: string, value?: string) => {
    if (editorRef.current) {
      document.execCommand(command, false, value);
      editorRef.current.focus();
      handleInput();
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      // Clean up empty content and normalize
      const cleanContent = content === '<br>' || content === '<div><br></div>' ? '' : content;
      setCurrentLength(cleanContent.length);
      onChange(cleanContent);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      execCommand('insertLineBreak');
    }
  };

  const formatText = (command: string) => {
    execCommand(command);
  };

  const insertList = (type: 'ul' | 'ol') => {
    execCommand(type === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
  };

  const insertQuote = () => {
    execCommand('formatBlock', '<blockquote>');
  };

  const insertLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const removeLink = () => {
    execCommand('unlink');
  };

  const undo = () => {
    execCommand('undo');
  };

  const redo = () => {
    execCommand('redo');
  };

  const clearFormatting = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      handleInput();
    }
  };

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-gray-50 border border-gray-200 rounded-t-lg">
        <button
          type="button"
          onClick={() => formatText('bold')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bold"
        >
          <FontAwesomeIcon icon={faBold} />
        </button>
        <button
          type="button"
          onClick={() => formatText('italic')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Italic"
        >
          <FontAwesomeIcon icon={faItalic} />
        </button>
        <button
          type="button"
          onClick={() => formatText('underline')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Underline"
        >
          <FontAwesomeIcon icon={faUnderline} />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={() => insertList('ul')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Bullet List"
        >
          <FontAwesomeIcon icon={faListUl} />
        </button>
        <button
          type="button"
          onClick={() => insertList('ol')}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Numbered List"
        >
          <FontAwesomeIcon icon={faListOl} />
        </button>
        <button
          type="button"
          onClick={insertQuote}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Quote"
        >
          <FontAwesomeIcon icon={faQuoteLeft} />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={insertLink}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Insert Link"
        >
          <FontAwesomeIcon icon={faLink} />
        </button>
        <button
          type="button"
          onClick={removeLink}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Remove Link"
        >
          <FontAwesomeIcon icon={faUnlink} />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={undo}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Undo"
        >
          <FontAwesomeIcon icon={faUndo} />
        </button>
        <button
          type="button"
          onClick={redo}
          className="p-2 hover:bg-gray-200 rounded transition-colors"
          title="Redo"
        >
          <FontAwesomeIcon icon={faRedo} />
        </button>
        
        <div className="w-px h-6 bg-gray-300 mx-1"></div>
        
        <button
          type="button"
          onClick={clearFormatting}
          className="px-3 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
          title="Clear Formatting"
        >
          Clear
        </button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable={!disabled}
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`
          min-h-[200px] p-3 border border-gray-200 rounded-b-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          ${isFocused ? 'bg-white' : 'bg-gray-50'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}
        `}
        style={{ 
          minHeight: '200px',
          maxHeight: '400px',
          overflowY: 'auto',
          direction: 'ltr',
          textAlign: 'left',
          unicodeBidi: 'embed'
        }}
        data-placeholder={placeholder}
      />

      {/* Character count */}
      <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
        <span>
          {currentLength} / {maxLength} characters
        </span>
        {currentLength > maxLength * 0.9 && (
          <span className="text-orange-600">
            {currentLength > maxLength ? 'Character limit exceeded!' : 'Approaching limit'}
          </span>
        )}
      </div>

      {/* Placeholder styles */}
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        .rich-text-editor [contenteditable] {
          outline: none;
        }
        .rich-text-editor [contenteditable]:focus {
          outline: none;
        }
      `}</style>
    </div>
  );
};

export default RichTextEditor;
