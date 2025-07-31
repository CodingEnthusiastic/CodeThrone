import React, { useEffect, useRef, useCallback } from 'react';
import { basicSetup } from 'codemirror';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { java } from '@codemirror/lang-java';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { searchKeymap } from '@codemirror/search';
import { useTheme } from '../contexts/ThemeContext';
import { EditorSelection } from '@codemirror/state';
import { indentUnit } from '@codemirror/language';

interface EditorSettings {
  tabSize: number;
  insertSpaces: boolean;
  fontSize: number;
  lineNumbers: boolean;
  wordWrap: boolean;
}

interface CodeMirrorEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  disabled?: boolean;
  className?: string;
  contestMode?: boolean;
  height?: string;
  settings?: Partial<EditorSettings>; // Add settings prop
}

// Add default settings
const DEFAULT_SETTINGS: EditorSettings = {
  tabSize: 2, // Default to 2 spaces (modern standard)
  insertSpaces: true,
  fontSize: 14,
  lineNumbers: true,
  wordWrap: false,
};

// Language configurations
const getLanguageExtension = (language: string): Extension => {
  switch (language.toLowerCase()) {
    case 'cpp':
    case 'c++':
      return cpp();
    case 'java':
      return java();
    case 'javascript':
    case 'js':
      return javascript();
    case 'python':
    case 'py':
      return python();
    default:
      return cpp(); // Default to C++
  }
};

