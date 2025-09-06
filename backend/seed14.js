import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Problem from './models/Problem.js';
import Contest from './models/Contest.js';
import Announcement from './models/Announcement.js';

dotenv.config({ path: '../.env' });

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/codearena');
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Problem.deleteMany({});
    await Contest.deleteMany({});
    await Announcement.deleteMany({});

    // Create admin user
    const adminUser = new User({
      username: 'admin',
      email: 'admin@codearena.com',
      password: 'admin123',
      role: 'admin'
    });
    await adminUser.save();

    // Create comprehensive 14 problems 
    const problems = [
      {
        title: 'Two Sum',
        description: `Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.`,
        difficulty: 'Easy',
        tags: ['Array', 'Hash Table'],
        companies: ['Amazon', 'Google', 'Microsoft'],
        constraints: `2 <= nums.length <= 10^4
-10^9 <= nums[i] <= 10^9
-10^9 <= target <= 10^9
Only one valid answer exists.`,
        examples: [
          {
            input: 'nums = [2,7,11,15], target = 9',
            output: '[0,1]',
            explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].'
          }
        ],
        testCases: [
          { input: '[2,7,11,15]\n9', output: '[0,1]', isPublic: true },
          { input: '[3,2,4]\n6', output: '[1,2]', isPublic: true },
          { input: '[3,3]\n6', output: '[0,1]', isPublic: false }
        ],
        acceptanceRate: 49.2,
        submissions: 1000000,
        accepted: 492000,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public',
        codeTemplates: {
          cpp: `class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        // Your code here
        
    }
};`,
          java: `class Solution {
    public int[] twoSum(int[] nums, int target) {
        // Your code here
        
    }
}`,
          python: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Your code here
        pass`
        },
        functionSignature: {
          cpp: "vector<int> twoSum(vector<int>& nums, int target)",
          java: "int[] twoSum(int[] nums, int target)",
          python: "def twoSum(self, nums: List[int], target: int) -> List[int]:"
        }
      },
      {
        title: 'Add Two Numbers',
        description: `You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.`,
        difficulty: 'Medium',
        tags: ['Linked List', 'Math', 'Recursion'],
        companies: ['Amazon', 'Microsoft', 'Apple'],
        constraints: `The number of nodes in each linked list is in the range [1, 100].
0 <= Node.val <= 9`,
        examples: [
          {
            input: 'l1 = [2,4,3], l2 = [5,6,4]',
            output: '[7,0,8]',
            explanation: '342 + 465 = 807.'
          }
        ],
        testCases: [
          { input: '[2,4,3]\n[5,6,4]', output: '[7,0,8]', isPublic: true },
          { input: '[0]\n[0]', output: '[0]', isPublic: true }
        ],
        acceptanceRate: 38.1,
        submissions: 800000,
        accepted: 304800,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'Longest Substring Without Repeating Characters',
        description: `Given a string s, find the length of the longest substring without repeating characters.`,
        difficulty: 'Medium',
        tags: ['Hash Table', 'String', 'Sliding Window'],
        companies: ['Amazon', 'Bloomberg', 'Adobe'],
        constraints: `0 <= s.length <= 5 * 10^4
s consists of English letters, digits, symbols and spaces.`,
        examples: [
          {
            input: 's = "abcabcbb"',
            output: '3',
            explanation: 'The answer is "abc", with the length of 3.'
          }
        ],
        testCases: [
          { input: '"abcabcbb"', output: '3', isPublic: true },
          { input: '"bbbbb"', output: '1', isPublic: true }
        ],
        acceptanceRate: 33.8,
        submissions: 900000,
        accepted: 304200,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'Median of Two Sorted Arrays',
        description: `Given two sorted arrays nums1 and nums2 of size m and n respectively, return the median of the two sorted arrays.

The overall run time complexity should be O(log (m+n)).`,
        difficulty: 'Hard',
        tags: ['Array', 'Binary Search', 'Divide and Conquer'],
        companies: ['Google', 'Amazon', 'Microsoft'],
        constraints: `nums1.length == m
nums2.length == n
0 <= m <= 1000
0 <= n <= 1000`,
        examples: [
          {
            input: 'nums1 = [1,3], nums2 = [2]',
            output: '2.00000',
            explanation: 'merged array = [1,2,3] and median is 2.'
          }
        ],
        testCases: [
          { input: '[1,3]\n[2]', output: '2.00000', isPublic: true },
          { input: '[1,2]\n[3,4]', output: '2.50000', isPublic: true }
        ],
        acceptanceRate: 35.2,
        submissions: 500000,
        accepted: 176000,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'Longest Palindromic Substring',
        description: `Given a string s, return the longest palindromic substring in s.`,
        difficulty: 'Medium',
        tags: ['String', 'Dynamic Programming'],
        companies: ['Amazon', 'Microsoft', 'Facebook'],
        constraints: `1 <= s.length <= 1000
s consist of only digits and English letters.`,
        examples: [
          {
            input: 's = "babad"',
            output: '"bab"',
            explanation: '"aba" is also a valid answer.'
          }
        ],
        testCases: [
          { input: '"babad"', output: '"bab"', isPublic: true },
          { input: '"cbbd"', output: '"bb"', isPublic: true }
        ],
        acceptanceRate: 32.8,
        submissions: 750000,
        accepted: 246000,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'Reverse Integer',
        description: `Given a signed 32-bit integer x, return x with its digits reversed. If reversing x causes the value to go outside the signed 32-bit integer range [-2^31, 2^31 - 1], then return 0.`,
        difficulty: 'Medium',
        tags: ['Math'],
        companies: ['Apple', 'Bloomberg', 'Amazon'],
        constraints: `-2^31 <= x <= 2^31 - 1`,
        examples: [
          {
            input: 'x = 123',
            output: '321'
          },
          {
            input: 'x = -123',
            output: '-321'
          }
        ],
        testCases: [
          { input: '123', output: '321', isPublic: true },
          { input: '-123', output: '-321', isPublic: true },
          { input: '120', output: '21', isPublic: false }
        ],
        acceptanceRate: 26.1,
        submissions: 950000,
        accepted: 247950,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'String to Integer (atoi)',
        description: `Implement the myAtoi(string s) function, which converts a string to a 32-bit signed integer (similar to C/C++'s atoi function).`,
        difficulty: 'Medium',
        tags: ['String'],
        companies: ['Facebook', 'Amazon', 'Microsoft'],
        constraints: `0 <= s.length <= 200
s consists of English letters (lower-case and upper-case), digits (0-9), ' ', '+', '-', and '.'.`,
        examples: [
          {
            input: 's = "42"',
            output: '42'
          },
          {
            input: 's = "   -42"',
            output: '-42'
          }
        ],
        testCases: [
          { input: '"42"', output: '42', isPublic: true },
          { input: '"   -42"', output: '-42', isPublic: true }
        ],
        acceptanceRate: 16.4,
        submissions: 1200000,
        accepted: 196800,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'Palindrome Number',
        description: `Given an integer x, return true if x is palindrome integer. An integer is a palindrome when it reads the same backward as forward.`,
        difficulty: 'Easy',
        tags: ['Math'],
        companies: ['Amazon', 'Apple', 'Facebook'],
        constraints: `-2^31 <= x <= 2^31 - 1`,
        examples: [
          {
            input: 'x = 121',
            output: 'true',
            explanation: '121 reads as 121 from left to right and from right to left.'
          },
          {
            input: 'x = -121',
            output: 'false',
            explanation: 'From left to right, it reads -121. From right to left, it becomes 121-.'
          }
        ],
        testCases: [
          { input: '121', output: 'true', isPublic: true },
          { input: '-121', output: 'false', isPublic: true },
          { input: '10', output: 'false', isPublic: false }
        ],
        acceptanceRate: 52.7,
        submissions: 1100000,
        accepted: 579700,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'Regular Expression Matching',
        description: `Given an input string s and a pattern p, implement regular expression matching with support for '.' and '*' where:
'.' Matches any single character.
'*' Matches zero or more of the preceding element.`,
        difficulty: 'Hard',
        tags: ['String', 'Dynamic Programming', 'Recursion'],
        companies: ['Facebook', 'Google', 'Uber'],
        constraints: `1 <= s.length <= 20
1 <= p.length <= 20
s contains only lowercase English letters.
p contains only lowercase English letters, '.', and '*'.`,
        examples: [
          {
            input: 's = "aa", p = "a"',
            output: 'false',
            explanation: '"a" does not match the entire string "aa".'
          }
        ],
        testCases: [
          { input: '"aa"\n"a"', output: 'false', isPublic: true },
          { input: '"aa"\n"a*"', output: 'true', isPublic: true }
        ],
        acceptanceRate: 27.9,
        submissions: 650000,
        accepted: 181350,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'Container With Most Water',
        description: `You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the ith line are (i, 0) and (i, height[i]).
Find two lines that together with the x-axis form a container that contains the most water.`,
        difficulty: 'Medium',
        tags: ['Array', 'Two Pointers', 'Greedy'],
        companies: ['Facebook', 'Amazon', 'Bloomberg'],
        constraints: `n == height.length
2 <= n <= 10^5
0 <= height[i] <= 10^4`,
        examples: [
          {
            input: 'height = [1,8,6,2,5,4,8,3,7]',
            output: '49',
            explanation: 'The above vertical lines are represented by array [1,8,6,2,5,4,8,3,7]. In this case, the max area of water the container can contain is 49.'
          }
        ],
        testCases: [
          { input: '[1,8,6,2,5,4,8,3,7]', output: '49', isPublic: true },
          { input: '[1,1]', output: '1', isPublic: true }
        ],
        acceptanceRate: 54.2,
        submissions: 850000,
        accepted: 460700,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'Integer to Roman',
        description: `Roman numerals are represented by seven different symbols: I, V, X, L, C, D and M.
Given an integer, convert it to a roman numeral.`,
        difficulty: 'Medium',
        tags: ['Hash Table', 'Math', 'String'],
        companies: ['Facebook', 'Adobe', 'Yahoo'],
        constraints: `1 <= num <= 3999`,
        examples: [
          {
            input: 'num = 3',
            output: '"III"',
            explanation: '3 is represented as 3 ones.'
          },
          {
            input: 'num = 58',
            output: '"LVIII"',
            explanation: 'L = 50, V = 5, III = 3.'
          }
        ],
        testCases: [
          { input: '3', output: '"III"', isPublic: true },
          { input: '58', output: '"LVIII"', isPublic: true },
          { input: '1994', output: '"MCMXCIV"', isPublic: false }
        ],
        acceptanceRate: 60.1,
        submissions: 720000,
        accepted: 432720,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'Roman to Integer',
        description: `Roman numerals are represented by seven different symbols: I, V, X, L, C, D and M.
Given a roman numeral, convert it to an integer.`,
        difficulty: 'Easy',
        tags: ['Hash Table', 'Math', 'String'],
        companies: ['Facebook', 'Microsoft', 'Amazon'],
        constraints: `1 <= s.length <= 15
s contains only the characters ('I', 'V', 'X', 'L', 'C', 'D', 'M').
It is guaranteed that s is a valid roman numeral in the range [1, 3999].`,
        examples: [
          {
            input: 's = "III"',
            output: '3',
            explanation: 'III = 3.'
          },
          {
            input: 's = "LVIII"',
            output: '58',
            explanation: 'L = 50, V= 5, III = 3.'
          }
        ],
        testCases: [
          { input: '"III"', output: '3', isPublic: true },
          { input: '"LVIII"', output: '58', isPublic: true },
          { input: '"MCMXCIV"', output: '1994', isPublic: false }
        ],
        acceptanceRate: 58.4,
        submissions: 980000,
        accepted: 572320,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: 'Longest Common Prefix',
        description: `Write a function to find the longest common prefix string amongst an array of strings.
If there is no common prefix, return an empty string "".`,
        difficulty: 'Easy',
        tags: ['String', 'Trie'],
        companies: ['Google', 'Facebook', 'Adobe'],
        constraints: `1 <= strs.length <= 200
0 <= strs[i].length <= 200
strs[i] consists of only lowercase English letters.`,
        examples: [
          {
            input: 'strs = ["flower","flow","flight"]',
            output: '"fl"'
          },
          {
            input: 'strs = ["dog","racecar","car"]',
            output: '""',
            explanation: 'There is no common prefix among the input strings.'
          }
        ],
        testCases: [
          { input: '["flower","flow","flight"]', output: '"fl"', isPublic: true },
          { input: '["dog","racecar","car"]', output: '""', isPublic: true }
        ],
        acceptanceRate: 40.7,
        submissions: 890000,
        accepted: 362230,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      },
      {
        title: '3Sum',
        description: `Given an integer array nums, return all the triplets [nums[i], nums[j], nums[k]] such that i != j, i != k, and j != k, and nums[i] + nums[j] + nums[k] == 0.
Notice that the solution set must not contain duplicate triplets.`,
        difficulty: 'Medium',
        tags: ['Array', 'Two Pointers', 'Sorting'],
        companies: ['Facebook', 'Amazon', 'Microsoft'],
        constraints: `3 <= nums.length <= 3000
-10^5 <= nums[i] <= 10^5`,
        examples: [
          {
            input: 'nums = [-1,0,1,2,-1,-4]',
            output: '[[-1,-1,2],[-1,0,1]]',
            explanation: 'nums[0] + nums[1] + nums[2] = (-1) + 0 + 1 = 0.'
          }
        ],
        testCases: [
          { input: '[-1,0,1,2,-1,-4]', output: '[[-1,-1,2],[-1,0,1]]', isPublic: true },
          { input: '[0,1,1]', output: '[]', isPublic: true },
          { input: '[0,0,0]', output: '[[0,0,0]]', isPublic: false }
        ],
        acceptanceRate: 32.5,
        submissions: 1250000,
        accepted: 406250,
        createdBy: adminUser._id,
        isPublished: true,
        visibility: 'public'
      }
    ];

    for (const problemData of problems) {
      const problem = new Problem(problemData);
      await problem.save();
      console.log(`✅ Created problem: ${problemData.title}`);
    }

    console.log(`✅ Successfully seeded ${problems.length} problems`);

    // Create sample contest
    const contest = new Contest({
      title: 'Weekly Contest 1',
      description: 'A weekly programming contest',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000),
      problems: [],
      participants: [],
      createdBy: adminUser._id
    });
    await contest.save();

    // Create sample announcement
    const announcement = new Announcement({
      title: 'Welcome to CodeArena!',
      content: 'Start solving problems and participate in contests to improve your coding skills.',
      type: 'general',
      priority: 'medium',
      createdBy: adminUser._id
    });
    await announcement.save();

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    mongoose.disconnect();
  }
};

seedData();
