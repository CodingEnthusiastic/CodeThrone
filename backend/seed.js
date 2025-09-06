import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import User from './models/User.js';
import Problem from './models/Problem.js';
import Contest from './models/Contest.js';
import Announcement from './models/Announcement.js';

dotenv.config();

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

    // Create sample problems
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
          },
          {
            input: 'nums = [3,2,4], target = 6',
            output: '[1,2]',
            explanation: 'Because nums[1] + nums[2] == 6, we return [1, 2].'
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
        pass`,
          c: `int* twoSum(int* nums, int numsSize, int target, int* returnSize) {
    // Your code here
    
}`
        },
        functionSignature: {
          cpp: "vector<int> twoSum(vector<int>& nums, int target)",
          java: "int[] twoSum(int[] nums, int target)",
          python: "def twoSum(self, nums: List[int], target: int) -> List[int]:",
          c: "int* twoSum(int* nums, int numsSize, int target, int* returnSize)"
        }
      },
      {
        title: 'Add Two Numbers',
        description: `You are given two non-empty linked lists representing two non-negative integers. The digits are stored in reverse order, and each of their nodes contains a single digit. Add the two numbers and return the sum as a linked list.

You may assume the two numbers do not contain any leading zero, except the number 0 itself.`,
        difficulty: 'Medium',
        tags: ['Linked List', 'Math', 'Recursion'],
        companies: ['Amazon', 'Microsoft', 'Apple'],
        constraints: `The number of nodes in each linked list is in the range [1, 100].
0 <= Node.val <= 9
It is guaranteed that the list represents a number that does not have leading zeros.`,
        examples: [
          {
            input: 'l1 = [2,4,3], l2 = [5,6,4]',
            output: '[7,0,8]',
            explanation: '342 + 465 = 807.'
          }
        ],
        testCases: [
          { input: '[2,4,3]\n[5,6,4]', output: '[7,0,8]', isPublic: true },
          { input: '[0]\n[0]', output: '[0]', isPublic: true },
          { input: '[9,9,9,9,9,9,9]\n[9,9,9,9]', output: '[8,9,9,9,0,0,0,1]', isPublic: false }
        ],
        acceptanceRate: 38.1,
        submissions: 800000,
        accepted: 304800,
        createdBy: adminUser._id
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
          },
          {
            input: 's = "bbbbb"',
            output: '1',
            explanation: 'The answer is "b", with the length of 1.'
          }
        ],
        testCases: [
          { input: '"abcabcbb"', output: '3', isPublic: true },
          { input: '"bbbbb"', output: '1', isPublic: true },
          { input: '"pwwkew"', output: '3', isPublic: false }
        ],
        acceptanceRate: 33.8,
        submissions: 900000,
        accepted: 304200,
        createdBy: adminUser._id
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
0 <= n <= 1000
1 <= m + n <= 2000
-10^6 <= nums1[i], nums2[i] <= 10^6`,
        examples: [
          {
            input: 'nums1 = [1,3], nums2 = [2]',
            output: '2.00000',
            explanation: 'merged array = [1,2,3] and median is 2.'
          }
        ],
        testCases: [
          { input: '[1,3]\n[2]', output: '2.00000', isPublic: true },
          { input: '[1,2]\n[3,4]', output: '2.50000', isPublic: true },
          { input: '[0,0]\n[0,0]', output: '0.00000', isPublic: false }
        ],
        acceptanceRate: 35.2,
        submissions: 500000,
        accepted: 176000,
        createdBy: adminUser._id
      }
    ];

    for (const problemData of problems) {
      const problem = new Problem(problemData);
      await problem.save();
    }

    // Create sample announcement
    const announcement = new Announcement({
      title: 'Welcome to CodeArena!',
      content: 'Start solving problems and improve your coding skills. Join contests and compete with other programmers!',
      type: 'general',
      priority: 'high',
      createdBy: adminUser._id
    });
    await announcement.save();

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();