// Custom completion sources for competitive programming
const cppCompletions = [
  // STL Containers
  { label: 'vector', type: 'type', info: 'Dynamic array', apply: 'vector<int>' },
  { label: 'map', type: 'type', info: 'Associative container', apply: 'map<int, int>' },
  { label: 'set', type: 'type', info: 'Unique sorted elements', apply: 'set<int>' },
  { label: 'unordered_map', type: 'type', info: 'Hash map', apply: 'unordered_map<int, int>' },
  { label: 'unordered_set', type: 'type', info: 'Hash set', apply: 'unordered_set<int>' },
  { label: 'queue', type: 'type', info: 'FIFO queue', apply: 'queue<int>' },
  { label: 'stack', type: 'type', info: 'LIFO stack', apply: 'stack<int>' },
  { label: 'priority_queue', type: 'type', info: 'Priority queue (max heap)', apply: 'priority_queue<int>' },
  { label: 'deque', type: 'type', info: 'Double-ended queue', apply: 'deque<int>' },
  { label: 'list', type: 'type', info: 'Doubly linked list', apply: 'list<int>' },
  { label: 'multiset', type: 'type', info: 'Multiset container', apply: 'multiset<int>' },
  { label: 'multimap', type: 'type', info: 'Multimap container', apply: 'multimap<int, int>' },
  { label: 'pair', type: 'type', info: 'Pair of values', apply: 'pair<int, int>' },
  { label: 'tuple', type: 'type', info: 'Tuple container', apply: 'tuple<int, int, int>' },
  { label: 'array', type: 'type', info: 'Fixed-size array', apply: 'array<int, 10>' },
  { label: 'bitset', type: 'type', info: 'Bitset container', apply: 'bitset<32>' },
  
  // Data Types
  { label: 'int', type: 'type', info: 'Integer type' },
  { label: 'long', type: 'type', info: 'Long integer' },
  { label: 'long long', type: 'type', info: 'Long long integer' },
  { label: 'double', type: 'type', info: 'Double precision float' },
  { label: 'float', type: 'type', info: 'Single precision float' },
  { label: 'char', type: 'type', info: 'Character type' },
  { label: 'string', type: 'type', info: 'String type' },
  { label: 'bool', type: 'type', info: 'Boolean type' },
  { label: 'size_t', type: 'type', info: 'Size type' },
  { label: 'auto', type: 'keyword', info: 'Automatic type deduction' },
  
  // Common snippets
  { 
    label: 'fastio', 
    type: 'snippet',
    apply: 'ios_base::sync_with_stdio(false);\ncin.tie(NULL);\ncout.tie(NULL);',
    info: 'Fast I/O for competitive programming'
  },
  { 
    label: 'forloop', 
    type: 'snippet',
    apply: 'for(int i = 0; i < n; i++) {\n    \n}',
    info: 'Standard for loop'
  },
  { 
    label: 'forrange', 
    type: 'snippet',
    apply: 'for(auto x : arr) {\n    \n}',
    info: 'Range-based for loop'
  },
  { 
    label: 'while', 
    type: 'snippet',
    apply: 'while(condition) {\n    \n}',
    info: 'While loop'
  },
  { 
    label: 'ifelse', 
    type: 'snippet',
    apply: 'if(condition) {\n    \n} else {\n    \n}',
    info: 'If-else statement'
  },
  { 
    label: 'switch', 
    type: 'snippet',
    apply: 'switch(variable) {\n    case value:\n        break;\n    default:\n        break;\n}',
    info: 'Switch statement'
  },
  { 
    label: 'template', 
    type: 'snippet',
    apply: 'template<typename T>\nclass ClassName {\npublic:\n    \n};',
    info: 'Template class'
  },
  { 
    label: 'function', 
    type: 'snippet',
    apply: 'int functionName(int param) {\n    return 0;\n}',
    info: 'Function template'
  },
  { 
    label: 'class', 
    type: 'snippet',
    apply: 'class ClassName {\npublic:\n    ClassName() {}\n    \nprivate:\n    \n};',
    info: 'Class template'
  },
  { 
    label: 'struct', 
    type: 'snippet',
    apply: 'struct StructName {\n    int member;\n};',
    info: 'Struct template'
  },
  
  // Algorithms
  { label: 'sort', type: 'function', info: 'Sort container elements' },
  { label: 'reverse', type: 'function', info: 'Reverse container elements' },
  { label: 'binary_search', type: 'function', info: 'Binary search' },
  { label: 'lower_bound', type: 'function', info: 'First element not less than value' },
  { label: 'upper_bound', type: 'function', info: 'First element greater than value' },
  { label: 'min_element', type: 'function', info: 'Minimum element in range' },
  { label: 'max_element', type: 'function', info: 'Maximum element in range' },
  { label: 'accumulate', type: 'function', info: 'Sum of elements in range' },
  { label: 'count', type: 'function', info: 'Count occurrences' },
  { label: 'find', type: 'function', info: 'Find element' },
  { label: 'unique', type: 'function', info: 'Remove consecutive duplicates' },
  { label: 'rotate', type: 'function', info: 'Rotate elements' },
  { label: 'next_permutation', type: 'function', info: 'Next lexicographic permutation' },
  { label: 'prev_permutation', type: 'function', info: 'Previous lexicographic permutation' },
  { label: 'merge', type: 'function', info: 'Merge sorted ranges' },
  { label: 'transform', type: 'function', info: 'Transform elements' },
  { label: 'for_each', type: 'function', info: 'Apply function to each element' },
  { label: 'copy', type: 'function', info: 'Copy elements' },
  { label: 'fill', type: 'function', info: 'Fill with value' },
  { label: 'swap', type: 'function', info: 'Swap values' },
  { label: 'make_pair', type: 'function', info: 'Create pair' },
  { label: 'make_tuple', type: 'function', info: 'Create tuple' },
  
  // Input/Output
  { label: 'cin', type: 'keyword', info: 'Standard input stream' },
  { label: 'cout', type: 'keyword', info: 'Standard output stream' },
  { label: 'cerr', type: 'keyword', info: 'Standard error stream' },
  { label: 'printf', type: 'function', info: 'Formatted output' },
  { label: 'scanf', type: 'function', info: 'Formatted input' },
  { label: 'getline', type: 'function', info: 'Get line from stream' },
  
  // Math functions
  { label: 'abs', type: 'function', info: 'Absolute value' },
  { label: 'max', type: 'function', info: 'Maximum of values' },
  { label: 'min', type: 'function', info: 'Minimum of values' },
  { label: 'pow', type: 'function', info: 'Power function' },
  { label: 'sqrt', type: 'function', info: 'Square root' },
  { label: 'ceil', type: 'function', info: 'Ceiling function' },
  { label: 'floor', type: 'function', info: 'Floor function' },
  { label: 'round', type: 'function', info: 'Round to nearest integer' },
  { label: 'gcd', type: 'function', info: 'Greatest common divisor' },
  { label: 'lcm', type: 'function', info: 'Least common multiple' },
  
  // Common macros and shortcuts
  { label: 'pb', type: 'snippet', apply: 'push_back', info: 'Push back macro' },
  { label: 'mp', type: 'snippet', apply: 'make_pair', info: 'Make pair macro' },
  { label: 'll', type: 'snippet', apply: 'long long', info: 'Long long type' },
  { label: 'ull', type: 'snippet', apply: 'unsigned long long', info: 'Unsigned long long' },
  { label: 'vi', type: 'snippet', apply: 'vector<int>', info: 'Vector of integers' },
  { label: 'vll', type: 'snippet', apply: 'vector<long long>', info: 'Vector of long long' },
  { label: 'vs', type: 'snippet', apply: 'vector<string>', info: 'Vector of strings' },
  { label: 'pii', type: 'snippet', apply: 'pair<int, int>', info: 'Pair of integers' },
  { label: 'pll', type: 'snippet', apply: 'pair<long long, long long>', info: 'Pair of long long' },
  { label: 'mii', type: 'snippet', apply: 'map<int, int>', info: 'Map of integers' },
  { label: 'si', type: 'snippet', apply: 'set<int>', info: 'Set of integers' },
  { label: 'usi', type: 'snippet', apply: 'unordered_set<int>', info: 'Unordered set of integers' },
  { label: 'umii', type: 'snippet', apply: 'unordered_map<int, int>', info: 'Unordered map of integers' },
  
  // Headers
  { label: '#include <iostream>', type: 'snippet', info: 'Include iostream' },
  { label: '#include <vector>', type: 'snippet', info: 'Include vector' },
  { label: '#include <algorithm>', type: 'snippet', info: 'Include algorithm' },
  { label: '#include <map>', type: 'snippet', info: 'Include map' },
  { label: '#include <set>', type: 'snippet', info: 'Include set' },
  { label: '#include <queue>', type: 'snippet', info: 'Include queue' },
  { label: '#include <stack>', type: 'snippet', info: 'Include stack' },
  { label: '#include <string>', type: 'snippet', info: 'Include string' },
  { label: '#include <cmath>', type: 'snippet', info: 'Include cmath' },
  { label: '#include <climits>', type: 'snippet', info: 'Include climits' },
  { label: 'using namespace std;', type: 'snippet', info: 'Using standard namespace' },
];

