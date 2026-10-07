# 🌊 Whelmer — Gentle AI Focus & Task Companion for Executive Dysfunction

[![React Native](https://img.shields.io/badge/React_Native-0.74+-61DAFB?style=flat&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK_51-000000?style=flat&logo=expo)](https://expo.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-v10-FFCA28?style=flat&logo=firebase)](https://firebase.google.com/)
[![Google Gemini](https://img.shields.io/badge/AI-Google_Gemini-4285F4?style=flat&logo=googlegemini)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Whelmer** is an accessible, soothing task management and concentration app designed to support individuals navigating ADHD, burnout, and executive dysfunction. Instead of rigid deadlines and overwhelming to-do lists, Whelmer pairs intelligent micro-task breakdown with ambient focus tools and a supportive AI companion named **Milo**.

---

## ✨ Key Features

* 💬 **Milo — Your AI Companion:** Powered by Google Gemini (`gemini-2.5-flash`), Milo acts as an empathetic, non-judgmental body double. Milo helps process emotional overwhelm and automatically splits overwhelming goals into bite-sized micro-tasks.
* 📋 **Micro-Chunked Task Manager:** Organise and track subtask progress with low cognitive noise. Complete steps easily without arbitrary percentage fatigue.
* ⏱️ **Focus Sessions & Soundscapes:** Built-in Pomodoro timer paired with soothing ambient sound tracks (Lo-Fi, Brown Noise) via `expo-av` to maintain flow state.
* 🎨 **Calming, Accessible UI:** Built around a neurodivergent-friendly palette (**Soft Cyan `#91D2D9`**, **Light Cream `#EFF2E4`**, and **Muted Sage `#D7D9A3`**) designed to minimize sensory overload.
* 🔒 **Multi-Tenant Security:** Full user authentication and real-time cloud data isolation using Firebase Auth and Firestore.

---

## 🎨 Color Palette

| Color Name | Hex Code | Purpose |
| :--- | :--- | :--- |
| **Soft Cyan** | `#91D2D9` | Brand Primary / Active Indicators & Headers |
| **Light Cream** | `#EFF2E4` | Background / Canvas Container |
| **Muted Sage** | `#D7D9A3` | Accent Cards / Timer Containers |
| **Dark Slate** | `#2D3748` | High-Contrast Accessible Text |

---

## 📱 App Architecture & Screens

1. **Auth Screen:** Secure login and registration powered by Firebase Auth.
2. **Dashboard (Home):** Low-friction overview featuring Milo's quick check-in banner, 1-tap Pomodoro timer, and high-priority micro-tasks.
3. **Milo AI Chat:** Grounding conversational screen with structured prompt chips (*"I feel overwhelmed"*, *"Break down my task"*) and 1-tap task exporting.
4. **Task Manager:** Interactive task list featuring subtask breakdown drawers and real-time state syncing.
5. **Focus & Sound:** Configurable timer with ambient noise controls.
6. **Settings:** User profile and app preferences.

---

## 🛠️ Tech Stack

* **Frontend:** React Native, Expo, React Native Paper / Tailwind CSS (NativeWind)
* **State & Navigation:** React Navigation v6, React Hooks
* **Backend & Database:** Firebase Authentication, Cloud Firestore
* **AI Engine:** Google Gemini API (`gemini-2.5-flash`)
* **Audio Engine:** `expo-av`

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
* [Node.js](https://nodejs.org/) (v18 or higher)
* [Expo Go](https://expo.dev/client) app on your mobile device (or iOS Simulator / Android Studio)
* A [Firebase Project](https://console.firebase.google.com/)
* A [Google Gemini API Key](https://aistudio.google.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/whelmer.git](https://github.com/your-username/whelmer.git)
   cd whelmer
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```
   
3. **Configure Environment Variables:**
   Create a .env file in the root directory and add your credentials:
   ```bash
   EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
   EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
   ```

4. **Start the development server:**
   ```bash
   npx expo start
   ```
   Scan the QR code with the Expo Go app on iOS/Android to run Whelmer on your device.
    
##🔒 Security & Privacy
- Data Isolation: User task logs, chat strings, and preferences are segregated using Firestore Security Rules anchored to request.auth.uid.
- API Protection: System instruction boundaries restrict Gemini responses exclusively to supportive productivity coaching.

##📄 License
Distributed under the MIT License. See LICENSE for more information.
