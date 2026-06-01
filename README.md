<div align="center">
<img src="https://i.postimg.cc/sgmLmSb2/logo.png" width="20%" alt="The Mirror Logo"/>

# The Mirror

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)

</div>

**AI-powered adversarial technical interview simulator.** Get instant, intelligent feedback on your coding skills and backend architecture knowledge through a simulated interview and strict performance scorecard.

## Overview

Every technical interview prep tool coddles you—**The Mirror does not.** 

**The Mirror** is an adversarial technical interview simulator designed to pressure-test your knowledge of backend systems, performance tuning, and software architecture. Built around real-life production incident scenarios, the AI interviewer probes for vague answers, unverified assumptions, or shallow explanations. 

- **Adversarial AI**: Probes responses for gaps, assumptions, and shallow technical depth.
- **Incident Scenarios**: Realistic, high-stakes production challenges designed to simulate worst-case on-call engineering nightmares.
- **Strict Scorecard**: A complete, critical evaluation of your technical answers at the end of the simulation.

<div align="center">
  <img src="https://i.postimg.cc/ZqyG4Gpm/example-chat.png" alt="The Mirror Chat Example" width="60%" style="border-radius: 8px; border: 1px solid #30363d;">
  <p><em>The Mirror Chat Example</em></p>
</div>

## Installation & Setup

To get the application running locally, you need to configure and spin up both the frontend and the backend.

### Option 1: Backend Setup

```bash
cd server
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:push
npm run dev
```

### Option 2: Frontend Setup

```bash
cd client
cp .env.example .env
npm install
npm run dev
```

## Features

| Feature | Description |
|---------|-------------|
| **Adversarial AI Agent** | A demanding interviewer that drills into your claims and targets weak explanations |
| **Real-time Technical Chat** | Interactive conversation interface powered by LLMs to simulate a real coding interview |
| **Rejection Scorecard** | Final evaluation metric showing your pass/fail status, detailed gaps, and overall score |
| **Real-World Scenarios** | Test yourself against query optimization, worker memory leaks, cache design, or race conditions |
| **Strict Turn Limits** | Limited turns to answer questions, forcing conciseness and precision under pressure |
| **Simulation History & Sidebar** | Keep track of past simulations, view your scores, and resume or review archived sessions |
| **History Log Deletion** | Clean up your history logs by deleting specific mock interview sessions with a custom confirmation modal |

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Backend** | Node.js, Express, Prisma ORM, PostgreSQL (Supabase) |
| **AI Integration** | Groq SDK (Qwen-32B) **OR** Google Gemini API |
| **Frontend** | React 19, Vite, Tailwind CSS 4, Framer Motion, React Router DOM 7 |
| **Validation & Auth** | Zod schemas, JWT tokens, bcryptjs |

### Environment Variables

<details>
<summary><strong>Backend (server/.env)</strong></summary>

| Variable | Description |
|----------|-------------|
| `PORT` | Backend server port (default: 3000) |
| `DATABASE_URL` | PostgreSQL connection string with pooling |
| `DIRECT_URL` | PostgreSQL direct connection string |
| `GROQ_API_KEY` | Groq API Key |
| `GEMINI_API_KEY`| Google Gemini API Key |
| `JWT_SECRET` | Secret key used for JWT signing |
| `ALLOWED_ORIGINS` | List of allowed origins (comma-separated) |


> **Note:** You must provide at least one valid LLM API Key (`GROQ_API_KEY` or `GEMINI_API_KEY`) depending on which AI provider you configure in your backend settings. By default, the application will look for the Groq configuration.

</details>

<details>
<summary><strong>Frontend (client/.env)</strong></summary>

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Base endpoint of backend server (`http://localhost:3000/api`) |

</details>

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new candidate account |
| `POST` | `/api/auth/login` | Authenticate candidate credentials |
| `POST` | `/api/interview/start` | Start a new mock interview session |
| `POST` | `/api/interview/message` | Submit an answer turn to the AI interviewer |
| `GET` | `/api/interview/history/:userId` | Retrieve past simulation runs for a specific candidate |
| `GET` | `/api/interview/details/:interviewId` | Fetch full logs and scorecard of a specific session |
| `DELETE` | `/api/interview/:interviewId` | Permanently delete a simulation session |

## Team

Built for [Borderless Coding](https://github.com/ProgramadoresSemPatria) Hackathon 2026.