const javaCompletions = [
  // Collections
  { label: 'ArrayList', type: 'type', info: 'Resizable array', apply: 'ArrayList<Integer>' },
  { label: 'HashMap', type: 'type', info: 'Hash map', apply: 'HashMap<Integer, Integer>' },
  { label: 'HashSet', type: 'type', info: 'Hash set', apply: 'HashSet<Integer>' },
  { label: 'TreeMap', type: 'type', info: 'Sorted map', apply: 'TreeMap<Integer, Integer>' },
  { label: 'TreeSet', type: 'type', info: 'Sorted set', apply: 'TreeSet<Integer>' },
  { label: 'PriorityQueue', type: 'type', info: 'Priority queue', apply: 'PriorityQueue<Integer>' },
  { label: 'LinkedList', type: 'type', info: 'Linked list', apply: 'LinkedList<Integer>' },
  { label: 'Stack', type: 'type', info: 'Stack container', apply: 'Stack<Integer>' },
  { label: 'Queue', type: 'type', info: 'Queue interface', apply: 'Queue<Integer>' },
  { label: 'Deque', type: 'type', info: 'Double-ended queue', apply: 'Deque<Integer>' },
  { label: 'List', type: 'type', info: 'List interface', apply: 'List<Integer>' },
  { label: 'Set', type: 'type', info: 'Set interface', apply: 'Set<Integer>' },
  { label: 'Map', type: 'type', info: 'Map interface', apply: 'Map<Integer, Integer>' },
  { label: 'LinkedHashMap', type: 'type', info: 'Linked hash map', apply: 'LinkedHashMap<Integer, Integer>' },
  { label: 'LinkedHashSet', type: 'type', info: 'Linked hash set', apply: 'LinkedHashSet<Integer>' },
  
  // Data Types
  { label: 'int', type: 'type', info: 'Integer primitive' },
  { label: 'Integer', type: 'type', info: 'Integer wrapper class' },
  { label: 'long', type: 'type', info: 'Long primitive' },
  { label: 'Long', type: 'type', info: 'Long wrapper class' },
  { label: 'double', type: 'type', info: 'Double primitive' },
  { label: 'Double', type: 'type', info: 'Double wrapper class' },
  { label: 'float', type: 'type', info: 'Float primitive' },
  { label: 'Float', type: 'type', info: 'Float wrapper class' },
  { label: 'boolean', type: 'type', info: 'Boolean primitive' },
  { label: 'Boolean', type: 'type', info: 'Boolean wrapper class' },
  { label: 'char', type: 'type', info: 'Character primitive' },
  { label: 'Character', type: 'type', info: 'Character wrapper class' },
  { label: 'String', type: 'type', info: 'String class' },
  { label: 'StringBuilder', type: 'type', info: 'Mutable string' },
  { label: 'StringBuffer', type: 'type', info: 'Thread-safe mutable string' },
  
  // Snippets
  { 
    label: 'forloop', 
    type: 'snippet',
    apply: 'for(int i = 0; i < n; i++) {\n    \n}',
    info: 'Standard for loop'
  },
  { 
    label: 'foreach', 
    type: 'snippet',
    apply: 'for(int x : arr) {\n    \n}',
    info: 'Enhanced for loop'
  },
  { 
    label: 'ifelse', 
    type: 'snippet',
    apply: 'if(condition) {\n    \n} else {\n    \n}',
    info: 'If-else statement'
  },
  { 
    label: 'while', 
    type: 'snippet',
    apply: 'while(condition) {\n    \n}',
    info: 'While loop'
  },
  { 
    label: 'switch', 
    type: 'snippet',
    apply: 'switch(variable) {\n    case value:\n        break;\n    default:\n        break;\n}',
    info: 'Switch statement'
  },
  { 
    label: 'try', 
    type: 'snippet',
    apply: 'try {\n    \n} catch (Exception e) {\n    e.printStackTrace();\n}',
    info: 'Try-catch block'
  },
  { 
    label: 'class', 
    type: 'snippet',
    apply: 'public class ClassName {\n    public ClassName() {\n    }\n}',
    info: 'Class template'
  },
  { 
    label: 'method', 
    type: 'snippet',
    apply: 'public int methodName(int param) {\n    return 0;\n}',
    info: 'Method template'
  },
  { 
    label: 'main', 
    type: 'snippet',
    apply: 'public static void main(String[] args) {\n    \n}',
    info: 'Main method'
  },
  
  // Methods
  { label: 'Collections.sort', type: 'function', info: 'Sort collection' },
  { label: 'Collections.reverse', type: 'function', info: 'Reverse collection' },
  { label: 'Collections.binarySearch', type: 'function', info: 'Binary search' },
  { label: 'Collections.min', type: 'function', info: 'Minimum element' },
  { label: 'Collections.max', type: 'function', info: 'Maximum element' },
  { label: 'Collections.frequency', type: 'function', info: 'Count occurrences' },
  { label: 'Collections.shuffle', type: 'function', info: 'Shuffle collection' },
  { label: 'Arrays.sort', type: 'function', info: 'Sort array' },
  { label: 'Arrays.binarySearch', type: 'function', info: 'Binary search array' },
  { label: 'Arrays.fill', type: 'function', info: 'Fill array with value' },
  { label: 'Arrays.copyOf', type: 'function', info: 'Copy array' },
  { label: 'Arrays.toString', type: 'function', info: 'Convert array to string' },
  { label: 'Math.max', type: 'function', info: 'Maximum of two numbers' },
  { label: 'Math.min', type: 'function', info: 'Minimum of two numbers' },
  { label: 'Math.abs', type: 'function', info: 'Absolute value' },
  { label: 'Math.pow', type: 'function', info: 'Power function' },
  { label: 'Math.sqrt', type: 'function', info: 'Square root' },
  { label: 'Math.ceil', type: 'function', info: 'Ceiling function' },
  { label: 'Math.floor', type: 'function', info: 'Floor function' },
  { label: 'Math.round', type: 'function', info: 'Round to nearest integer' },
  { label: 'Math.random', type: 'function', info: 'Random number generator' },
  
  // String methods
  { label: 'length', type: 'function', info: 'String length' },
  { label: 'charAt', type: 'function', info: 'Character at index' },
  { label: 'substring', type: 'function', info: 'Extract substring' },
  { label: 'indexOf', type: 'function', info: 'Find index of character/string' },
  { label: 'contains', type: 'function', info: 'Check if contains substring' },
  { label: 'startsWith', type: 'function', info: 'Check if starts with prefix' },
  { label: 'endsWith', type: 'function', info: 'Check if ends with suffix' },
  { label: 'toLowerCase', type: 'function', info: 'Convert to lowercase' },
  { label: 'toUpperCase', type: 'function', info: 'Convert to uppercase' },
  { label: 'trim', type: 'function', info: 'Remove leading/trailing whitespace' },
  { label: 'split', type: 'function', info: 'Split string into array' },
  { label: 'replace', type: 'function', info: 'Replace characters/strings' },
  
  // Collection methods
  { label: 'add', type: 'function', info: 'Add element' },
  { label: 'remove', type: 'function', info: 'Remove element' },
  { label: 'contains', type: 'function', info: 'Check if contains element' },
  { label: 'size', type: 'function', info: 'Get size/length' },
  { label: 'isEmpty', type: 'function', info: 'Check if empty' },
  { label: 'clear', type: 'function', info: 'Clear all elements' },
  { label: 'get', type: 'function', info: 'Get element at index' },
  { label: 'set', type: 'function', info: 'Set element at index' },
  { label: 'put', type: 'function', info: 'Put key-value pair' },
  { label: 'containsKey', type: 'function', info: 'Check if map contains key' },
  { label: 'containsValue', type: 'function', info: 'Check if map contains value' },
  { label: 'keySet', type: 'function', info: 'Get set of keys' },
  { label: 'values', type: 'function', info: 'Get collection of values' },
  { label: 'entrySet', type: 'function', info: 'Get set of entries' },
  
  // Input/Output
  { label: 'System.out.println', type: 'function', info: 'Print line to console' },
  { label: 'System.out.print', type: 'function', info: 'Print to console' },
  { label: 'Scanner', type: 'type', info: 'Input scanner class' },
  { label: 'BufferedReader', type: 'type', info: 'Buffered input reader' },
  { label: 'PrintWriter', type: 'type', info: 'Print writer for output' },
  
  // Imports
  { label: 'import java.util.*;', type: 'snippet', info: 'Import all util classes' },
  { label: 'import java.io.*;', type: 'snippet', info: 'Import all I/O classes' },
  { label: 'import java.util.Scanner;', type: 'snippet', info: 'Import Scanner class' },
  { label: 'import java.util.ArrayList;', type: 'snippet', info: 'Import ArrayList' },
  { label: 'import java.util.HashMap;', type: 'snippet', info: 'Import HashMap' },
  { label: 'import java.util.HashSet;', type: 'snippet', info: 'Import HashSet' },
];

