import './loadenv.js';
import mongoose from 'mongoose';
import Course from './models/Course.js';
import Module from './models/Module.js';
import Chapter from './models/Chapter.js';
import Quiz from './models/Quiz.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/building-wonders';

async function seedCourses() 
{
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
    //   published: true
    // });

    console.log('Created modules');

    // Create chapters for module 1
    const chapter1 = await Chapter.create({
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
\`\`\`

### 2. Number
\`\`\`javascript
let age = 30;
let price = 19.99;
\`\`\`

### 3. Boolean
\`\`\`javascript
let isActive = true;
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
\`\`\`

### 7. BigInt
\`\`\`javascript
let bigNumber = 1234567890123456789012345678901234567890n;
\`\`\`

## Reference Data Types

### 1. Objects
\`\`\`javascript
let person = {
  firstName: "John",
  lastName: "Doe",
  age: 30
};
\`\`\`

### 2. Arrays
\`\`\`javascript
let fruits = ["Apple", "Banana", "Orange"];
\`\`\`

### 3. Functions
\`\`\`javascript
function greet() {
  console.log("Hello world");
}
\`\`\`

## Variable Declarations

### 1. var
\`\`\`javascript
var x = 10; // Function scoped
\`\`\`

### 2. let
\`\`\`javascript
let y = 20; // Block scoped
\`\`\`

### 3. const
\`\`\`javascript
const z = 30; // Block scoped and cannot be reassigned
\`\`\`

<img src="/javascript-variables.jpg" alt="JavaScript Variables" />

Here's an example showing variable scope:

\`\`\`javascript
function scopeExample() {
  var functionScoped = "I am function scoped";
  let blockScoped = "I am block scoped";
  
  if (true) {
    var functionScoped2 = "I am also function scoped";
    let blockScoped2 = "I am block scoped too";
    console.log(functionScoped); // Accessible
    console.log(blockScoped); // Accessible
  }
  
  console.log(functionScoped2); // Accessible
  // console.log(blockScoped2); // Error: blockScoped2 is not defined
}
\`\`\``,
      published: true,
      duration: 15
    });

    const chapter2 = await Chapter.create({
      title: 'Operators & Control Flow',
      module: course1Module1._id,
      order: 2,
      type: 'article',
      content: `# Operators and Control Flow in JavaScript

## Operators

JavaScript includes various operators for performing operations on values.

### Arithmetic Operators

\`\`\`javascript
let a = 10;
let b = 5;

console.log(a + b); // Addition: 15
console.log(a - b); // Subtraction: 5
console.log(a * b); // Multiplication: 50
console.log(a / b); // Division: 2
console.log(a % b); // Modulus (Remainder): 0
console.log(a ** b); // Exponentiation: 100000
\`\`\`

<img src="/javascript-operators.png" alt="JavaScript Operators" />

### Comparison Operators

\`\`\`javascript
console.log(a > b); // Greater than: true
console.log(a < b); // Less than: false
console.log(a >= b); // Greater than or equal to: true
console.log(a <= b); // Less than or equal to: false
console.log(a === b); // Strict equality: false
console.log(a !== b); // Strict inequality: true
\`\`\`

## Control Flow

### If-Else Statements

\`\`\`javascript
let hour = 10;

if (hour < 12) {
  console.log("Good morning");
} else if (hour < 18) {
  console.log("Good afternoon");
} else {
  console.log("Good evening");
}
\`\`\`

### Switch Statements

\`\`\`javascript
let day = "Monday";

switch (day) {
  case "Monday":
    console.log("Start of work week");
    break;
  case "Friday":
    console.log("End of work week");
    break;
  default:
    console.log("Regular day");
}
\`\`\`

### Loops

#### For Loop

\`\`\`javascript
for (let i = 0; i < 5; i++) {
  console.log(i);
}
\`\`\`

#### While Loop

\`\`\`javascript
let i = 0;
while (i < 5) {
  console.log(i);
  i++;
}
\`\`\`

#### Do-While Loop

\`\`\`javascript
let j = 0;
do {
  console.log(j);
  j++;
} while (j < 5);
\`\`\`

#### For...of Loop (for arrays)

\`\`\`javascript
const numbers = [1, 2, 3, 4, 5];
for (const num of numbers) {
  console.log(num);
}
\`\`\`

#### For...in Loop (for objects)

\`\`\`javascript
const person = {
  name: "John",
  age: 30,
  job: "Developer"
};

for (const key in person) {
  console.log(key + ": " + person[key]);
}
\`\`\``,
      published: true,
      duration: 20
    });

    // Create a quiz for module 1
    const quiz1 = await Quiz.create({
      title: 'JavaScript Fundamentals Quiz',
      chapter: chapter2._id,
      questions: [
        {
          questionText: 'Which of the following is not a primitive data type in JavaScript?',
          options: [
            { text: 'String', isCorrect: false },
            { text: 'Number', isCorrect: false },
            { text: 'Boolean', isCorrect: false },
            { text: 'Array', isCorrect: true }
          ],
          explanation: 'Arrays are reference data types, not primitive data types.'
        },
        {
          questionText: 'Which keyword is used to declare a constant variable in JavaScript?',
          options: [
            { text: 'var', isCorrect: false },
            { text: 'let', isCorrect: false },
            { text: 'const', isCorrect: true },
            { text: 'constant', isCorrect: false }
          ],
          explanation: 'const is used to declare constants in JavaScript.'
        },
        {
          questionText: 'What will be the output of: console.log(typeof []);',
          options: [
            { text: 'array', isCorrect: false },
            { text: 'object', isCorrect: true },
            { text: 'undefined', isCorrect: false },
            { text: 'Array', isCorrect: false }
          ],
          explanation: 'In JavaScript, arrays are objects, so typeof [] returns "object".'
        }
      ],
      passingScore: 70,
      timeLimit: 5,
      published: true
    });

    // Create chapters for module 2
    const chapter3 = await Chapter.create({
      title: 'DOM Selectors',
      module: course1Module2._id,
      order: 1,
      type: 'article',
      content: `# DOM Selectors in JavaScript

The Document Object Model (DOM) is a programming interface for web documents. It represents the page so that programs can change the document structure, style, and content.

<img src="/dom-tree.png" alt="DOM Tree Structure" />

## Selecting Elements from the DOM

### getElementById

Get an element by its ID:

\`\`\`javascript
const header = document.getElementById('header');
\`\`\`

### getElementsByClassName

Get elements by class name (returns HTMLCollection):

\`\`\`javascript
const items = document.getElementsByClassName('item');
\`\`\`

### getElementsByTagName

Get elements by tag name (returns HTMLCollection):

\`\`\`javascript
const paragraphs = document.getElementsByTagName('p');
\`\`\`

### querySelector

Get the first element that matches a CSS selector:

\`\`\`javascript
const container = document.querySelector('.container');
\`\`\`

### querySelectorAll

Get all elements that match a CSS selector (returns NodeList):

\`\`\`javascript
const buttons = document.querySelectorAll('button.primary');
\`\`\`

## Modifying Elements

### Changing Content

\`\`\`javascript
// Change text content
element.textContent = 'New text';

// Change HTML content (be careful with this - potential XSS risk)
element.innerHTML = '<span>New HTML</span>';
\`\`\`

### Changing Attributes

\`\`\`javascript
// Get attribute
const src = img.getAttribute('src');

// Set attribute
img.setAttribute('src', 'new-image.jpg');

// Check if attribute exists
img.hasAttribute('alt');

// Remove attribute
img.removeAttribute('alt');
\`\`\`

### Changing Styles

\`\`\`javascript
// Direct style modification
element.style.color = 'red';
element.style.backgroundColor = '#f0f0f0';

// Add/remove classes
element.classList.add('active');
element.classList.remove('hidden');
element.classList.toggle('selected');
element.classList.contains('active'); // Returns true/false
\`\`\`

## Creating and Removing Elements

### Creating Elements

\`\`\`javascript
// Create a new element
const newParagraph = document.createElement('p');
newParagraph.textContent = 'This is a new paragraph.';

// Append it to a parent element
document.body.appendChild(newParagraph);
\`\`\`

### Removing Elements

\`\`\`javascript
// Remove an element
element.remove();

// Remove a child element
parent.removeChild(child);
\`\`\`

## Practical Examples

### Example 1: Create a dynamic list

\`\`\`javascript
function createList(items) {
  const ul = document.createElement('ul');
  
  items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    ul.appendChild(li);
  });
  
  document.body.appendChild(ul);
}

createList(['Item 1', 'Item 2', 'Item 3']);
\`\`\`

### Example 2: Toggle visibility

\`\`\`javascript
function toggleVisibility(elementId) {
  const element = document.getElementById(elementId);
  if (element) {
    element.classList.toggle('hidden');
  }
}

// Usage
toggleVisibility('myElement');
\`\`\``,
      published: true,
      duration: 25
    });

    console.log('Created chapters and quiz');

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seedCourses();
