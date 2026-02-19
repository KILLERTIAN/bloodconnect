# BloodConnect Mobile App (CodeRed Appathon)

A centralized, scalable, and secure mobile application designed to streamline internal operations for BloodConnect. This application transforms fragmented manual processes (spreadsheets, WhatsApp groups) into a unified technology-driven ecosystem, ensuring that every blood request is met with the fastest possible response.

> **Note:** This project includes a production-ready **Android APK** which can be downloaded and installed directly.

## 📥 **Download & Install (Android)**

The latest production APK is available in the root directory. You can install it on your Android device using `adb` or by transferring the file to your phone.

**APK File:** `BloodConnect.apk`

### **Installation Instructions**
1.  **Using ADB (Android Debug Bridge):**
    ```bash
    adb install -r BloodConnect.apk
    ```
2.  **Manual Install:**
    - Transfer the `.apk` file to your Android device.
    - Open the file using your file manager.
    - Enable "Install from unknown sources" if prompted.
    - Tap "Install".

---

## 🚀 **Vision**
To enhance coordination, transparency, and operational efficiency within BloodConnect through optimized volunteer and donor management.

## ✨ **Key Features**
*   **Role-Based Access Control:** Tailored dashboards for Admin, Managers, Helpline, and Volunteers.
*   **Offline-First Architecture:** Built with **SQLite (Turso)** to work seamlessly even without internet connectivity, syncing automatically when back online.
*   **Volunteer Management:** complete profile creation, performance tracking, and task status updates.
*   **Donor Database:** efficient, searchable donor records by blood group and city.
*   **Helpline System:** Real-time request tracking with priority-based alerts.
*   **Camp Management:** Digital tools to organize and manage blood donation camps.
*   **Custom Design System:** A modern, minimalistic UI ( Medical Red theme) using **React Native Paper** and custom dialogs for a premium user experience.

## 🛠️ **Tech Stack**
-   **Framework:** [Expo](https://expo.dev/) (React Native)
-   **Database:** [Turso](https://turso.tech/) (SQLite) with offline syncing
-   **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) (File-based routing)
-   **UI Library:** [React Native Paper](https://reactnativepaper.com/)
-   **Background Services:** Custom native modules for background tasks (if applicable)
-   **Language:** TypeScript

## 🏗️ **Architecture Overview**
The application follows a modular, offline-first architecture:
*   **Presentation Layer (`/app`):** Handles UI and Navigation using Expo Router.
*   **Logic Layer (`/lib`, `/context`):**
    *   `AuthContext`: Manages user authentication and role-based permissions.
    *   `DialogContext`: Provides a global, custom dialog system replacing native alerts.
    *   `database.ts` & `sync.service.ts`: Handles local SQLite operations and synchronization with the remote Turso database.

## 📱 **How to Run Locally**
1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Setup Environment:**
    Ensure you have your `.env` file configured with Turso credentials.
3.  **Start Development Server:**
    ```bash
    npx expo start
    ```
4.  **Run on Device/Emulator:**
    -   Press `a` for Android Emulator.
    -   Press `i` for iOS Simulator.
    -   Scan the QR code with the Expo Go app (for development).

---
*Built with ❤️ for BloodConnect by Antigravity*
