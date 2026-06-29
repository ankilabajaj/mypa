# 🚀 MyPA — AI-Powered Productivity Assistant

<p align="center">

![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-8-purple?logo=vite)
![Firebase](https://img.shields.io/badge/Firebase-Authentication-orange?logo=firebase)
![Firestore](https://img.shields.io/badge/Firestore-Cloud-yellow?logo=firebase)
![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-blue?logo=google)
![Hackathon](https://img.shields.io/badge/Vibe2Ship-2026-success)

</p>

---

## 📖 Overview

MyPA is an AI-powered productivity assistant designed to help users **take action before missing important deadlines**.

Unlike traditional reminder apps that simply notify users, MyPA uses **Google Gemini AI** to intelligently prioritize work, generate daily plans, rescue overdue schedules, break large tasks into actionable steps, and prepare users for upcoming events.

---

## ❓ Problem Statement

People often struggle with:

- forgetting deadlines
- poor prioritization
- overwhelming task lists
- ineffective reminders
- lack of planning assistance

Existing productivity apps mostly remind users **after** they become overwhelmed.

MyPA proactively guides users toward completing the right work at the right time.

---

# ✨ Features

## 📋 Task Management

- Create tasks
- Edit tasks
- Delete tasks
- Complete / Undo tasks
- Priority levels
- Automatic sorting
- Smart filters
- Overdue detection
- Due Today
- This Week
- This Month

---

## 📅 Event Management

- Create events
- Date & time scheduling
- End time validation
- Overdue event detection
- AI Event Checklist
- AI Preparation Tips

---

## 🤖 AI Features (Powered by Google Gemini)

### 🎯 Today's Focus

Analyzes today's tasks and recommends the single most important task to work on.

---

### 📅 AI Daily Planner

Generates a personalized schedule based on:

- current time
- deadlines
- priorities

---

### 🚨 AI Rescue Mode

When work piles up:

- reorganizes priorities
- creates a recovery strategy
- generates a practical rescue plan

---

### 🧩 AI Task Breakdown

Large tasks become smaller actionable steps.

Example:

Build AI App

↓

- Research
- Design
- Implement
- Test
- Deploy

---

### ✅ AI Event Checklist

Generates a personalized preparation checklist for events.

Includes:

- items to carry
- preparation steps
- travel reminders
- preparation tip

---

# 🔔 Productivity Features

- Browser notifications
- Notification Center
- Productivity Score
- Daily Streak
- Celebration animations
- Confetti
- Smart dashboard

---

# 🏗 Tech Stack

| Technology | Purpose |
|------------|----------|
| React | Frontend |
| Vite | Build Tool |
| Firebase Authentication | Google Sign-In |
| Cloud Firestore | Database |
| Google AI Studio (Gemini API) | AI Features |
| CSS | Styling |
| JavaScript | Logic |

---

# 🏛 Architecture

```
                Google Login
                     │
                     ▼
         Firebase Authentication
                     │
                     ▼
               React + Vite
                     │
        ┌────────────┴─────────────┐
        ▼                          ▼
 Cloud Firestore              Gemini API
        │                          │
        ▼                          ▼
 Tasks / Events           AI Features
 Settings                 Planning
 Notifications            Rescue Mode
                           Task Breakdown
                           Event Checklist
```

---

# 📂 Firestore Structure

```
users/
   {uid}/
      tasks/
         {taskId}

      settings/
         app

      notifications/
         {notificationId}
```

---

# 📷 Screenshots

> Add screenshots here before submission.

Suggested screenshots:

- Login Page
- Dashboard
- Today's Focus
- AI Daily Planner
- AI Rescue Mode
- Task Breakdown
- Event Checklist
- Notification Center

---

# ⚙ Installation

Clone the repository

```bash
git clone <repository-url>
```

Install dependencies

```bash
npm install
```

Run locally

```bash
npm run dev
```

Production build

```bash
npm run build
```

---

# 🔑 Environment Variables

Create a `.env` file containing:

```
VITE_GEMINI_API_KEY=

VITE_FIREBASE_API_KEY=

VITE_FIREBASE_AUTH_DOMAIN=

VITE_FIREBASE_PROJECT_ID=

VITE_FIREBASE_STORAGE_BUCKET=

VITE_FIREBASE_MESSAGING_SENDER_ID=

VITE_FIREBASE_APP_ID=
```

---

# 🚀 Future Improvements

- AI calendar integration
- Email reminders
- Mobile application
- Team collaboration
- Habit tracking
- Wearable device support
- Voice assistant integration

---

# 👩‍💻 Built For

**Vibe2Ship Hackathon 2026**

---

# 🙌 Powered By

- Google AI Studio
- Gemini API
- Firebase
- React

---

# ⭐ If you like this project

Give the repository a ⭐!
