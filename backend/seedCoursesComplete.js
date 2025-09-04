import './loadenv.js';
import mongoose from 'mongoose';
import Course from './models/Course.js';
import Module from './models/Module.js';
import Chapter from './models/Chapter.js';
import Quiz from './models/Quiz.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/building-wonders';

async function seedCourses() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Course.deleteMany({});
    await Module.deleteMany({});
    await Chapter.deleteMany({});
    await Quiz.deleteMany({});

    // ====== COURSE 1: Modern JavaScript ======
    const course1 = await Course.create({
      title: 'Modern JavaScript from the Beginning',
      description: 'Learn modern JavaScript concepts including ES6+ features, asynchronous programming, DOM manipulation, and more. This course will take you from the basics to advanced JavaScript concepts.',
      thumbnail: '/javascript-course.jpg',
      instructor: 'John Doe',
      duration: '12 hours',
      level: 'Intermediate',
      published: true,
      tags: ['JavaScript', 'Web Development', 'Frontend'],
      rating: 4.8,
      ratingCount: 120
    });

    console.log('Created course:', course1.title);

    // Course 1 - Module 1
    const course1Module1 = await Module.create({
      title: 'JavaScript Fundamentals',
      description: 'Learn the core concepts of JavaScript programming language',
      course: course1._id,
      order: 1,
      published: true
    });

    // Course 1 - Module 2
    const course1Module2 = await Module.create({
      title: 'DOM Manipulation & Events',
      description: 'Learn how to interact with the Document Object Model',
      course: course1._id,
      order: 2,
      published: true
    });

    // Course 1 - Module 3
    const course1Module3 = await Module.create({
      title: 'Asynchronous JavaScript',
      description: 'Master async/await, promises, and callback patterns',
      course: course1._id,
      order: 3,
      published: true
    });

    console.log('Created modules for JavaScript course');

    // ====== COURSE 2: Data Structures & Algorithms ======
    const course2 = await Course.create({
      title: 'Complete Data Structures & Algorithms',
      description: 'Master data structures and algorithms from basics to advanced. Learn arrays, linked lists, trees, graphs, sorting, searching, and dynamic programming.',
      thumbnail: '/dsa-course.jpg',
      instructor: 'Sarah Johnson',
      duration: '20 hours',
      level: 'Advanced',
      published: true,
      tags: ['DSA', 'Programming', 'Algorithms', 'Interview Prep'],
      rating: 4.9,
      ratingCount: 250
    });

    console.log('Created course:', course2.title);

    // Course 2 - Module 1
    const course2Module1 = await Module.create({
      title: 'Basic Data Structures',
      description: 'Learn arrays, linked lists, stacks, and queues',
      course: course2._id,
      order: 1,
      published: true
    });

    // Course 2 - Module 2
    const course2Module2 = await Module.create({
      title: 'Trees and Graphs',
      description: 'Master tree structures, binary trees, BST, and graph algorithms',
      course: course2._id,
      order: 2,
      published: true
    });

    // Course 2 - Module 3
    const course2Module3 = await Module.create({
      title: 'Sorting & Searching Algorithms',
      description: 'Implement and understand various sorting and searching techniques',
      course: course2._id,
      order: 3,
      published: true
    });

    console.log('Created modules for DSA course');

    // ============= CHAPTERS FOR COURSE 1 =============

    // Course 1, Module 1 - Chapters
    const c1m1ch1 = await Chapter.create({
      title: 'Variables & Data Types',
      module: course1Module1._id,
      order: 1,
      type: 'article',
      content: `# Variables and Data Types in JavaScript

JavaScript has several data types that you should be familiar with:

## Primitive Data Types

### 1. String
\`\`\`javascript
let name = "John Doe";
let message = 'Hello World';
let template = \`Welcome \${name}\`;
\`\`\`

### 2. Number
\`\`\`javascript
let age = 30;
let price = 19.99;
let infinity = Infinity;
let notANumber = NaN;
\`\`\`

### 3. Boolean
\`\`\`javascript
let isActive = true;
let isCompleted = false;
\`\`\`

### 4. Undefined
\`\`\`javascript
let job;
console.log(job); // undefined
\`\`\`

### 5. Null
\`\`\`javascript
let selectedColor = null;
\`\`\`

### 6. Symbol (ES6)
\`\`\`javascript
let id = Symbol('id');
let id2 = Symbol('id');
console.log(id === id2); // false
\`\`\`

### 7. BigInt
\`\`\`javascript
let bigNumber = 1234567890123456789012345678901234567890n;
\`\`\`

## Reference Data Types

### Objects
\`\`\`javascript
let person = {
  firstName: "John",
  lastName: "Doe",
  age: 30,
  greet: function() {
    return \`Hello, I'm \${this.firstName}\`;
  }
};
\`\`\`

### Arrays
\`\`\`javascript
let fruits = ["Apple", "Banana", "Orange"];
let numbers = [1, 2, 3, 4, 5];
let mixed = ["Hello", 42, true, null];
\`\`\`

## Variable Declarations

### var (Function Scoped)
\`\`\`javascript
var x = 10;
function example() {
  var y = 20; // Function scoped
  if (true) {
    var z = 30; // Still function scoped
  }
  console.log(z); // 30 (accessible)
}
\`\`\`

### let (Block Scoped)
\`\`\`javascript
let a = 10;
if (true) {
  let b = 20; // Block scoped
  console.log(a); // 10
}
// console.log(b); // ReferenceError
\`\`\`

### const (Block Scoped, Immutable)
\`\`\`javascript
const PI = 3.14159;
// PI = 3.14; // TypeError

const colors = ["red", "green", "blue"];
colors.push("yellow"); // This works
// colors = []; // TypeError
\`\`\``,
      published: true,
      duration: 15
    });

    const c1m1ch2 = await Chapter.create({
      title: 'Functions & Scope',
      module: course1Module1._id,
      order: 2,
      type: 'article',
      content: `# Functions and Scope in JavaScript

## Function Declarations

### Regular Function
\`\`\`javascript
function greet(name) {
  return "Hello " + name;
}

console.log(greet("John")); // "Hello John"
\`\`\`

### Function Expression
\`\`\`javascript
const multiply = function(a, b) {
  return a * b;
};

console.log(multiply(5, 3)); // 15
\`\`\`

### Arrow Functions (ES6)
\`\`\`javascript
const add = (a, b) => a + b;
const square = x => x * x;
const sayHello = () => "Hello!";

console.log(add(2, 3)); // 5
console.log(square(4)); // 16
console.log(sayHello()); // "Hello!"
\`\`\`

## Function Parameters

### Default Parameters
\`\`\`javascript
function greet(name = "Guest") {
  return \`Hello \${name}\`;
}

console.log(greet()); // "Hello Guest"
console.log(greet("Alice")); // "Hello Alice"
\`\`\`

### Rest Parameters
\`\`\`javascript
function sum(...numbers) {
  return numbers.reduce((total, num) => total + num, 0);
}

console.log(sum(1, 2, 3, 4)); // 10
\`\`\`

## Scope

### Global Scope
\`\`\`javascript
var globalVar = "I'm global";

function example() {
  console.log(globalVar); // Accessible
}
\`\`\`

### Function Scope
\`\`\`javascript
function outer() {
  var functionScoped = "I'm function scoped";
  
  function inner() {
    console.log(functionScoped); // Accessible
  }
  
  inner();
}
\`\`\`

### Block Scope
\`\`\`javascript
if (true) {
  let blockScoped = "I'm block scoped";
  const alsoBlockScoped = "Me too";
}
// console.log(blockScoped); // ReferenceError
\`\`\`

## Closures
\`\`\`javascript
function createCounter() {
  let count = 0;
  
  return function() {
    count++;
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
console.log(counter()); // 3
\`\`\``,
      published: true,
      duration: 20
    });

    // Course 1, Module 2 - Chapters
    const c1m2ch1 = await Chapter.create({
      title: 'DOM Selection & Manipulation',
      module: course1Module2._id,
      order: 1,
      type: 'article',
      content: `# DOM Selection and Manipulation

## Selecting Elements

### getElementById
\`\`\`javascript
const element = document.getElementById('myId');
\`\`\`

### querySelector (CSS Selectors)
\`\`\`javascript
const element = document.querySelector('.my-class');
const element2 = document.querySelector('#my-id');
const element3 = document.querySelector('div.container > p');
\`\`\`

### querySelectorAll
\`\`\`javascript
const elements = document.querySelectorAll('.item');
elements.forEach(el => {
  console.log(el.textContent);
});
\`\`\`

### Other Selection Methods
\`\`\`javascript
const byClass = document.getElementsByClassName('my-class');
const byTag = document.getElementsByTagName('div');
const byName = document.getElementsByName('username');
\`\`\`

## Modifying Content

### textContent vs innerHTML
\`\`\`javascript
const element = document.querySelector('#content');

// textContent - safe, no HTML parsing
element.textContent = 'Hello World';

// innerHTML - parses HTML
element.innerHTML = '<strong>Hello World</strong>';
\`\`\`

### Attributes
\`\`\`javascript
const img = document.querySelector('img');

// Get attribute
const src = img.getAttribute('src');

// Set attribute
img.setAttribute('alt', 'Description');

// Remove attribute
img.removeAttribute('title');

// Direct property access
img.src = 'new-image.jpg';
img.className = 'new-class';
\`\`\`

## Styling Elements

### CSS Classes
\`\`\`javascript
const element = document.querySelector('.my-element');

// Add class
element.classList.add('active');

// Remove class
element.classList.remove('hidden');

// Toggle class
element.classList.toggle('visible');

// Check if class exists
if (element.classList.contains('active')) {
  console.log('Element is active');
}
\`\`\`

### Inline Styles
\`\`\`javascript
const element = document.querySelector('#box');

element.style.backgroundColor = 'red';
element.style.width = '100px';
element.style.height = '100px';
element.style.display = 'none';
\`\`\`

## Creating and Adding Elements

\`\`\`javascript
// Create element
const newDiv = document.createElement('div');
newDiv.textContent = 'I am new!';
newDiv.className = 'new-element';

// Add to DOM
document.body.appendChild(newDiv);

// Insert before another element
const existingElement = document.querySelector('#existing');
document.body.insertBefore(newDiv, existingElement);
\`\`\``,
      published: true,
      duration: 25
    });

    const c1m2ch2 = await Chapter.create({
      title: 'Event Handling',
      module: course1Module2._id,
      order: 2,
      type: 'article',
      content: `# Event Handling in JavaScript

## Adding Event Listeners

### addEventListener Method
\`\`\`javascript
const button = document.querySelector('#myButton');

button.addEventListener('click', function() {
  alert('Button clicked!');
});

// Using arrow function
button.addEventListener('click', () => {
  console.log('Button was clicked');
});
\`\`\`

### Multiple Event Listeners
\`\`\`javascript
const input = document.querySelector('#username');

input.addEventListener('focus', () => {
  console.log('Input focused');
});

input.addEventListener('blur', () => {
  console.log('Input lost focus');
});

input.addEventListener('input', (e) => {
  console.log('Value:', e.target.value);
});
\`\`\`

## Common Events

### Mouse Events
\`\`\`javascript
element.addEventListener('click', handleClick);
element.addEventListener('dblclick', handleDoubleClick);
element.addEventListener('mouseenter', handleMouseEnter);
element.addEventListener('mouseleave', handleMouseLeave);
element.addEventListener('mouseover', handleMouseOver);
\`\`\`

### Keyboard Events
\`\`\`javascript
document.addEventListener('keydown', (e) => {
  console.log('Key pressed:', e.key);
  
  if (e.key === 'Enter') {
    console.log('Enter key pressed');
  }
  
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    console.log('Ctrl+S pressed');
  }
});
\`\`\`

### Form Events
\`\`\`javascript
const form = document.querySelector('#myForm');

form.addEventListener('submit', (e) => {
  e.preventDefault(); // Prevent default form submission
  
  const formData = new FormData(form);
  const data = Object.fromEntries(formData);
  
  console.log('Form data:', data);
});
\`\`\`

## Event Object

\`\`\`javascript
button.addEventListener('click', (event) => {
  console.log('Event type:', event.type);
  console.log('Target element:', event.target);
  console.log('Current target:', event.currentTarget);
  console.log('Mouse position:', event.clientX, event.clientY);
  
  // Prevent default behavior
  event.preventDefault();
  
  // Stop event propagation
  event.stopPropagation();
});
\`\`\`

## Event Delegation

\`\`\`javascript
// Instead of adding listeners to each button
const container = document.querySelector('#button-container');

container.addEventListener('click', (e) => {
  if (e.target.matches('button')) {
    console.log('Button clicked:', e.target.textContent);
  }
});
\`\`\`

## Removing Event Listeners

\`\`\`javascript
function handleClick() {
  console.log('Clicked');
}

// Add listener
button.addEventListener('click', handleClick);

// Remove listener
button.removeEventListener('click', handleClick);
\`\`\``,
      published: true,
      duration: 20
    });

    // Course 1, Module 3 - Chapters
    const c1m3ch1 = await Chapter.create({
      title: 'Promises & Async/Await',
      module: course1Module3._id,
      order: 1,
      type: 'article',
      content: `# Promises and Async/Await

## Understanding Promises

### Creating a Promise
\`\`\`javascript
const myPromise = new Promise((resolve, reject) => {
  const success = true;
  
  if (success) {
    resolve('Operation successful!');
  } else {
    reject('Operation failed!');
  }
});
\`\`\`

### Using Promises
\`\`\`javascript
myPromise
  .then(result => {
    console.log(result); // 'Operation successful!'
  })
  .catch(error => {
    console.error(error);
  })
  .finally(() => {
    console.log('Promise completed');
  });
\`\`\`

## Promise Chaining
\`\`\`javascript
fetch('/api/user')
  .then(response => response.json())
  .then(user => {
    console.log('User:', user);
    return fetch(\`/api/posts/\${user.id}\`);
  })
  .then(response => response.json())
  .then(posts => {
    console.log('User posts:', posts);
  })
  .catch(error => {
    console.error('Error:', error);
  });
\`\`\`

## Async/Await Syntax

### Basic Usage
\`\`\`javascript
async function fetchUserData() {
  try {
    const response = await fetch('/api/user');
    const user = await response.json();
    
    console.log('User:', user);
    return user;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}
\`\`\`

### Multiple Async Operations
\`\`\`javascript
async function fetchUserAndPosts(userId) {
  try {
    // Sequential execution
    const user = await fetchUser(userId);
    const posts = await fetchPosts(userId);
    
    return { user, posts };
  } catch (error) {
    console.error('Error:', error);
  }
}

async function fetchUserAndPostsParallel(userId) {
  try {
    // Parallel execution
    const [user, posts] = await Promise.all([
      fetchUser(userId),
      fetchPosts(userId)
    ]);
    
    return { user, posts };
  } catch (error) {
    console.error('Error:', error);
  }
}
\`\`\`

## Error Handling

### Try-Catch with Async/Await
\`\`\`javascript
async function handleAsyncOperation() {
  try {
    const result = await riskyOperation();
    console.log('Success:', result);
  } catch (error) {
    if (error.name === 'NetworkError') {
      console.log('Network error occurred');
    } else {
      console.log('Other error:', error.message);
    }
  } finally {
    console.log('Cleanup operations');
  }
}
\`\`\`

## Promise Utility Methods

### Promise.all()
\`\`\`javascript
const promises = [
  fetch('/api/users'),
  fetch('/api/posts'),
  fetch('/api/comments')
];

Promise.all(promises)
  .then(responses => {
    return Promise.all(responses.map(r => r.json()));
  })
  .then(data => {
    const [users, posts, comments] = data;
    console.log({ users, posts, comments });
  });
\`\`\`

### Promise.race()
\`\`\`javascript
const timeout = new Promise((_, reject) => 
  setTimeout(() => reject(new Error('Timeout')), 5000)
);

const fetchData = fetch('/api/data');

Promise.race([fetchData, timeout])
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Request failed or timed out'));
\`\`\``,
      published: true,
      duration: 30
    });

    // ============= CHAPTERS FOR COURSE 2 =============

    // Course 2, Module 1 - Chapters
    const c2m1ch1 = await Chapter.create({
      title: 'Arrays and Linked Lists',
      module: course2Module1._id,
      order: 1,
      type: 'article',
      content: `# Arrays and Linked Lists

## Arrays

### Array Basics
\`\`\`javascript
// Array creation
const numbers = [1, 2, 3, 4, 5];
const fruits = ['apple', 'banana', 'orange'];
const mixed = [1, 'hello', true, null];

// Array access
console.log(numbers[0]); // 1
console.log(fruits.length); // 3
\`\`\`

### Common Array Operations
\`\`\`javascript
const arr = [1, 2, 3];

// Add elements
arr.push(4); // [1, 2, 3, 4]
arr.unshift(0); // [0, 1, 2, 3, 4]

// Remove elements
const last = arr.pop(); // 4, arr = [0, 1, 2, 3]
const first = arr.shift(); // 0, arr = [1, 2, 3]

// Insert/remove at index
arr.splice(1, 1, 'new'); // [1, 'new', 3]
\`\`\`

### Array Methods
\`\`\`javascript
const numbers = [1, 2, 3, 4, 5];

// map - transform each element
const doubled = numbers.map(n => n * 2); // [2, 4, 6, 8, 10]

// filter - select elements
const evens = numbers.filter(n => n % 2 === 0); // [2, 4]

// reduce - accumulate
const sum = numbers.reduce((acc, n) => acc + n, 0); // 15

// find - first matching element
const found = numbers.find(n => n > 3); // 4

// some/every - boolean tests
const hasEven = numbers.some(n => n % 2 === 0); // true
const allPositive = numbers.every(n => n > 0); // true
\`\`\`

## Linked Lists

### Singly Linked List Implementation
\`\`\`javascript
class ListNode {
  constructor(val, next = null) {
    this.val = val;
    this.next = next;
  }
}

class LinkedList {
  constructor() {
    this.head = null;
    this.size = 0;
  }
  
  // Add to beginning
  prepend(val) {
    const newNode = new ListNode(val, this.head);
    this.head = newNode;
    this.size++;
  }
  
  // Add to end
  append(val) {
    const newNode = new ListNode(val);
    
    if (!this.head) {
      this.head = newNode;
    } else {
      let current = this.head;
      while (current.next) {
        current = current.next;
      }
      current.next = newNode;
    }
    this.size++;
  }
  
  // Remove by value
  remove(val) {
    if (!this.head) return false;
    
    if (this.head.val === val) {
      this.head = this.head.next;
      this.size--;
      return true;
    }
    
    let current = this.head;
    while (current.next && current.next.val !== val) {
      current = current.next;
    }
    
    if (current.next) {
      current.next = current.next.next;
      this.size--;
      return true;
    }
    
    return false;
  }
  
  // Find element
  find(val) {
    let current = this.head;
    while (current) {
      if (current.val === val) return current;
      current = current.next;
    }
    return null;
  }
  
  // Convert to array
  toArray() {
    const result = [];
    let current = this.head;
    while (current) {
      result.push(current.val);
      current = current.next;
    }
    return result;
  }
}

// Usage
const list = new LinkedList();
list.append(1);
list.append(2);
list.append(3);
list.prepend(0);
console.log(list.toArray()); // [0, 1, 2, 3]
\`\`\`

## Time Complexity Analysis

### Arrays
- Access: O(1)
- Search: O(n)
- Insertion: O(1) at end, O(n) at beginning/middle
- Deletion: O(1) at end, O(n) at beginning/middle

### Linked Lists
- Access: O(n)
- Search: O(n)
- Insertion: O(1) if position known
- Deletion: O(1) if position known

## When to Use Which?

**Use Arrays when:**
- You need random access to elements
- Memory usage is a concern
- You do more reading than inserting/deleting

**Use Linked Lists when:**
- You frequently insert/delete at the beginning
- The size varies significantly
- You don't need random access`,
      published: true,
      duration: 25
    });

    const c2m1ch2 = await Chapter.create({
      title: 'Stacks and Queues',
      module: course2Module1._id,
      order: 2,
      type: 'article',
      content: `# Stacks and Queues

## Stack (LIFO - Last In, First Out)

### Stack Implementation using Array
\`\`\`javascript
class Stack {
  constructor() {
    this.items = [];
  }
  
  // Add element to top
  push(element) {
    this.items.push(element);
  }
  
  // Remove and return top element
  pop() {
    if (this.isEmpty()) {
      throw new Error('Stack is empty');
    }
    return this.items.pop();
  }
  
  // View top element without removing
  peek() {
    if (this.isEmpty()) {
      throw new Error('Stack is empty');
    }
    return this.items[this.items.length - 1];
  }
  
  // Check if stack is empty
  isEmpty() {
    return this.items.length === 0;
  }
  
  // Get stack size
  size() {
    return this.items.length;
  }
  
  // Clear stack
  clear() {
    this.items = [];
  }
  
  // Convert to array
  toArray() {
    return [...this.items];
  }
}

// Usage
const stack = new Stack();
stack.push(1);
stack.push(2);
stack.push(3);
console.log(stack.peek()); // 3
console.log(stack.pop()); // 3
console.log(stack.toArray()); // [1, 2]
\`\`\`

### Stack Applications

#### 1. Parentheses Matching
\`\`\`javascript
function isValidParentheses(s) {
  const stack = new Stack();
  const pairs = { ')': '(', '}': '{', ']': '[' };
  
  for (let char of s) {
    if ('({['.includes(char)) {
      stack.push(char);
    } else if (')}]'.includes(char)) {
      if (stack.isEmpty() || stack.pop() !== pairs[char]) {
        return false;
      }
    }
  }
  
  return stack.isEmpty();
}

console.log(isValidParentheses('()')); // true
console.log(isValidParentheses('([)]')); // false
\`\`\`

#### 2. Evaluate Postfix Expression
\`\`\`javascript
function evaluatePostfix(expression) {
  const stack = new Stack();
  const tokens = expression.split(' ');
  
  for (let token of tokens) {
    if (isNumber(token)) {
      stack.push(parseFloat(token));
    } else {
      const b = stack.pop();
      const a = stack.pop();
      
      switch (token) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '*': stack.push(a * b); break;
        case '/': stack.push(a / b); break;
      }
    }
  }
  
  return stack.pop();
}

function isNumber(str) {
  return !isNaN(parseFloat(str));
}

console.log(evaluatePostfix('3 4 + 2 *')); // 14
\`\`\`

## Queue (FIFO - First In, First Out)

### Queue Implementation using Array
\`\`\`javascript
class Queue {
  constructor() {
    this.items = [];
  }
  
  // Add element to rear
  enqueue(element) {
    this.items.push(element);
  }
  
  // Remove and return front element
  dequeue() {
    if (this.isEmpty()) {
      throw new Error('Queue is empty');
    }
    return this.items.shift();
  }
  
  // View front element without removing
  front() {
    if (this.isEmpty()) {
      throw new Error('Queue is empty');
    }
    return this.items[0];
  }
  
  // Check if queue is empty
  isEmpty() {
    return this.items.length === 0;
  }
  
  // Get queue size
  size() {
    return this.items.length;
  }
  
  // Convert to array
  toArray() {
    return [...this.items];
  }
}

// Usage
const queue = new Queue();
queue.enqueue(1);
queue.enqueue(2);
queue.enqueue(3);
console.log(queue.front()); // 1
console.log(queue.dequeue()); // 1
console.log(queue.toArray()); // [2, 3]
\`\`\`

### Queue Applications

#### 1. BFS (Breadth-First Search)
\`\`\`javascript
function bfsTree(root) {
  if (!root) return [];
  
  const result = [];
  const queue = new Queue();
  queue.enqueue(root);
  
  while (!queue.isEmpty()) {
    const node = queue.dequeue();
    result.push(node.val);
    
    if (node.left) queue.enqueue(node.left);
    if (node.right) queue.enqueue(node.right);
  }
  
  return result;
}
\`\`\`

#### 2. Task Scheduler
\`\`\`javascript
class TaskScheduler {
  constructor() {
    this.queue = new Queue();
  }
  
  addTask(task, priority = 0) {
    this.queue.enqueue({ task, priority, timestamp: Date.now() });
  }
  
  processNextTask() {
    if (this.queue.isEmpty()) {
      console.log('No tasks to process');
      return;
    }
    
    const { task, timestamp } = this.queue.dequeue();
    console.log(\`Processing task: \${task} (added at \${new Date(timestamp)})\`);
    return task;
  }
  
  getPendingTasks() {
    return this.queue.size();
  }
}

// Usage
const scheduler = new TaskScheduler();
scheduler.addTask('Send email');
scheduler.addTask('Update database');
scheduler.processNextTask(); // Processing task: Send email
\`\`\`

## Time Complexity

### Stack Operations
- Push: O(1)
- Pop: O(1)
- Peek: O(1)
- isEmpty: O(1)

### Queue Operations
- Enqueue: O(1)
- Dequeue: O(n) with array, O(1) with linked list
- Front: O(1)
- isEmpty: O(1)`,
      published: true,
      duration: 30
    });

    // Course 2, Module 2 - Chapters
    const c2m2ch1 = await Chapter.create({
      title: 'Binary Trees',
      module: course2Module2._id,
      order: 1,
      type: 'article',
      content: `# Binary Trees

## Tree Terminology

- **Node**: Basic unit containing data
- **Root**: Top node of the tree
- **Parent**: Node with children
- **Child**: Node connected below another node
- **Leaf**: Node with no children
- **Height**: Length of longest path from node to leaf
- **Depth**: Length of path from root to node

## Binary Tree Implementation

### TreeNode Class
\`\`\`javascript
class TreeNode {
  constructor(val, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}
\`\`\`

### Binary Tree Class
\`\`\`javascript
class BinaryTree {
  constructor() {
    this.root = null;
  }
  
  // Insert node (level order)
  insert(val) {
    const newNode = new TreeNode(val);
    
    if (!this.root) {
      this.root = newNode;
      return;
    }
    
    const queue = [this.root];
    
    while (queue.length > 0) {
      const current = queue.shift();
      
      if (!current.left) {
        current.left = newNode;
        return;
      } else if (!current.right) {
        current.right = newNode;
        return;
      } else {
        queue.push(current.left);
        queue.push(current.right);
      }
    }
  }
  
  // Tree height
  height(node = this.root) {
    if (!node) return 0;
    
    const leftHeight = this.height(node.left);
    const rightHeight = this.height(node.right);
    
    return Math.max(leftHeight, rightHeight) + 1;
  }
  
  // Count nodes
  countNodes(node = this.root) {
    if (!node) return 0;
    
    return 1 + this.countNodes(node.left) + this.countNodes(node.right);
  }
  
  // Check if tree is balanced
  isBalanced(node = this.root) {
    if (!node) return true;
    
    const leftHeight = this.height(node.left);
    const rightHeight = this.height(node.right);
    
    return Math.abs(leftHeight - rightHeight) <= 1 &&
           this.isBalanced(node.left) &&
           this.isBalanced(node.right);
  }
}
\`\`\`

## Tree Traversals

### Depth-First Search (DFS)

#### 1. Inorder Traversal (Left, Root, Right)
\`\`\`javascript
function inorderTraversal(root) {
  const result = [];
  
  function traverse(node) {
    if (node) {
      traverse(node.left);   // Left
      result.push(node.val); // Root
      traverse(node.right);  // Right
    }
  }
  
  traverse(root);
  return result;
}

// Iterative version
function inorderIterative(root) {
  const result = [];
  const stack = [];
  let current = root;
  
  while (current || stack.length > 0) {
    while (current) {
      stack.push(current);
      current = current.left;
    }
    
    current = stack.pop();
    result.push(current.val);
    current = current.right;
  }
  
  return result;
}
\`\`\`

#### 2. Preorder Traversal (Root, Left, Right)
\`\`\`javascript
function preorderTraversal(root) {
  const result = [];
  
  function traverse(node) {
    if (node) {
      result.push(node.val); // Root
      traverse(node.left);   // Left
      traverse(node.right);  // Right
    }
  }
  
  traverse(root);
  return result;
}
\`\`\`

#### 3. Postorder Traversal (Left, Right, Root)
\`\`\`javascript
function postorderTraversal(root) {
  const result = [];
  
  function traverse(node) {
    if (node) {
      traverse(node.left);   // Left
      traverse(node.right);  // Right
      result.push(node.val); // Root
    }
  }
  
  traverse(root);
  return result;
}
\`\`\`

### Breadth-First Search (BFS)

#### Level Order Traversal
\`\`\`javascript
function levelOrderTraversal(root) {
  if (!root) return [];
  
  const result = [];
  const queue = [root];
  
  while (queue.length > 0) {
    const levelSize = queue.length;
    const currentLevel = [];
    
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift();
      currentLevel.push(node.val);
      
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    
    result.push(currentLevel);
  }
  
  return result;
}

// Example tree:
//       3
//      / \\
//     9   20
//        /  \\
//       15   7
// Result: [[3], [9, 20], [15, 7]]
\`\`\`

## Common Tree Problems

### 1. Maximum Depth
\`\`\`javascript
function maxDepth(root) {
  if (!root) return 0;
  
  return Math.max(maxDepth(root.left), maxDepth(root.right)) + 1;
}
\`\`\`

### 2. Same Tree
\`\`\`javascript
function isSameTree(p, q) {
  if (!p && !q) return true;
  if (!p || !q) return false;
  
  return p.val === q.val &&
         isSameTree(p.left, q.left) &&
         isSameTree(p.right, q.right);
}
\`\`\`

### 3. Symmetric Tree
\`\`\`javascript
function isSymmetric(root) {
  if (!root) return true;
  
  function isMirror(left, right) {
    if (!left && !right) return true;
    if (!left || !right) return false;
    
    return left.val === right.val &&
           isMirror(left.left, right.right) &&
           isMirror(left.right, right.left);
  }
  
  return isMirror(root.left, root.right);
}
\`\`\`

### 4. Path Sum
\`\`\`javascript
function hasPathSum(root, targetSum) {
  if (!root) return false;
  
  if (!root.left && !root.right) {
    return root.val === targetSum;
  }
  
  const newTarget = targetSum - root.val;
  return hasPathSum(root.left, newTarget) || 
         hasPathSum(root.right, newTarget);
}
\`\`\``,
      published: true,
      duration: 35
    });

    // Course 2, Module 3 - Chapters
    const c2m3ch1 = await Chapter.create({
      title: 'Sorting Algorithms',
      module: course2Module3._id,
      order: 1,
      type: 'article',
      content: `# Sorting Algorithms

## Bubble Sort
**Time Complexity:** O(n²) | **Space Complexity:** O(1)

\`\`\`javascript
function bubbleSort(arr) {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        // Swap elements
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    
    // If no swapping occurred, array is sorted
    if (!swapped) break;
  }
  
  return arr;
}

console.log(bubbleSort([64, 34, 25, 12, 22, 11, 90]));
// [11, 12, 22, 25, 34, 64, 90]
\`\`\`

## Selection Sort
**Time Complexity:** O(n²) | **Space Complexity:** O(1)

\`\`\`javascript
function selectionSort(arr) {
  const n = arr.length;
  
  for (let i = 0; i < n - 1; i++) {
    let minIndex = i;
    
    // Find minimum element in remaining array
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[minIndex]) {
        minIndex = j;
      }
    }
    
    // Swap minimum element with first element
    if (minIndex !== i) {
      [arr[i], arr[minIndex]] = [arr[minIndex], arr[i]];
    }
  }
  
  return arr;
}

console.log(selectionSort([64, 25, 12, 22, 11]));
// [11, 12, 22, 25, 64]
\`\`\`

## Insertion Sort
**Time Complexity:** O(n²) | **Space Complexity:** O(1)

\`\`\`javascript
function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    let current = arr[i];
    let j = i - 1;
    
    // Move elements greater than current to one position ahead
    while (j >= 0 && arr[j] > current) {
      arr[j + 1] = arr[j];
      j--;
    }
    
    arr[j + 1] = current;
  }
  
  return arr;
}

console.log(insertionSort([12, 11, 13, 5, 6]));
// [5, 6, 11, 12, 13]
\`\`\`

## Merge Sort
**Time Complexity:** O(n log n) | **Space Complexity:** O(n)

\`\`\`javascript
function mergeSort(arr) {
  if (arr.length <= 1) return arr;
  
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid));
  const right = mergeSort(arr.slice(mid));
  
  return merge(left, right);
}

function merge(left, right) {
  const result = [];
  let leftIndex = 0;
  let rightIndex = 0;
  
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] <= right[rightIndex]) {
      result.push(left[leftIndex]);
      leftIndex++;
    } else {
      result.push(right[rightIndex]);
      rightIndex++;
    }
  }
  
  // Add remaining elements
  return result
    .concat(left.slice(leftIndex))
    .concat(right.slice(rightIndex));
}

console.log(mergeSort([38, 27, 43, 3, 9, 82, 10]));
// [3, 9, 10, 27, 38, 43, 82]
\`\`\`

## Quick Sort
**Time Complexity:** O(n log n) average, O(n²) worst | **Space Complexity:** O(log n)

\`\`\`javascript
function quickSort(arr, low = 0, high = arr.length - 1) {
  if (low < high) {
    const pivotIndex = partition(arr, low, high);
    
    quickSort(arr, low, pivotIndex - 1);
    quickSort(arr, pivotIndex + 1, high);
  }
  
  return arr;
}

function partition(arr, low, high) {
  const pivot = arr[high];
  let i = low - 1;
  
  for (let j = low; j < high; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  
  [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
  return i + 1;
}

console.log(quickSort([10, 7, 8, 9, 1, 5]));
// [1, 5, 7, 8, 9, 10]
\`\`\`

## Heap Sort
**Time Complexity:** O(n log n) | **Space Complexity:** O(1)

\`\`\`javascript
function heapSort(arr) {
  const n = arr.length;
  
  // Build max heap
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(arr, n, i);
  }
  
  // Extract elements from heap one by one
  for (let i = n - 1; i > 0; i--) {
    [arr[0], arr[i]] = [arr[i], arr[0]];
    heapify(arr, i, 0);
  }
  
  return arr;
}

function heapify(arr, n, i) {
  let largest = i;
  const left = 2 * i + 1;
  const right = 2 * i + 2;
  
  if (left < n && arr[left] > arr[largest]) {
    largest = left;
  }
  
  if (right < n && arr[right] > arr[largest]) {
    largest = right;
  }
  
  if (largest !== i) {
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    heapify(arr, n, largest);
  }
}

console.log(heapSort([12, 11, 13, 5, 6, 7]));
// [5, 6, 7, 11, 12, 13]
\`\`\`

## Counting Sort
**Time Complexity:** O(n + k) | **Space Complexity:** O(k)
*where k is the range of input values*

\`\`\`javascript
function countingSort(arr) {
  if (arr.length === 0) return arr;
  
  const max = Math.max(...arr);
  const min = Math.min(...arr);
  const range = max - min + 1;
  
  const count = new Array(range).fill(0);
  const output = new Array(arr.length);
  
  // Count occurrences
  for (let num of arr) {
    count[num - min]++;
  }
  
  // Change count[i] to actual position
  for (let i = 1; i < count.length; i++) {
    count[i] += count[i - 1];
  }
  
  // Build output array
  for (let i = arr.length - 1; i >= 0; i--) {
    output[count[arr[i] - min] - 1] = arr[i];
    count[arr[i] - min]--;
  }
  
  return output;
}

console.log(countingSort([4, 2, 2, 8, 3, 3, 1]));
// [1, 2, 2, 3, 3, 4, 8]
\`\`\`

## Algorithm Comparison

| Algorithm | Best | Average | Worst | Space | Stable |
|-----------|------|---------|-------|-------|---------|
| Bubble | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Selection | O(n²) | O(n²) | O(n²) | O(1) | No |
| Insertion | O(n) | O(n²) | O(n²) | O(1) | Yes |
| Merge | O(n log n) | O(n log n) | O(n log n) | O(n) | Yes |
| Quick | O(n log n) | O(n log n) | O(n²) | O(log n) | No |
| Heap | O(n log n) | O(n log n) | O(n log n) | O(1) | No |
| Counting | O(n + k) | O(n + k) | O(n + k) | O(k) | Yes |

## When to Use Which?

- **Small datasets (< 50):** Insertion Sort
- **Nearly sorted data:** Insertion Sort or Bubble Sort
- **Guaranteed O(n log n):** Merge Sort or Heap Sort  
- **Average case performance:** Quick Sort
- **Integer data with small range:** Counting Sort
- **Memory constrained:** Heap Sort or Quick Sort`,
      published: true,
      duration: 40
    });

    // Create some quizzes
    const quiz1 = await Quiz.create({
      title: 'JavaScript Fundamentals Quiz',
      chapter: c1m1ch1._id,
      questions: [
        {
          questionText: 'Which of the following is NOT a primitive data type in JavaScript?',
          options: [
            { text: 'string', isCorrect: false },
            { text: 'number', isCorrect: false },
            { text: 'object', isCorrect: true },
            { text: 'boolean', isCorrect: false }
          ],
          explanation: 'Object is a reference data type, not a primitive data type.'
        },
        {
          questionText: 'What is the difference between let and var?',
          options: [
            { text: 'No difference', isCorrect: false },
            { text: 'let is block-scoped, var is function-scoped', isCorrect: true },
            { text: 'var is block-scoped, let is function-scoped', isCorrect: false },
            { text: 'let cannot be reassigned', isCorrect: false }
          ],
          explanation: 'let is block-scoped while var is function-scoped.'
        }
      ],
      published: true
    });

    const quiz2 = await Quiz.create({
      title: 'Arrays and Data Structures Quiz',
      chapter: c2m1ch1._id,
      questions: [
        {
          questionText: 'What is the time complexity of accessing an element in an array by index?',
          options: [
            { text: 'O(1)', isCorrect: true },
            { text: 'O(n)', isCorrect: false },
            { text: 'O(log n)', isCorrect: false },
            { text: 'O(n²)', isCorrect: false }
          ],
          explanation: 'Array access by index is constant time O(1).'
        },
        {
          questionText: 'Which data structure follows LIFO principle?',
          options: [
            { text: 'Queue', isCorrect: false },
            { text: 'Array', isCorrect: false },
            { text: 'Stack', isCorrect: true },
            { text: 'Linked List', isCorrect: false }
          ],
          explanation: 'Stack follows Last In, First Out (LIFO) principle.'
        }
      ],
      published: true
    });

    console.log('Created comprehensive course content with chapters and quizzes');
    console.log('Database seeded successfully with 2 complete courses!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedCourses();