const pythonCompletions = [
  // Built-in types
  { label: 'list', type: 'type', info: 'Mutable sequence', apply: 'list()' },
  { label: 'dict', type: 'type', info: 'Dictionary/hash map', apply: 'dict()' },
  { label: 'set', type: 'type', info: 'Unordered unique elements', apply: 'set()' },
  { label: 'tuple', type: 'type', info: 'Immutable sequence', apply: 'tuple()' },
  { label: 'str', type: 'type', info: 'String type' },
  { label: 'int', type: 'type', info: 'Integer type' },
  { label: 'float', type: 'type', info: 'Float type' },
  { label: 'bool', type: 'type', info: 'Boolean type' },
  { label: 'frozenset', type: 'type', info: 'Immutable set' },
  { label: 'bytes', type: 'type', info: 'Bytes type' },
  { label: 'bytearray', type: 'type', info: 'Mutable bytes' },
  
  // Collections module
  { label: 'defaultdict', type: 'type', info: 'Dict with default factory', apply: 'defaultdict(int)' },
  { label: 'Counter', type: 'type', info: 'Dict for counting', apply: 'Counter()' },
  { label: 'deque', type: 'type', info: 'Double-ended queue', apply: 'deque()' },
  { label: 'OrderedDict', type: 'type', info: 'Ordered dictionary', apply: 'OrderedDict()' },
  { label: 'namedtuple', type: 'function', info: 'Named tuple factory' },
  
  // Snippets
  { 
    label: 'forloop', 
    type: 'snippet',
    apply: 'for i in range(n):\n    ',
    info: 'Standard for loop'
  },
  { 
    label: 'forin', 
    type: 'snippet',
    apply: 'for item in items:\n    ',
    info: 'For-in loop'
  },
  { 
    label: 'forrange', 
    type: 'snippet',
    apply: 'for i in range(start, end):\n    ',
    info: 'For loop with range'
  },
  { 
    label: 'ifelse', 
    type: 'snippet',
    apply: 'if condition:\n    \nelse:\n    ',
    info: 'If-else statement'
  },
  { 
    label: 'while', 
    type: 'snippet',
    apply: 'while condition:\n    ',
    info: 'While loop'
  },
  { 
    label: 'tryexcept', 
    type: 'snippet',
    apply: 'try:\n    \nexcept Exception as e:\n    ',
    info: 'Try-except block'
  },
  { 
    label: 'function', 
    type: 'snippet',
    apply: 'def function_name(param):\n    return result',
    info: 'Function definition'
  },
  { 
    label: 'class', 
    type: 'snippet',
    apply: 'class ClassName:\n    def __init__(self):\n        pass',
    info: 'Class definition'
  },
  { 
    label: 'ifmain', 
    type: 'snippet',
    apply: 'if __name__ == "__main__":\n    ',
    info: 'Main guard'
  },
  { 
    label: 'listcomp', 
    type: 'snippet',
    apply: '[x for x in iterable if condition]',
    info: 'List comprehension'
  },
  { 
    label: 'dictcomp', 
    type: 'snippet',
    apply: '{k: v for k, v in items.items()}',
    info: 'Dict comprehension'
  },
  
  // Functions
  { label: 'len', type: 'function', info: 'Length of sequence' },
  { label: 'max', type: 'function', info: 'Maximum value' },
  { label: 'min', type: 'function', info: 'Minimum value' },
  { label: 'sum', type: 'function', info: 'Sum of iterable' },
  { label: 'sorted', type: 'function', info: 'Return sorted list' },
  { label: 'reversed', type: 'function', info: 'Return reversed iterator' },
  { label: 'enumerate', type: 'function', info: 'Return enumerated pairs' },
  { label: 'zip', type: 'function', info: 'Combine iterables' },
  { label: 'map', type: 'function', info: 'Apply function to iterable' },
  { label: 'filter', type: 'function', info: 'Filter iterable' },
  { label: 'any', type: 'function', info: 'True if any element is true' },
  { label: 'all', type: 'function', info: 'True if all elements are true' },
  { label: 'range', type: 'function', info: 'Generate range of numbers' },
  { label: 'abs', type: 'function', info: 'Absolute value' },
  { label: 'round', type: 'function', info: 'Round to nearest integer' },
  { label: 'pow', type: 'function', info: 'Power function' },
  { label: 'divmod', type: 'function', info: 'Division and modulo' },
  { label: 'isinstance', type: 'function', info: 'Check instance type' },
  { label: 'hasattr', type: 'function', info: 'Check if has attribute' },
  { label: 'getattr', type: 'function', info: 'Get attribute value' },
  { label: 'setattr', type: 'function', info: 'Set attribute value' },
  
  // String methods
  { label: 'split', type: 'function', info: 'Split string' },
  { label: 'join', type: 'function', info: 'Join strings' },
  { label: 'strip', type: 'function', info: 'Remove whitespace' },
  { label: 'replace', type: 'function', info: 'Replace substring' },
  { label: 'find', type: 'function', info: 'Find substring index' },
  { label: 'count', type: 'function', info: 'Count occurrences' },
  { label: 'startswith', type: 'function', info: 'Check if starts with' },
  { label: 'endswith', type: 'function', info: 'Check if ends with' },
  { label: 'lower', type: 'function', info: 'Convert to lowercase' },
  { label: 'upper', type: 'function', info: 'Convert to uppercase' },
  { label: 'isdigit', type: 'function', info: 'Check if all digits' },
  { label: 'isalpha', type: 'function', info: 'Check if all letters' },
  { label: 'isalnum', type: 'function', info: 'Check if alphanumeric' },
  
  // List methods
  { label: 'append', type: 'function', info: 'Add element to end' },
  { label: 'insert', type: 'function', info: 'Insert element at index' },
  { label: 'remove', type: 'function', info: 'Remove first occurrence' },
  { label: 'pop', type: 'function', info: 'Remove and return element' },
  { label: 'index', type: 'function', info: 'Find index of element' },
  { label: 'sort', type: 'function', info: 'Sort list in place' },
  { label: 'reverse', type: 'function', info: 'Reverse list in place' },
  { label: 'extend', type: 'function', info: 'Extend list with iterable' },
  { label: 'clear', type: 'function', info: 'Remove all elements' },
  { label: 'copy', type: 'function', info: 'Shallow copy of list' },
  
  // Dict methods
  { label: 'keys', type: 'function', info: 'Get dictionary keys' },
  { label: 'values', type: 'function', info: 'Get dictionary values' },
  { label: 'items', type: 'function', info: 'Get key-value pairs' },
  { label: 'get', type: 'function', info: 'Get value with default' },
  { label: 'setdefault', type: 'function', info: 'Get or set default value' },
  { label: 'update', type: 'function', info: 'Update dictionary' },
  
  // Set methods
  { label: 'add', type: 'function', info: 'Add element to set' },
  { label: 'discard', type: 'function', info: 'Remove element if present' },
  { label: 'union', type: 'function', info: 'Union of sets' },
  { label: 'intersection', type: 'function', info: 'Intersection of sets' },
  { label: 'difference', type: 'function', info: 'Difference of sets' },
  
  // Imports
  { label: 'import sys', type: 'snippet', info: 'Import sys module' },
  { label: 'import math', type: 'snippet', info: 'Import math module' },
  { label: 'import random', type: 'snippet', info: 'Import random module' },
  { label: 'import collections', type: 'snippet', info: 'Import collections module' },
  { label: 'import itertools', type: 'snippet', info: 'Import itertools module' },
  { label: 'import heapq', type: 'snippet', info: 'Import heapq module' },
  { label: 'import bisect', type: 'snippet', info: 'Import bisect module' },
  { label: 'from collections import defaultdict', type: 'snippet', info: 'Import defaultdict' },
  { label: 'from collections import Counter', type: 'snippet', info: 'Import Counter' },
  { label: 'from collections import deque', type: 'snippet', info: 'Import deque' },
];

