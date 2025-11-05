import React, { useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { Highlight } from '@tiptap/extension-highlight';
import { TextAlign } from '@tiptap/extension-text-align';
import { Typography } from '@tiptap/extension-typography';
import { createLowlight } from 'lowlight';
import axios from 'axios';
import { API_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

const lowlight = createLowlight();
import { useTheme } from '../contexts/ThemeContext';
import {
  Bold,
  Italic,
  Code,
  List,
  ListOrdered,
  Quote,
  Image as ImageIcon,
  Link as LinkIcon,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Highlighter,
  Undo,
  Redo
} from 'lucide-react';

interface TiptapEditorProps {
  content: any[];
  onChange: (content: any[]) => void;
  placeholder?: string;
  className?: string;
}

// Convert blocks to HTML for Tiptap
const blocksToHtml = (blocks: any[]): string => {
  if (!blocks || !Array.isArray(blocks)) return '';
  
  return blocks.map(block => {
    switch (block.type) {
      case 'heading':
        const level = block.attrs?.level || 1;
        return `<h${level}>${block.content || ''}</h${level}>`;
      
      case 'paragraph':
        return `<p>${block.content || ''}</p>`;
      
      case 'bulletList':
        return `<ul>${(block.content || []).map((item: any) => 
          `<li>${item.content || ''}</li>`
        ).join('')}</ul>`;
      
      case 'orderedList':
        return `<ol>${(block.content || []).map((item: any) => 
          `<li>${item.content || ''}</li>`
        ).join('')}</ol>`;
      
      case 'blockquote':
        return `<blockquote><p>${block.content || ''}</p></blockquote>`;
      
      case 'codeBlock':
        const language = block.attrs?.language || '';
        return `<pre><code class="language-${language}">${block.content || ''}</code></pre>`;
      
      case 'image':
        const src = block.attrs?.src || '';
        const alt = block.attrs?.alt || '';
        return `<img src="${src}" alt="${alt}" />`;
      
      case 'horizontalRule':
        return '<hr />';
      
      default:
        return `<p>${block.content || ''}</p>`;
    }
  }).join('');
};

// Convert Tiptap HTML to blocks
const htmlToBlocks = (html: string): any[] => {
  // This is a simplified converter - in production you'd want a proper HTML parser
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  const blocks: any[] = [];
  let blockId = 0;
  
  const processNode = (node: Node) => {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();
      
      switch (tagName) {
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          blocks.push({
            id: `block-${++blockId}`,
            type: 'heading',
            content: element.textContent || '',
            attrs: { level: parseInt(tagName.charAt(1)) }
          });
          break;
        
        case 'p':
          if (element.textContent?.trim()) {
            blocks.push({
              id: `block-${++blockId}`,
              type: 'paragraph',
              content: element.textContent || ''
            });
          }
          break;
        
        case 'ul':
          const ulItems = Array.from(element.querySelectorAll('li')).map(li => ({
            content: li.textContent || ''
          }));
          blocks.push({
            id: `block-${++blockId}`,
            type: 'bulletList',
            content: ulItems
          });
          break;
        
        case 'ol':
          const olItems = Array.from(element.querySelectorAll('li')).map(li => ({
            content: li.textContent || ''
          }));
          blocks.push({
            id: `block-${++blockId}`,
            type: 'orderedList',
            content: olItems
          });
          break;
        
        case 'blockquote':
          blocks.push({
            id: `block-${++blockId}`,
            type: 'blockquote',
            content: element.textContent || ''
          });
          break;
        
        case 'pre':
          const code = element.querySelector('code');
          const codeContent = code?.textContent || '';
          const language = code?.className?.match(/language-(\w+)/)?.[1] || '';
          blocks.push({
            id: `block-${++blockId}`,
            type: 'codeBlock',
            content: codeContent,
            attrs: { language }
          });
          break;
        
        case 'img':
          blocks.push({
            id: `block-${++blockId}`,
            type: 'image',
            attrs: {
              src: element.getAttribute('src') || '',
              alt: element.getAttribute('alt') || ''
            }
          });
          break;
        
        case 'hr':
          blocks.push({
            id: `block-${++blockId}`,
            type: 'horizontalRule'
          });
          break;
        
        default:
          // Process child nodes
          Array.from(node.childNodes).forEach(processNode);
      }
    }
  };
  
  Array.from(tempDiv.childNodes).forEach(processNode);
  return blocks;
};

const TiptapEditor: React.FC<TiptapEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = ''
}) => {
  const { token } = useAuth();
  const { isDark } = useTheme();
  const [isUploading, setIsUploading] = useState(false);

  // Upload image to Cloudinary
  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    try {
      setIsUploading(true);
      
      // Check file size (2MB = 2097152 bytes)
      if (file.size > 2097152) {
        alert('Image size must be under 2MB');
        return null;
      }

      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post(`${API_URL}/documents/upload-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        return response.data.url;
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (error: any) {
      console.error('❌ Image upload failed:', error);
      alert(error.response?.data?.message || 'Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [token]);

  // Handle image paste/drop
  const handleImageInsert = useCallback(async (file: File) => {
    const url = await uploadImage(file);
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [uploadImage]);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm'
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full'
        }
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2 bg-gray-50 font-semibold'
        }
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 px-4 py-2'
        }
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto'
        }
      }),
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-200 dark:bg-yellow-600'
        }
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Typography
    ],
    content: blocksToHtml(content),
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const blocks = htmlToBlocks(html);
      onChange(blocks);
    },
    onCreate: ({ editor }) => {
      // Handle paste events
      editor.view.dom.addEventListener('paste', (e) => {
        const items = e.clipboardData?.items;
        if (items) {
          for (const item of Array.from(items)) {
            if (item.type.startsWith('image/')) {
              e.preventDefault();
              const file = item.getAsFile();
              if (file) {
                handleImageInsert(file);
              }
              break;
            }
          }
        }
      });

      // Handle drop events
      editor.view.dom.addEventListener('drop', (e) => {
        const files = e.dataTransfer?.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/')) {
            e.preventDefault();
            handleImageInsert(file);
          }
        }
      });
    }
  }, [content, onChange, handleImageInsert]);

  // Toolbar button component
  const ToolbarButton: React.FC<{
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    title: string;
  }> = ({ onClick, isActive = false, disabled = false, children, title }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded-md transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'
      } ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );

  // Add link function
  const addLink = () => {
    const url = window.prompt('Enter URL');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  // Add image function
  const addImageFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageInsert(file);
      }
    };
    input.click();
  };

  if (!editor) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className={`border rounded-lg ${isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'} ${className}`}>
      {/* Toolbar */}
      <div className={`flex flex-wrap gap-1 p-3 border-b ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
        {/* Undo/Redo */}
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Undo"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Redo"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>

        <div className={`mx-2 w-px h-6 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />

        {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
          title="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
          title="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
          title="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <div className={`mx-2 w-px h-6 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />

        {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive('code')}
          title="Code"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={editor.isActive('highlight')}
          title="Highlight"
        >
          <Highlighter className="h-4 w-4" />
        </ToolbarButton>

        <div className={`mx-2 w-px h-6 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <div className={`mx-2 w-px h-6 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />

        {/* Blockquote and Code Block */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
          title="Quote"
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          title="Code Block"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>

        <div className={`mx-2 w-px h-6 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />

        {/* Text alignment */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>

        <div className={`mx-2 w-px h-6 ${isDark ? 'bg-gray-600' : 'bg-gray-300'}`} />

        {/* Media and others */}
        <ToolbarButton
          onClick={addImageFromFile}
          disabled={isUploading}
          title={isUploading ? 'Uploading...' : 'Add Image'}
        >
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive('link')}
          title="Add Link"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          title="Insert Table"
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Rule"
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <div className={`min-h-[300px] p-4 prose max-w-none ${isDark ? 'prose-invert' : ''}`}>
        <EditorContent
          editor={editor}
          className="focus:outline-none"
          placeholder={placeholder}
        />
        {isUploading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Uploading image...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default TiptapEditor;