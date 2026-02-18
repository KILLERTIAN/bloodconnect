# BloodConnect Mobile App (CodeRed Appathon)

A centralized, scalable, and secure mobile application designed to streamline internal operations for BloodConnect. This application transforms fragmented manual processes (spreadsheets, WhatsApp groups) into a unified technology-driven ecosystem.

## 🚀 Vision
To enhance coordination, transparency, and operational efficiency within BloodConnect, ensuring that every blood request is met with the fastest possible response through optimized volunteer and donor management.

## ✨ Features (MVP UI Demo)
- **Role-Based Access Control**: Tailored dashboards for Admin, Managers, Helpline, and Volunteers.
- **Volunteer Management**: Profile creation, performance tracking, and task status.
- **Donor Database**: Searchable donor records by blood group and city.
- **Helpline System**: Real-time request tracking and priority-based alerts.
- **Modern UI/UX**: Minimalistic, professional design inspired by Apple Health/Fitness apps, optimized for both Android and iOS.

## 🛠️ Tech Stack
- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Navigation**: [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
- **UI Components**: [React Native Paper](https://reactnativepaper.com/)
- **Icons**: [Lucide React Native](https://lucide.dev/guide/packages/lucide-react-native)
- **State Management**: React Context API (Auth & Role management)
- **Language**: TypeScript

## 🏗️ Architecture Overview

The application follows a modular architecture designed for scalability:

### 1. Presentation Layer (App)
Located in the `/app` directory, utilizing Expo Router for navigation:
- `(tabs)/`: Main navigation hub containing Dashboard, Management, Helpline, and Profile.
- `onboarding`: Multi-slide introduction to the app's value proposition.
- `login`: Simplified dummy authentication flow.
- `role-selection`: Centralized role switching to simulate various user experiences.

### 2. Context Layer
- `AuthContext`: Manages the dummy authentication state and stores the current user's role (Admin, Volunteer, etc.).

### 3. Component Layer
- Reusable UI components built on top of React Native Paper, following a consistent design system (Medical Red theme).

## 📱 How to Run
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npx expo start
   ```
3. Open on Android Emulator or iOS Simulator.

---
*Built with ❤️ for BloodConnect by Antigravity*
