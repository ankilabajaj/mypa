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

## 💡 Why MyPA?

Most productivity apps simply remind users about upcoming tasks.

MyPA goes a step further by using Google Gemini AI to:

- prioritize what matters most
- generate personalized daily plans
- recover from missed deadlines
- break complex tasks into actionable steps
- prepare users for upcoming events

Instead of asking **"What should I do next?"**, MyPA answers it intelligently.

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

<img width="1440" height="900" alt="Screenshot 2026-06-29 at 12 26 40 AM" src="https://github.com/user-attachments/assets/08c586dc-f37d-4670-913c-a191c82dd382" />

<img width="1436" height="859" alt="Screenshot 2026-06-29 at 6 49 49 PM" src="https://github.com/user-attachments/assets/f881b750-4ee3-4d47-9538-a1c7478df4af" />

<img width="1431" height="851" alt="Screenshot 2026-06-29 at 6 49 42 PM" src="https://github.com/user-attachments/assets/dd9ac07a-85f8-4429-b01c-44831f21a7f2" />

---

## 🤖 AI Features (Powered by Google Gemini)

### 🎯 Today's Focus

Analyzes today's tasks and recommends the single most important task to work on.

<img width="1431" height="850" alt="Screenshot 2026-06-29 at 6 48 26 PM" src="https://github.com/user-attachments/assets/bd8ea387-b597-4cb3-9f5d-45fab6d6e740" />


---

### 📅 AI Daily Planner

Generates a personalized schedule based on:

- current time
- deadlines
- priorities

<img width="1433" height="853" alt="Screenshot 2026-06-29 at 6 48 01 PM" src="https://github.com/user-attachments/assets/0367c963-6d85-49fc-ab57-191069aa58e5" />


---

### 🚨 AI Rescue Mode

When work piles up:

- reorganizes priorities
- creates a recovery strategy
- generates a practical rescue plan

<img width="1433" height="851" alt="Screenshot 2026-06-29 at 6 48 53 PM" src="https://github.com/user-attachments/assets/82af9e71-1f31-42b2-b5d9-03e1f97fb44b" />


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

<img width="1430" height="813" alt="Screenshot 2026-06-29 at 6 49 14 PM" src="https://github.com/user-attachments/assets/bf183168-f174-4e2d-9631-587f94c5d546" />


---

### ✅ AI Event Checklist

Generates a personalized preparation checklist for events.

Includes:

- items to carry
- preparation steps
- travel reminders
- preparation tip

<img width="1435" height="850" alt="Screenshot 2026-06-29 at 6 49 31 PM" src="https://github.com/user-attachments/assets/c72a1168-1c9f-4006-bcb0-8526e1fa9090" />


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
