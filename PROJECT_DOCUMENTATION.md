# CodeThrone - Professional Documentation

## Overview
CodeThrone is a full-stack competitive programming and learning platform designed for coders to practice, compete, and collaborate. It features a modern UI, real-time chat, AI-powered interview practice, and a rich set of coding tools. The application is built with React (frontend), Node.js/Express (backend), and integrates with various services for code execution, authentication, and data management.

---

## Table of Contents
1. Features Overview
2. Architecture & Technologies
3. Main Components
4. Chat System
5. Code Editor & Problem Solving
6. Contests & Leaderboards
7. AI Interview Practice
8. Authentication & User Management
9. Admin & Moderation
10. Deployment & Configuration
11. Development Guidelines
12. Change Log & Chat Summary

---

## 1. Features Overview
- **Practice Problems:** 2000+ coding problems, detailed explanations, tags, company filters.
- **Contests:** Weekly global contests, ELO rating, live leaderboards.
- **Real-time Battles:** Live coding games, anti-cheat, rating system.
- **AI Interview Practice:** AI-powered questions, voice interaction, feedback.
- **Discussion & Collaboration:** Forums, announcements, chat.
- **Rich Code Editor:** CodeMirror-based, completions, themes, competitive snippets.
- **User Profiles:** Stats, coins, achievements, submissions.
- **Admin Dashboard:** Problem management, announcements, moderation.

---

## 2. Architecture & Technologies
- **Frontend:** React, TypeScript, Tailwind CSS, CodeMirror, React Router.
- **Backend:** Node.js, Express, MongoDB, REST APIs.
- **Authentication:** JWT, OAuth (Google, GitHub), Passport.js.
- **Code Execution:** Judge0 API integration.
- **Real-time:** Socket.io for games/chat.
- **AI:** Gemini/LLM for interview practice.
- **Deployment:** Vite, Render, Netlify, Docker (optional).

---

## 3. Main Components
- **Home Page:** Carousel, stats, explore cards, company/topic stats, announcements, contests.
- **Problems Page:** Search, filter, dropdowns, problem list, attractive buttons, pagination.
- **Problem Detail:** Description, constraints, examples, code editor, submissions, solutions, AI chat.
- **Discussion:** Forums, threads, replies, announcements.
- **Game/Contest:** Live battles, leaderboard, timers.
- **Profile:** User stats, coins, achievements, history.
- **Admin:** Problem/announcement management, moderation tools.

---

## 4. Chat System
- **Home Page Chat:** Fixed button/modal, send/read messages, maximize/minimize, local state (future: WebRTC).
- **Editor Chat:** Bottom-right modal, message list, send/read, maximize/minimize, modern UI.
- **Problem Detail AI Chat:** Contextual prompts, history, maximized/minimized views, session management.
- **Backend Integration:** (Planned) Real-time messaging via Socket.io, persistent chat history.

---

## 5. Code Editor & Problem Solving
- **Editor:** CodeMirror, language support (C++, Java, Python, JS), completions/snippets, dark/light themes.
- **Problem List:** Clickable rows, open details, tags, companies, difficulty, acceptance rate.
- **Submission:** Run/submit code, view results, console output, anti-cheat (tab switch, paste detection).
- **Solutions/Editorial:** Community/user solutions, official editorial, video/written explanations.

---

## 6. Contests & Leaderboards
- **Contests:** Weekly, global, ELO rating, live status, timers, upcoming/active.
- **Leaderboard:** Top users, ratings, games played, win rate.
- **Company/Topic Stats:** Filter problems by company/topic, stats on acceptance rate, submissions, difficulty.

---

## 7. AI Interview Practice
- **AI Chat:** Contextual prompts, optimal approaches, data structures, complexity, edge cases, mistakes.
- **Voice Interaction:** (Planned) Real-time feedback, voice-based questions.
- **Session Management:** Save/load chat history, quick prompts, maximized/minimized views.

---

## 8. Authentication & User Management
- **Auth:** JWT, OAuth, protected routes, user context.
- **Profile:** Stats, coins, achievements, submissions, history.
- **Admin:** User management, moderation, announcements.

---

## 9. Admin & Moderation
- **Dashboard:** Manage problems, announcements, users.
- **Moderation:** Ban users, edit/delete content, review submissions.
- **Announcements:** Create/edit, priority, type, display on home/discussion.

---

## 10. Deployment & Configuration
- **Frontend:** Vite, Tailwind, Netlify/Render.
- **Backend:** Node.js, Express, MongoDB, Render/Docker.
- **Config Files:** `package.json`, `vite.config.ts`, `render.yaml`, `.env` (API keys, DB URI).
- **Scripts:** `build.sh`, `start.sh`, `seed.js` (DB seeding).

---

## 11. Development Guidelines
- **Code Style:** TypeScript, functional components, hooks, context API.
- **UI:** Tailwind CSS, modern gradients, responsive design, accessibility.
- **Testing:** Jest, React Testing Library (recommended).
- **Error Handling:** Try/catch, user feedback, loading states.
- **Version Control:** Git, feature branches, PR reviews.

---

## 12. Change Log & Chat Summary
### Recent Changes & Chat Features
- Added rich chat modal to Home and CodeMirror editor (send/read, maximize/minimize).
- Made problem list rows fully clickable.
- Improved dropdown button UI and arrow padding.
- Added attractive button to Problems page.
- Enhanced Home page carousel and stats.
- Added dark mode with animated backgrounds (stars, meteors planned).
- Improved AI chat in ProblemDetail (contextual prompts, history, maximized/minimized views).
- Bug fixes: duplicate chat logic, state conflicts, UI placement.

### Chat Summary
- User requested chat features for Home and CodeMirror editor.
- Agent implemented chat modal with local state, maximize/minimize, message list.
- User requested bug analysis, agent identified duplicate logic.
- Chat integrated into CodeMirrorEditor at correct place, error-free.
- User requested UI improvements for dropdowns, buttons, and clickable rows.
- Agent provided professional guidance and code samples for all requests.

---

## Contact & Support
For questions, feature requests, or bug reports, please contact the project maintainer or open an issue on GitHub.

---

**End of Documentation**
