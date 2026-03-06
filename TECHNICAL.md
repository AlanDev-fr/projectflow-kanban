# ProjectFlow Kanban - Technical Documentation

> **Complete technical reference** for developers who want to understand, modify, or contribute to this project.

---

## Table of Contents

1. [What is This Application?](#what-is-this-application)
2. [Technologies & Libraries](#technologies--libraries)
3. [Project Structure](#project-structure)
4. [How It Works](#how-it-works)
   - [Authentication Flow](#authentication-flow)
   - [Real-Time Sync](#real-time-sync)
   - [Notification System](#notification-system)
5. [Firebase Configuration](#firebase-configuration)
6. [Installation Guide](#installation-guide)
7. [Color Palette & Theming](#color-palette--theming)
8. [Running the Project](#running-the-project)
9. [Testing](#testing)
10. [Code Standards](#code-standards)
11. [Known Issues](#known-issues)

---

## What is This Application?

**A mobile-native project management app** (like Trello) built with React Native Expo and Firebase.

**Objective**: Let users organize tasks on a visual Kanban board with **4 states**: TODO → In Progress → Review → Done.

**Use Cases**:
- Manage development sprints
- Organize project tasks
- Small team collaboration
- Track project progress
- Automated task reminders

**Difference vs Trello**:
| Aspect | Trello | This App |
|--------|--------|----------|
| Platform | Web (responsive) | Native mobile (iOS/Android/Web) |
| Notifications | ❌ No | ✅ Yes, automatic |
| Drag & Drop | ✅ Smooth | ✅ Optimized for touch |
| Dark theme | ❌ (paid) | ✅ Free |
| Offline | ❌ | 🚧 Planned |
| Cost | $$ (Trello) | Free |

---

## Technologies & Libraries

| Technology | Version | Purpose |
|------------|---------|-----------|
| React Native | 0.81.5 | Base framework |
| React | 19.1.0 | UI library |
| Expo | 54.x | Development platform |
| Firebase | 12.6.0 | Backend (Auth + Firestore) |
| React Navigation | 7.x | Screen navigation |
| React Native Reanimated | 4.1.1 | Smooth animations + drag & drop |
| React Native Gesture Handler | 2.28.0 | Touch gesture handling |
| Expo Notifications | 0.32.14 | Push notification system |
| Expo Haptics | 15.0.7 | Tactile feedback |
| Expo Image | 3.0.10 | Image optimization |
| Expo Crypto | 15.0.7 | Data encryption |
| React Native Safe Area Context | 5.6.0 | Safe area handling |
| AsyncStorage | 1.24.0 | Local persistent storage |
| Google Sign-In | 16.0.0 | Google OAuth authentication |

### Why These Libraries?

#### 🏗️ Main Stack: React Native + Expo
- **React Native**: Single codebase for iOS + Android (avoid duplication)
- **Expo**: Faster development without compiling Xcode/Android Studio (just `npm start`)
- **Benefit**: 1 codebase = 3 platforms (iOS, Android, Web)

#### 🎯 Authentication: Firebase Auth
- **Why Firebase vs Auth0/Supabase**:
  - Perfect integration with Firestore (same platform)
  - Built-in OAuth (Google, GitHub)
  - Tokens persisted automatically
  - Managed by Google (reliable)
  - Generous free tier

#### 🗄️ Database: Firestore
- **Why Firestore vs SQL/PostgreSQL**:
  - Real-time out-of-box (changes sync automatically)
  - NoSQL = flexible (no fixed structure)
  - Scalable without thinking about servers
  - Granular security per document
  - Offline-first possible (for v2.0)

#### 🎨 Animations: Reanimated + Gesture Handler
- **Why not use native Animated**:
  - Reanimated: animations on UI thread (60fps guaranteed)
  - Gesture Handler: smooth drag & drop on mobile
  - Without these = app lags when dragging

#### 📱 Notifications: Expo Notifications
- **Why not react-native-firebase or push-notifications**:
  - Works with Expo Go (no compilation)
  - Android channels support
  - Pending notification persistence
  - Simple API

#### 📅 Date Picker: Custom Native Components
- **Why not `react-native-date-picker` or `react-native-modal-datetime-picker`**:
  - Fewer dependencies = fewer bugs
  - Full UI/UX control
  - Work offline
  - Smaller bundle size
  - No native plugins needed

---

## Project Structure

```
/
├── App.tsx                    # Main entry point
├── index.js                   # App registration
├── app.json                   # Expo configuration
├── package.json               # Project dependencies
├── tsconfig.json              # TypeScript configuration
├── babel.config.js            # Babel configuration
├── design_guidelines.md       # Design guidelines
├── GoogleService-Info.plist   # Firebase iOS config
└── google-services.json       # Firebase Android config
│
├── assets/                    # Static resources
│   ├── images/
│   │   ├── icon.png           # App icon
│   │   ├── splash-icon.png    # Splash screen icon
│   │   ├── favicon.png        # Web favicon
│   │   └── google-icon.svg    # Google Sign-In icon
│
├── components/                # Reusable components
│   ├── Button.tsx             # Custom button with animations
│   ├── TaskCard.tsx           # Task card with drag & drop
│   ├── ProjectModal.tsx       # Create/edit project modal
│   ├── TaskFormModal.tsx      # Create/edit task modal
│   ├── ProjectDetailsModal.tsx # Project statistics modal
│   ├── TutorialOverlay.tsx    # Interactive tutorial spotlight overlay
│   ├── DatePickerInput.tsx    # Custom date picker
│   ├── DateTimePickerInput.tsx # Custom date + time picker
│   ├── LayoutSelector.tsx     # Board view selector
│   ├── ErrorBoundary.tsx      # App error handling
│   ├── ThemedText.tsx         # Text with dynamic theme
│   ├── ThemedView.tsx         # View with dynamic theme
│   ├── Column.tsx             # Kanban column component
│   └── Card.tsx               # Generic reusable card
│
├── constants/                 # App constants
│   └── theme.ts               # Colors, spacing, typography, shadows
│
├── hooks/                     # Custom hooks
│   ├── useColorScheme.ts      # System theme detection
│   └── useScreenInsets.ts     # Screen insets + header
│
├── navigation/                # Navigation setup
│   ├── RootNavigator.tsx      # Main navigator with auth
│   └── screenOptions.ts       # Common screen options
│
├── screens/                   # App screens
│   ├── LoginScreen.tsx        # Login screen
│   ├── RegisterScreen.tsx     # Register screen
│   ├── DashboardScreen.tsx    # Project list with stats
│   └── ProjectScreen.tsx      # Kanban board with 3 views
│
└── src/                       # Business logic
    ├── firebaseConfig.ts      # Firebase configuration
    ├── contexts/
    │   ├── AuthContext.tsx    # Authentication context
    │   ├── ThemeContext.tsx   # Theme context (light/dark/system)
    │   └── Tutorialcontext.tsx # Tutorial state management
    └── services/
        ├── firestore.ts       # Firestore CRUD with real-time
        └── notifications.ts   # Push notification system
```

---

## How It Works

### User Workflow

#### 1️⃣ Authentication
```
User opens app
    ↓
Is logged in? (check AsyncStorage + Firebase Auth)
    ├─ NO → LoginScreen (email/password, Google, GitHub OAuth)
    │       ├─ Successful login → save session
    │       └─ Register → RegisterScreen
    └─ YES → DashboardScreen (project list)
```

#### 2️⃣ Dashboard - View and Manage Projects
```
DashboardScreen
    ├─ StatsCard: Shows global totals
    │   ├─ Total tasks
    │   ├─ Completed tasks
    │   └─ Progress percentage
    │
    ├─ Project List: For each project shows
    │   ├─ Name and description
    │   ├─ Custom icon and color
    │   ├─ Counter: [2 TODO] [1 DOING] [0 REVIEW] [3 DONE]
    │   └─ Tap → Opens ProjectScreen
    │
    ├─ "+" Button → ProjectModal to create new project
    ├─ "⚙️" Button → Settings modal (theme, logout)
    └─ Real-time sync with Firestore
```

#### 3️⃣ ProjectScreen - Kanban Board
```
ProjectScreen
    ├─ LayoutSelector: Choose view
    │   ├─ Compact (default, stacked columns)
    │   ├─ Grid (2x2, ideal for tablets)
    │   └─ Read-only (no drag & drop)
    │
    ├─ 4 Kanban Columns:
    │   ├─ TODO (To Do) - Yellow
    │   ├─ DOING (In Progress) - Blue
    │   ├─ REVIEW (Review) - Purple
    │   └─ DONE (Completed) - Green
    │
    ├─ TaskCard (each task shows):
    │   ├─ Title and description
    │   ├─ Priority (color: red/orange/green)
    │   ├─ Due date (if overdue, marked red)
    │   ├─ Custom labels
    │   └─ Assigned to user
    │
    ├─ Drag & Drop:
    │   ├─ Drag TaskCard between columns
    │   ├─ Haptic feedback on release
    │   └─ Auto-sync with Firestore
    │
    ├─ Tap on TaskCard:
    │   ├─ Opens TaskFormModal
    │   └─ Can edit all fields
    │
    ├─ "+" Button in each column:
    │   ├─ Opens TaskFormModal
    │   └─ Creates task in that column
    │
    └─ Multi-select (long-press):
        ├─ Mark tasks for deletion
        └─ Delete button with confirmation
```

---

### Authentication Flow

**How AuthContext Works:**

```typescript
// In any screen, access with:
const { user, isLoading, login, register, logout } = useAuth();

// Login flow:
1. User enters email/password in LoginScreen
2. Call: await authContext.login(email, password)
3. Firebase Auth validates credentials against database
4. If correct: returns UID and email
5. Save in AsyncStorage (for persistence)
6. Set global state → user is not null
7. RootNavigator detects user != null → shows DashboardScreen

// Session persistence:
- When app opens → checks AsyncStorage
- If saved token → restores session automatically
- User returns to DashboardScreen without logging in again
- If logout → clears AsyncStorage and returns to LoginScreen
```

**Location**: `/src/contexts/AuthContext.tsx`

---

### Real-Time Sync

**The key concept**: Instead of making HTTP requests every time, **we subscribe** to changes in Firestore:

```typescript
// In DashboardScreen
useEffect(() => {
  // Subscribe to user's project changes
  const unsubscribe = firestore.subscribeToProjects(userId, (projects) => {
    setProjects(projects);  // Auto-updates state when changes occur
  });
  
  // Clean up subscription when component unmounts
  return unsubscribe;
}, [userId]);

// Result:
// - Open app → gets project list
// - Another device creates project → updates automatically here
// - Zero latency, zero polling
```

#### Firestore Services

##### Projects

```typescript
// Subscribe to user's projects (real-time)
subscribeToProjects(
  userId: string, 
  callback: (projects: Project[]) => void
): () => void

// Create project
createProject(
  title: string, 
  userId: string, 
  options?: { description, color, icon }
): Promise<string>

// Update project
updateProject(
  projectId: string, 
  updates: Partial<Project>
): Promise<void>

// Delete project (cascade delete tasks)
deleteProject(projectId: string): Promise<void>
```

##### Tasks

```typescript
// Subscribe to project tasks
subscribeToTasks(
  projectId: string, 
  callback: (tasks: Task[]) => void
): () => void

// Create task
createTask(
  projectId: string, 
  taskData: Partial<Task>
): Promise<string>

// Update task
updateTask(
  projectId: string, 
  taskId: string, 
  updates: Partial<Task>
): Promise<void>

// Update only status (drag & drop)
updateTaskStatus(
  projectId: string, 
  taskId: string, 
  status: Task["status"]
): Promise<void>

// Delete task
deleteTask(
  projectId: string, 
  taskId: string
): Promise<void>
```

---

### Notification System

#### 📱 How Reminders Work

**Scenario**: User creates task with reminder date/time.

```
1. User opens TaskFormModal
   ├─ Selects due date with DatePickerInput
   ├─ Selects reminder time with DateTimePickerInput
   └─ Taps "Save"

2. TaskFormModal calls:
   └─ firestore.createTask(projectId, taskData)
   └─ notifications.requestNotificationPermissions() [first time]
   └─ notifications.scheduleTaskReminder(taskId, title, reminderDate)

3. scheduleTaskReminder():
   ├─ Calculates time until notification
   ├─ Android: Configures channel (sound + vibration)
   ├─ Sends to Expo Notifications
   └─ Returns notificationId (saved in Firestore)

4. When time arrives:
   ├─ OS triggers notification
   ├─ Shows: "Reminder: [Task name]"
   ├─ Sound + vibration
   └─ Tap notification:
       ├─ Opens app
       ├─ App.tsx receives onNotificationResponseReceived event
       ├─ Navigates to ProjectScreen with that task
       └─ User can view it immediately

5. If task deleted:
   └─ notifications.cancelTaskReminder(notificationId)
       └─ Cancels pending notification
```

#### 🔔 Service Functions (`/src/services/notifications.ts`)

```typescript
// 1. Request permissions (shows dialog to user)
requestNotificationPermissions(): Promise<boolean>
  // Returns: true if accepted, false if rejected
  // Android: auto-configures "task-reminders" channel
  // iOS: shows system dialog

// 2. Schedule reminder for task
scheduleTaskReminder(
  taskId: string,          // Task ID in Firestore
  taskTitle: string,       // Ex: "Finish login"
  reminderDate: Date       // Ex: new Date("2025-12-10 14:30")
): Promise<string | null>
  // Returns: Notification ID (save in Firestore)
  // If error: returns null

// 3. Cancel scheduled reminder
cancelTaskReminder(notificationId: string): Promise<void>
  // If user edits task and changes time
  // Or if deletes task
  // Cancels pending notification

// 4. Subscribe to notification events
subscribeToNotifications(
  callback: (notification: Notification) => void
): () => void
  // Listens when notification arrives
  // Returns unsubscribe function
```

#### ⚠️ Important Notes
- **Physical devices only**: Expo Go notifications don't work properly in simulators
- **Timezones**: Time auto-converts to device timezone
- **App closed**: Works even when app is closed (OS notification)
- **Precision**: ±1 minute precision (OS limitation)

---

### Interactive Tutorial System

#### 🎓 How the Tutorial Works

**The key concept**: The app features a context-aware interactive tutorial that guides users through different screens and modals using a spotlight overlay and an animated mascot.

**Location**: 
- Logic: `/src/contexts/Tutorialcontext.tsx`
- UI Overlay: `/components/Tutorialoverlay.tsx`

```typescript
// How to use the tutorial in any component:
const { 
  showTutorial, 
  currentStep, 
  nextStep, 
  prevStep, 
  skipTutorial 
} = useTutorial();
```

#### 🕹️ Tutorial Features
- **Dynamic Spotlighting**: `TutorialOverlay` accepts element coordinates (X/Y, width/height) and renders a dark overlay with a transparent hole (circle or rectangle) highlighting the target UI element.
- **Cross-Component Navigation**: The tutorial flows seamlessly from the `DashboardScreen` (creating a project) into the `ProjectModal`, and then onto the `ProjectScreen` and `TaskFormModal`.
- **Async Storage Persistence**: Remembers if the user has already completed the tutorial, preventing it from showing on subsequent app launches.
- **Absolute Positioning**: To ensure the spotlight correctly targets elements inside scrollable layouts or modals, components use `.measure()` or `onLayout` to report their exact screen coordinates to the view state.

---

## Firestore Data Structure

### Collection: `projects`

```typescript
interface Project {
  id: string;           // Auto-generated Firestore ID
  title: string;        // Project name
  description?: string; // Optional description
  userId: string;       // Owner user UID
  color?: string;       // Project hex color (#3B82F6)
  icon?: string;        // Feather icon name
  createdAt: Timestamp; // Creation date
}
```

### Subcollection: `projects/{projectId}/tasks`

```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "DOING" | "REVIEW" | "DONE";
  priority?: "Alta" | "Media" | "Baja";
  dueDate?: Timestamp;
  assignee?: string;
  collaborators?: string[];
  labels?: Array<{ name: string; color: string }>;
  commentsCount?: number;
  createdAt: Timestamp;
}
```

---

## Firebase Configuration

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create new project
3. Name: "ProjectFlow" (or your preference)

### Step 2: Enable Authentication

1. **Authentication** → **Get Started**
2. Enable these methods:
   - ✅ **Email/Password**
   - ✅ **Google** (configure OAuth with your Client ID)
   - ✅ **GitHub** (configure OAuth App on GitHub)

### Step 3: Create Firestore Database

1. **Firestore Database** → **Create database**
2. Select **Test mode** (development)
3. Location: `us-central` or closest

### Step 4: Security Rules (Production)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Projects: owner only
    match /projects/{projectId} {
      allow read, write: if request.auth.uid == resource.data.userId;
      // Tasks inside projects
      match /tasks/{taskId} {
        allow read, write: if request.auth.uid == get(/databases/$(database)/documents/projects/$(projectId)).data.userId;
      }
    }
  }
}
```

### Step 5: Google OAuth Setup

1. **In Firebase Console**:
   - Authentication → Sign-in method → Google
   - Enable and copy "Web Client ID"

2. **In project**:
   - No additional config needed (already in `firebaseConfig.ts`)
   - Web Client ID auto-loads from Firebase config

### Step 6: GitHub OAuth Setup

1. **On GitHub**:
   - Settings → Developer settings → OAuth Apps → New OAuth App
   - Application name: "ProjectFlow"
   - Homepage URL: `https://your-app-domain.com`
   - Authorization callback URL: `https://your-app-domain.com/__/auth/handler`
   - Copy: Client ID and Client Secret

2. **In Firebase Console**:
   - Authentication → Sign-in method → GitHub
   - Paste Client ID and Client Secret
   - Copy Authorization callback URL from Firebase

### Step 7: Download Configs

**For iOS** (`GoogleService-Info.plist`):
1. Firebase Console → Project Settings → Apps
2. Select your iOS app
3. Download `GoogleService-Info.plist`
4. Copy to project root

**For Android** (`google-services.json`):
1. Firebase Console → Project Settings → Apps
2. Select your Android app
3. Download `google-services.json`
4. Copy to `android/app/`

### Step 8: Configure Bundle IDs

In `app.json`, update:
```json
{
  "android": {
    "package": "com.yourcompany.projectflow"
  },
  "ios": {
    "bundleIdentifier": "com.yourcompany.projectflow"
  }
}
```

Ensure they match those registered in Firebase.

---

## Installation Guide

### Prerequisites

- **Node.js** >= 18.x ([download](https://nodejs.org))
- **npm** >= 9.x (included with Node.js)
- **Expo CLI** (install globally: `npm install -g expo-cli`)
- **Git** (optional but recommended)

### Installation Steps

```bash
# 1. Clone or download project
git clone <your-repo>
cd FirebaseGestor

# 2. Install dependencies
npm install

# 3. (OPTIONAL) Install Expo CLI globally
npm install -g expo-cli

# 4. Create .env file (if using environment variables)
# (In this project, Firebase config is in firebaseConfig.ts)

# 5. Verify installation
npm run lint
```

### Verify Everything Works

```bash
# Check versions
node --version   # >= 18.x
npm --version    # >= 9.x
expo --version   # >= 54.x

# Should show:
# v18.18.0 (or higher)
# 9.8.1 (or higher)
# 54.0.0 (or higher)
```

If any version is lower, update:
```bash
# Update Node.js
# Download from: https://nodejs.org

# Update npm
npm install -g npm@latest

# Update Expo CLI
npm install -g expo-cli@latest
```

Ready to start:
```bash
# Start development server
npm start

# You should see a QR code in terminal
# Scan it with Expo Go (iOS/Android)
```

---

## Color Palette & Theming

### Light Mode

| Use | Name | Hex |
|-----|--------|-----|
| Main text | text | #2C3E50 |
| Secondary text | textSecondary | #7F8C8D |
| Primary | primary | #4A90E2 |
| Secondary | secondary | #3e699aff |
| Success | success | #50C878 |
| Danger | danger | #E74C3C |
| Warning | warning | #F39C12 |
| Info | info | #b9e346ff |
| Root background | backgroundRoot | #F5F7FA |
| Card background | cardBackground | #FFFFFF |
| Overlay/Modal | overlay | rgba(0,0,0,0.5) |

### Dark Mode

| Use | Name | Hex |
|-----|--------|-----|
| Main text | text | #ECEDEE |
| Secondary text | textSecondary | #9BA1A6 |
| Primary | primary | #5A9FF0 |
| Secondary | secondary | #3e699aff |
| Success | success | #5AD589 |
| Danger | danger | #E95B4E |
| Warning | warning | #F5A623 |
| Info | info | #b9e346ff |
| Root background | backgroundRoot | #1F2123 |
| Card background | cardBackground | #353739 |
| Overlay/Modal | overlay | rgba(0,0,0,0.7) |

### Spacing

```typescript
xs: 4px      // Minimum spacing
sm: 8px      // Small spaces
md: 12px     // Default spacing
lg: 16px     // Large spacing
xl: 20px     // Extra large
2xl: 24px    // 2x extra large
3xl: 32px    // 3x extra large
4xl: 40px    // 4x extra large
5xl: 48px    // 5x extra large
```

### Border Radius

```typescript
xs: 8px      // Very rounded borders
sm: 10px
md: 12px     // Default for buttons
lg: 14px
xl: 16px     // Large cards
2xl: 20px
3xl: 24px
full: 9999px // Completely round (pills)
```

Complete file: `/constants/theme.ts`

---

## Running the Project

### Local Development

```bash
# Start Expo server (listens on localhost:8081)
npm start
```

You'll see an interactive menu:
```
› Press i to open iOS simulator, or press w to open web client
› Press a to open Android emulator or connected device
› Press w to open web client
› Press r to reload app
› Press m to toggle menu
```

### On Emulator/Simulator

**iOS** (requires Mac):
```bash
npm run ios
# Or after npm start → press 'i'
```

**Android** (requires open emulator):
```bash
npm run android
# Or after npm start → press 'a'
```

**Web**:
```bash
npm run web
# Or after npm start → press 'w'
```

### On Physical Device

1. **Install Expo Go**:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Start server**:
   ```bash
   npm start
   ```

3. **Scan QR**:
   - Open Expo Go
   - Scan QR code shown in terminal
   - App loads automatically (30-60 seconds)

### Production Build

**iOS** (requires Mac + Apple Developer Account):
```bash
eas build --platform ios
```

**Android** (requires Google Play Developer Account):
```bash
eas build --platform android
```

**Web** (static hosting):
```bash
npm run web:build
# Generates 'dist/' folder ready to deploy
```

---

## Testing

### Current Status

Project **does not include automated tests** in this version (v1.0).

### How to Add Tests (Future Guide)

For v2.0, recommended setup:

**Setup**:
```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native
```

**Example test for Button component**:
```typescript
// components/__tests__/Button.test.tsx
import { render } from '@testing-library/react-native';
import Button from '../Button';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(<Button>Press</Button>);
    expect(getByText('Press')).toBeDefined();
  });
});
```

**Run**:
```bash
npm test
```

---

## Code Standards

### Format

```bash
# Check format
npm run check:format

# Auto-fix
npm run format
```

### Linting

```bash
# Check errors
npm run lint

# Auto-fix (when possible)
npm run lint -- --fix
```

### Configuration

- **Prettier** (`.prettierrc`): Width 100, 2-space tabs
- **ESLint** (`eslint.config.js`): Based on Expo config
- **TypeScript** (`tsconfig.json`): Strict mode enabled

### Code Conventions

1. **File names**: `PascalCase` for components, `camelCase` for utilities
   ```
   components/Button.tsx ✅
   utils/formatDate.ts ✅
   services/firestore.ts ✅
   ```

2. **Variable names**: `camelCase`
   ```typescript
   const userData = {}; // ✅
   const projectsList = []; // ✅
   ```

3. **Constants**: `UPPER_SNAKE_CASE`
   ```typescript
   const MAX_TASKS = 1000; // ✅
   const DEFAULT_TIMEOUT = 5000; // ✅
   ```

4. **Imports**: Group in order
   ```typescript
   // React
   import React from 'react';
   import { View } from 'react-native';
   
   // External libraries
   import { useNavigation } from '@react-navigation/native';
   
   // Local modules
   import { Button } from '@/components';
   import { useTheme } from '@/src/contexts/ThemeContext';
   ```

5. **Types**: Use interfaces for complex structures
   ```typescript
   interface User {
     id: string;
     email: string;
   }
   ```

---

## Known Issues

### ⚠️ Warning: Reanimated `.value`
```
WARN It looks like you might be using shared value's .value inside reanimated inline style
```
**Cause**: Using `.value` in animated styles  
**Impact**: Only warning, doesn't affect functionality  
**Solution**: Ignore or refactor animations

### ⚠️ Text strings warning (non-critical)
```
ERROR Text strings must be rendered within a <Text> component
```
**Cause**: Rendering arrays or strings without `<Text>` wrapper  
**Impact**: Only appears on start, doesn't crash app  
**Status**: Known, doesn't affect production

---

## Troubleshooting

| Problem | Solution |
|----------|----------|
| "metro bundler stuck" | Press Ctrl+C, run `npm start` again |
| "Permission denied" | On Linux/Mac: `sudo chown -R $USER .` |
| "Cannot find module Firebase" | Run `npm install` again |
| "Emulator not found" | Open Android Studio and create/start emulator |
| "App doesn't see changes (hot reload)" | Press 'r' in terminal |
| "QR doesn't work" | Ensure phone is on same WiFi network |

---

## License

**MIT License** - Copyright (c) 2025

---

**Built with ❤️ using React Native + Expo + Firebase**
