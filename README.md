# 🚨 SafeSteps

**SafeSteps** is a real-time women’s safety mobile application designed to offer instant emergency assistance, live community reports, and safer travel suggestions.

With cutting-edge features like geolocation, safety heatmaps, and trusted contacts, SafeSteps helps users stay **safe, informed, and connected** wherever they are.

> ✅ **Currently compatible with Expo SDK 52**
> 🔧 Ready for upgrade to Expo SDK 53 (see below)

---

## 🚀 Features

* 🆘 **SOS Emergency Alerts**
  One-tap or voice-triggered SOS to notify trusted contacts and emergency responders.

* 🗺️ **Community Incident Reporting**
  Report and view incidents in real-time to keep the community informed.

* 🔥 **Safety Heatmaps**
  Live visual maps highlighting danger zones based on recent reports (powered by Leaflet).

* 🛡️ **Safe Route Suggestions**
  Navigation paths that avoid reported risk areas.

* ⏰ **Check-In Timer**
  Automatically sends alerts if the user doesn’t check in within a set time.

* 📡 **Offline Awareness**
  Key features are optimized to work under low or no connectivity conditions.

* 👩‍👧‍👦 **Trusted Contacts**
  Add personal emergency contacts for quick notifications.

* 🏥 **Emergency Info Storage**
  Save blood group, allergies, and critical health data.



---

## 🧰 Tech Stack

| Layer          | Tools Used                                   |
| -------------- | -------------------------------------------- |
| **Mobile App** | React Native (Expo)                          |
| **Backend**    | Firebase (Firestore, Authentication)         |
| **Mapping**    | Leaflet with React Native compatibility      |
| **UI/UX**      | Figma, React Native Paper, Custom Components |
| **Routing**    | Expo Router                                  |
| **Utilities**  | Expo Location, Expo SMS, Toast Notifications |

---

## 📦 Getting Started

> 📌 **Tested and working on Expo SDK 52**

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/safesteps.git
cd safesteps-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

```bash
npx expo start
```

> 📱 Scan the QR code using **Expo Go** (compatible with SDK 52) to run the app on your device.

---

## 🆙 Upgrading to Expo SDK 53

Ready to move to the latest SDK? Follow these steps:

1. **Update Expo CLI (Optional):**

   ```bash
   npm install -g expo-cli
   ```

2. **Upgrade SDK:**

   ```bash
   npx expo upgrade
   ```

   * Select **SDK 53** when prompted.

3. **Install Updated Dependencies:**

   ```bash
   npm install
   ```

4. **Review Breaking Changes:**
   Check [Expo SDK 53 Release Notes](https://blog.expo.dev/expo-sdk-53-3e4d6e2e6d8b)

5. **Test Your App:**

   ```bash
   npx expo start
   ```

---

## 🗂️ Project Structure

```
safesteps-app/
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx             # Home
│   │   ├── explore.tsx           # View safety reports
│   │   ├── profile.tsx           # User profile & emergency info
│   │   ├── report.tsx            # Submit incident reports
│   │   ├── saferoutes.native.tsx # Safe route suggestions
│   │   ├── sos.tsx               # SOS trigger screen
│   │   └── _layout.tsx           # Tab navigation layout
│   ├── login.tsx
│   ├── signup.tsx
│   └── _layout.tsx
├── components/                   # Reusable UI components
├── constants/
│   └── Colors.ts
├── hooks/
│   └── useColorScheme.ts
├── firebase/
│   └── config.ts                 # Firebase config
├── assets/
│   └── images/
├── package.json
├── app.json
└── README.md
```

---


## ✅ Project Status

* ✔️ **MVP complete** with all core features implemented
* 🧠 **Future Enhancements:**

  * AI-powered safety prediction
  * Community Watch Mode
  * Smart safety tips and guidance

---

## 🤝 Contributing

We welcome contributions! Follow these steps:

1. **Fork the repository**
2. **Create a new branch**

   ```bash
   git checkout -b feature/YourFeature
   ```
3. **Commit your changes**

   ```bash
   git commit -am "Add your feature"
   ```
4. **Push your branch**

   ```bash
   git push origin feature/YourFeature
   ```
5. **Open a Pull Request** on GitHub

---

## 📄 License

This project is licensed under the **MIT License**.
See the [LICENSE](./LICENSE) file for more details.

---

## 🙌 Acknowledgements

* [Expo](https://expo.dev/)
* [Firebase](https://firebase.google.com/)
* [React Native](https://reactnative.dev/)




> **Stay safe. Stay informed. Stay connected — with SafeSteps.**