// Variable tracking for reusability
const userDefinedVariables = new Map<string, Set<string>>();

// Extract variables from code
const extractVariables = (code: string, language: string): string[] => {
  const variables: string[] = [];
  
  if (language.toLowerCase() === 'cpp' || language.toLowerCase() === 'c++') {
    // Match C++ variable declarations: type varname
    const cppPatterns = [
      /\b(?:int|long|double|float|char|string|bool|auto)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      /\b(?:vector|map|set|unordered_map|unordered_set|queue|stack|priority_queue|deque|list|pair|tuple)\s*<[^>]*>\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      /\bfor\s*\(\s*(?:int|auto)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g, // for loop variables
    ];
    
    cppPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        if (match[1] && match[1].length > 1) {
          variables.push(match[1]);
        }
      }
    });
  } else if (language.toLowerCase() === 'java') {
    // Match Java variable declarations
    const javaPatterns = [
      /\b(?:int|long|double|float|char|String|boolean)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      /\b(?:ArrayList|HashMap|HashSet|TreeMap|TreeSet|PriorityQueue|LinkedList|List|Set|Map)\s*<[^>]*>\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
      /\bfor\s*\(\s*(?:int|String)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g,
    ];
    
    javaPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        if (match[1] && match[1].length > 1) {
          variables.push(match[1]);
        }
      }
    });
  } else if (language.toLowerCase() === 'python' || language.toLowerCase() === 'py') {
    // Match Python variable assignments
    const pythonPatterns = [
      /^[ \t]*([a-zA-Z_][a-zA-Z0-9_]*)\s*=/gm, // variable = value
      /\bfor\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in/g, // for var in
      /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, // function definitions
    ];
    
    pythonPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(code)) !== null) {
        if (match[1] && match[1].length > 1 && 
            !['if', 'else', 'elif', 'for', 'while', 'def', 'class', 'import', 'from', 'try', 'except', 'finally', 'with', 'as'].includes(match[1])) {
          variables.push(match[1]);
        }
      }
    });
  }
  
  return [...new Set(variables)]; // Remove duplicates
};

const getCompletions = (language: string, currentCode?: string) => {
  const baseCompletions = (() => {
    switch (language.toLowerCase()) {
      case 'cpp':
      case 'c++':
        return cppCompletions;
      case 'java':
        return javaCompletions;
      case 'python':
      case 'py':
        return pythonCompletions;
      default:
        return cppCompletions;
    }
  })();

  // Extract user-defined variables from current code
  const userVariables: Array<{label: string, type: string, info: string}> = [];
  if (currentCode) {
    const variables = extractVariables(currentCode, language);
    variables.forEach(variable => {
      userVariables.push({
        label: variable,
        type: 'variable',
        info: `User-defined variable: ${variable}`
      });
    });
    
    // Store in global map for persistence
    const languageKey = language.toLowerCase();
    if (!userDefinedVariables.has(languageKey)) {
      userDefinedVariables.set(languageKey, new Set());
    }
    variables.forEach(variable => {
      userDefinedVariables.get(languageKey)?.add(variable);
    });
  }

  // Add previously defined variables from storage
  const storedVariables: Array<{label: string, type: string, info: string}> = [];
  const languageKey = language.toLowerCase();
  if (userDefinedVariables.has(languageKey)) {
    userDefinedVariables.get(languageKey)?.forEach(variable => {
      if (!userVariables.some(v => v.label === variable)) {
        storedVariables.push({
          label: variable,
          type: 'variable',
          info: `Previously used variable: ${variable}`
        });
      }
    });
  }

  return [...baseCompletions, ...userVariables, ...storedVariables];
};

const CodeMirrorEditor: React.FC<CodeMirrorEditorProps> = ({
  value,
  onChange,
  language,
  disabled = false,
  className = '',
  contestMode = false,
  height = '400px',
  settings = {}, // Add settings prop
}) => {
  const { isDark } = useTheme();
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isInitializedRef = useRef(false);
  
  // Merge user settings with defaults
  const editorSettings = { ...DEFAULT_SETTINGS, ...settings };

  const customCompletions = useCallback(() => {
    return autocompletion({
      activateOnTyping: true,
      maxRenderedOptions: 30,
      defaultKeymap: true,
      closeOnBlur: false,
      override: [
        (context) => {
          // Match word characters or trigger on explicit completion
          const word = context.matchBefore(/\w+/);
          
          // If no word and not explicit, don't show completions
          if (!word && !context.explicit) return null;
          
          // If we have a word but it's empty and not explicit, don't show completions
          if (word && word.from === word.to && !context.explicit) return null;
          
          const from = word ? word.from : context.pos;
          const to = word ? word.to : context.pos;
          
          // Get current document content for variable extraction
          const currentCode = context.state.doc.toString();
          const completions = getCompletions(language, currentCode);
          
          return {
            from,
            to,
            options: completions.map(completion => ({
              label: completion.label,
              type: completion.type,
              apply: (completion as any).apply || completion.label,
              info: completion.info,
              detail: completion.type,
              boost: completion.type === 'snippet' ? 10 : 
                     completion.type === 'variable' ? 8 : 0,
            })),
            validFor: /^\w*$/,
            span: /^\w*$/
          };
        }
      ]
    });
  }, [language]);

  // Custom Tab handler for consistent indentation
  const customTabKeymap = [
    {
      key: "Tab",
      run: (view: EditorView) => {
        const { state } = view;
        const { head } = state.selection.main;
        const tabString = editorSettings.insertSpaces 
          ? ' '.repeat(editorSettings.tabSize) 
          : '\t';
          
        view.dispatch({
          changes: { from: head, to: head, insert: tabString },
          selection: EditorSelection.cursor(head + tabString.length),
          scrollIntoView: true,
        });
        return true;
      }
    }
  ];

  const createEditorState = useCallback(() => {
    const extensions: Extension[] = [
      basicSetup,
      getLanguageExtension(language),
      customCompletions(),
      keymap.of([
        ...customTabKeymap,
        ...defaultKeymap,
        ...completionKeymap,
        ...searchKeymap,
        indentWithTab,
      ]),
      EditorView.theme({
        '&': {
          height: height,
          fontSize: `${editorSettings.fontSize}px`,
          fontFamily: '"Fira Code", "JetBrains Mono", monospace',
        },
        '.cm-editor': {
          height: '100%',
        },
        '.cm-scroller': {
          height: '100%',
        },
        '.cm-content': {
          padding: '16px',
          minHeight: '100%',
          whiteSpace: editorSettings.wordWrap ? 'pre-wrap' : 'pre',
          tabSize: editorSettings.tabSize, // Set tab size
        },
        '.cm-focused': {
          outline: 'none',
        },
        '.cm-editor.cm-focused': {
          outline: 'none',
        },
        '.cm-tooltip': {
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          backgroundColor: isDark ? '#374151' : '#ffffff',
          color: isDark ? '#ffffff' : '#000000',
        },
        '.cm-tooltip-autocomplete': {
          '& > ul': {
            maxHeight: '200px',
          },
          '& > ul > li': {
            padding: '4px 8px',
          },
          '& > ul > li[aria-selected]': {
            backgroundColor: isDark ? '#4f46e5' : '#3b82f6',
            color: '#ffffff',
          }
        },
        '.cm-completionIcon': {
          fontSize: '16px',
          width: '16px',
          height: '16px',
          marginRight: '8px',
        },
        '.cm-completionIcon-type': {
          '&:after': { content: '"T"', color: '#007acc' }
        },
        '.cm-completionIcon-function': {
          '&:after': { content: '"F"', color: '#652d90' }
        },
        '.cm-completionIcon-variable': {
          '&:after': { content: '"V"', color: '#10b981' }
        },
        '.cm-completionIcon-snippet': {
          '&:after': { content: '"S"', color: '#007acc' }
        },
      }),
      // Configure indentation
      indentUnit.of(' '.repeat(editorSettings.tabSize)),
      EditorView.updateListener.of((update: any) => {
        if (update.docChanged && !disabled) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
      }),
    ];

    // Add line numbers based on settings
    if (editorSettings.lineNumbers) {
      extensions.push(lineNumbers());
    }

    // Add dark theme if needed
    if (isDark) {
      extensions.push(oneDark);
    }

    // Contest mode modifications
    if (contestMode) {
      extensions.push(
        EditorView.domEventHandlers({
          paste: () => {
            alert('Pasting is disabled in contest mode!');
            return true; // Prevent default paste
          },
          contextmenu: () => {
            return true; // Disable right-click menu
          }
        })
      );
    }

    // Disable editor if needed
    if (disabled) {
      extensions.push(EditorState.readOnly.of(true));
    }

    return EditorState.create({
      doc: value,
      extensions,
    });
  }, [language, disabled, contestMode, isDark, editorSettings, height]);

  // Initialize editor only once
  useEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const state = createEditorState();
    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    isInitializedRef.current = true;

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
        viewRef.current = null;
      }
      isInitializedRef.current = false;
    };
  }, []);

  // Update editor configuration when dependencies change (but not on every render)
  useEffect(() => {
    if (!viewRef.current || !isInitializedRef.current) return;

    // For major configuration changes, we need to recreate the editor
    // but we'll try to preserve the cursor position and content
    const currentDoc = viewRef.current.state.doc.toString();
    const currentSelection = viewRef.current.state.selection;
    const cursorPos = currentSelection.main.head;

    // Destroy current editor
    viewRef.current.destroy();
    viewRef.current = null;

    // Create new editor state with preserved content and cursor position
    const state = EditorState.create({
      doc: currentDoc,
      extensions: (() => {
        const extensions: Extension[] = [
          basicSetup,
          getLanguageExtension(language),
          customCompletions(),
          keymap.of([
            ...customTabKeymap,
            ...defaultKeymap,
            ...completionKeymap,
            ...searchKeymap,
            indentWithTab,
          ]),
          EditorView.theme({
            '&': {
              height: height,
              fontSize: `${editorSettings.fontSize}px`,
              fontFamily: '"Fira Code", "JetBrains Mono", monospace',
            },
            '.cm-editor': {
              height: '100%',
            },
            '.cm-scroller': {
              height: '100%',
            },
            '.cm-content': {
              padding: '16px',
              minHeight: '100%',
              whiteSpace: editorSettings.wordWrap ? 'pre-wrap' : 'pre',
              tabSize: editorSettings.tabSize,
            },
            '.cm-focused': {
              outline: 'none',
            },
            '.cm-editor.cm-focused': {
              outline: 'none',
            },
            '.cm-tooltip': {
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              backgroundColor: isDark ? '#374151' : '#ffffff',
              color: isDark ? '#ffffff' : '#000000',
            },
            '.cm-tooltip-autocomplete': {
              '& > ul': {
                maxHeight: '200px',
              },
              '& > ul > li': {
                padding: '4px 8px',
              },
              '& > ul > li[aria-selected]': {
                backgroundColor: isDark ? '#4f46e5' : '#3b82f6',
                color: '#ffffff',
              }
            },
            '.cm-completionIcon': {
              fontSize: '16px',
              width: '16px',
              height: '16px',
              marginRight: '8px',
            },
            '.cm-completionIcon-type': {
              '&:after': { content: '"T"', color: '#007acc' }
            },
            '.cm-completionIcon-function': {
              '&:after': { content: '"F"', color: '#652d90' }
            },
            '.cm-completionIcon-variable': {
              '&:after': { content: '"V"', color: '#10b981' }
            },
            '.cm-completionIcon-snippet': {
              '&:after': { content: '"S"', color: '#007acc' }
            },
          }),
          indentUnit.of(' '.repeat(editorSettings.tabSize)),
          EditorView.updateListener.of((update: any) => {
            if (update.docChanged && !disabled) {
              const newValue = update.state.doc.toString();
              onChange(newValue);
            }
          }),
        ];

        if (editorSettings.lineNumbers) {
          extensions.push(lineNumbers());
        }

        if (isDark) {
          extensions.push(oneDark);
        }

        if (contestMode) {
          extensions.push(
            EditorView.domEventHandlers({
              paste: () => {
                alert('Pasting is disabled in contest mode!');
                return true;
              },
              contextmenu: () => {
                return true;
              }
            })
          );
        }

        if (disabled) {
          extensions.push(EditorState.readOnly.of(true));
        }

        return extensions;
      })(),
      selection: EditorSelection.cursor(Math.min(cursorPos, currentDoc.length)),
    });

    const view = new EditorView({
      state,
      parent: editorRef.current!,
    });

    viewRef.current = view;
  }, [language, disabled, contestMode, isDark, JSON.stringify(editorSettings), height, customCompletions, onChange]);

  useEffect(() => {
    // Update editor content when value changes externally
    if (viewRef.current) {
      const currentDoc = viewRef.current.state.doc.toString();
      if (currentDoc !== value) {
        // Only update if the change is not from user input
        // This prevents cursor jumping during typing
        const isUserInput = viewRef.current.hasFocus;
        
        if (!isUserInput) {
          // Store current cursor position
          const currentSelection = viewRef.current.state.selection;
          const cursorPos = Math.min(currentSelection.main.head, value.length);
          
          const transaction = viewRef.current.state.update({
            changes: {
              from: 0,
              to: viewRef.current.state.doc.length,
              insert: value,
            },
            selection: EditorSelection.cursor(cursorPos), // Restore cursor position
            scrollIntoView: true,
          });
          viewRef.current.dispatch(transaction);
        }
      }
    }
  }, [value]);

  return (
    <div className={`relative border rounded-lg overflow-hidden ${
      isDark 
        ? 'border-gray-600 bg-gray-800' 
        : 'border-gray-300 bg-white'
    } ${className}`}>
      {/* Editor Header */}
      <div className={`flex items-center justify-between px-4 py-2 border-b ${
        isDark 
          ? 'border-gray-600 bg-gray-700' 
          : 'border-gray-300 bg-gray-50'
      }`}>
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-1 rounded text-xs font-medium ${
            isDark 
              ? 'bg-blue-600 text-white' 
              : 'bg-blue-100 text-blue-800'
          }`}>
            {language.toUpperCase()}
          </div>
          {contestMode && (
            <div className={`px-2 py-1 rounded text-xs font-medium ${
              isDark 
                ? 'bg-red-600 text-white' 
                : 'bg-red-100 text-red-800'
            }`}>
              CONTEST MODE
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span>Ctrl+Space for completions</span>
          <span>•</span>
          <span>Ctrl+F for search</span>
        </div>
      </div>
      
      {/* Editor Container */}
      <div 
        ref={editorRef} 
        className="w-full"
        style={{ height }}
      />
      
      {/* Status Bar */}
      <div className={`flex items-center justify-between px-4 py-1 text-xs border-t ${
        isDark 
          ? 'border-gray-600 bg-gray-700 text-gray-300' 
          : 'border-gray-300 bg-gray-50 text-gray-600'
      }`}>
        <div className="flex items-center space-x-4">
          <span>Lines: {value.split('\n').length}</span>
          <span>Characters: {value.length}</span>
        </div>
        <div className="flex items-center space-x-2">
          {!disabled && (
            <span className="text-green-500">● Ready</span>
          )}
          {disabled && (
            <span className="text-gray-500">● Read Only</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeMirrorEditor;
