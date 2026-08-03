# WChem - Backend Integration Guide

## Overview

Your WChem (VR Chemistry) app now has a complete InsForge backend with:
- **User Authentication** (Email/Password + Google/GitHub OAuth)
- **User Profiles** with XP, levels, and stats
- **Chemical Compounds Library** (17 elements pre-seeded)
- **Experiments** - Save and share chemistry simulations
- **Achievements System** - Unlock rewards for milestones
- **Leaderboard** - Compete with other chemists
- **User Sessions** - Track VR session activity

## Backend Configuration

**Project Name:** Wchem
**Region:** ap-southeast
**API URL:** https://3dcyc4u8.ap-southeast.insforge.app
**Dashboard:** https://insforge.dev/dashboard/project/8c464103-8025-4445-bd81-64e378a80134

## Quick Start

### 1. Import the Client

```javascript
// In your script.js or any JavaScript file
import insforgeClient from './backend/insforge-client.js';

// Or if not using modules:
// <script src="backend/insforge-client.js"></script>
// Use: window.insforgeClient
```

### 2. Authentication

```javascript
// Sign up new user
async function signUp() {
  const user = await insforgeClient.signUp(
    'user@example.com',
    'password123',
    { display_name: 'John Doe' }
  );
  console.log('Signed up:', user);
}

// Sign in existing user
async function signIn() {
  const session = await insforgeClient.signIn('user@example.com', 'password123');
  console.log('Signed in:', session);
}

// OAuth (Google/GitHub)
function signInWithGoogle() {
  const oauthUrl = insforgeClient.getOAuthUrl('google');
  window.location.href = oauthUrl;
}

// Check if authenticated
if (insforgeClient.isAuthenticated()) {
  console.log('User is logged in:', insforgeClient.user);
}

// Sign out
async function signOut() {
  await insforgeClient.signOut();
  console.log('Signed out');
}
```

### 3. User Profile

```javascript
// Get current user's profile
async function getMyProfile() {
  const userId = insforgeClient.getCurrentUserId();
  const profile = await insforgeClient.getProfile(userId);
  console.log('Profile:', profile);
  // { username, display_name, avatar_url, total_experiments, total_score, level, xp }
}

// Update profile
async function updateProfile() {
  const userId = insforgeClient.getCurrentUserId();
  await insforgeClient.updateProfile(userId, {
    username: 'cool_chemist',
    display_name: 'Cool Chemist'
  });
}
```

### 4. Experiments (Save/Load Chemistry Simulations)

```javascript
// Save current experiment
async function saveExperiment() {
  const experiment = await insforgeClient.createExperiment({
    user_id: insforgeClient.getCurrentUserId(),
    title: 'Water Molecule Formation',
    description: 'Creating H2O from hydrogen and oxygen',
    compounds_used: ['H', 'O'],
    reaction_data: {
      // Save your entire simulation state here
      particles: [
        { symbol: 'H', position: {x: 100, y: 200}, velocity: {x: 0, y: 0} },
        { symbol: 'H', position: {x: 120, y: 200}, velocity: {x: 0, y: 0} },
        { symbol: 'O', position: {x: 110, y: 180}, velocity: {x: 0, y: 0} }
      ],
      bonds: [
        { atom1: 0, atom2: 2 },
        { atom1: 1, atom2: 2 }
      ],
      // Any other simulation data...
    },
    is_public: true // Share with community
  });
  
  console.log('Experiment saved:', experiment.id);
  return experiment;
}

// Load an experiment
async function loadExperiment(experimentId) {
  const experiment = await insforgeClient.getExperiment(experimentId);
  console.log('Loaded experiment:', experiment);
  
  // Restore simulation state
  const reactionData = experiment.reaction_data;
  // Use reactionData to restore particles, bonds, etc.
}

// Get my experiments
async function getMyExperiments() {
  const userId = insforgeClient.getCurrentUserId();
  const experiments = await insforgeClient.getUserExperiments(userId);
  console.log('My experiments:', experiments);
}

// Browse public experiments
async function browseExperiments() {
  const experiments = await insforgeClient.getPublicExperiments(20, 0);
  console.log('Public experiments:', experiments);
}

// Like an experiment
async function likeExperiment(experimentId) {
  await insforgeClient.likeExperiment(experimentId);
  console.log('Liked!');
}
```

### 5. Chemical Compounds

```javascript
// Get all available compounds
async function getCompounds() {
  const compounds = await insforgeClient.getCompounds();
  console.log('Available compounds:', compounds);
  // Each compound has: symbol, name, atomic_number, atomic_mass, element_type, state, color
}

// Get specific compound
async function getCompound(symbol) {
  const compound = await insforgeClient.getCompound('H');
  console.log('Hydrogen:', compound);
}
```

### 6. Achievements & Gamification

```javascript
// Award XP to user (e.g., when completing an experiment)
async function awardXPForExperiment() {
  const userId = insforgeClient.getCurrentUserId();
  await insforgeClient.awardXP(userId, 10); // Award 10 XP
  
  // Check if any achievements were unlocked
  await insforgeClient.checkAchievements(userId);
}

// Get all achievements
async function getAchievements() {
  const achievements = await insforgeClient.getAchievements();
  console.log('All achievements:', achievements);
}

// Get user's unlocked achievements
async function getUnlockedAchievements() {
  const userId = insforgeClient.getCurrentUserId();
  const unlocked = await insforgeClient.getUserAchievements(userId);
  console.log('Unlocked:', unlocked);
}
```

### 7. Leaderboard

```javascript
// Get leaderboard
async function showLeaderboard() {
  const leaderboard = await insforgeClient.getLeaderboard('all_time', 100);
  console.log('Top chemists:', leaderboard);
  
  // Each entry has: user_id, score, rank, and nested profile data
  leaderboard.forEach(entry => {
    console.log(`#${entry.rank}: ${entry.profiles.display_name} - ${entry.score} points`);
  });
}

// Update leaderboard (run periodically or on-demand)
async function updateLeaderboard() {
  await insforgeClient.updateLeaderboard('all_time');
}
```

### 8. Track VR Sessions

```javascript
let currentSession = null;

// Start session when user enters VR mode
async function startVRSession() {
  const userId = insforgeClient.getCurrentUserId();
  currentSession = await insforgeClient.startSession(userId);
  console.log('Session started:', currentSession.id);
}

// End session when user exits VR mode
async function endVRSession(experimentsCreated, compoundsUsed, xpEarned) {
  if (currentSession) {
    await insforgeClient.endSession(currentSession.id, {
      experiments_created: experimentsCreated,
      compounds_used: compoundsUsed,
      xp_earned: xpEarned,
      duration_seconds: Math.floor((Date.now() - new Date(currentSession.session_start)) / 1000)
    });
    console.log('Session ended');
    currentSession = null;
  }
}
```

## Integration with Your VR App

Here's how to integrate the backend with your existing `script.js`:

```javascript
// Add to your script.js initialization
import insforgeClient from './backend/insforge-client.js';

// Initialize backend when app loads
async function initApp() {
  // Check if user is logged in
  if (insforgeClient.isAuthenticated()) {
    const user = await insforgeClient.getUser();
    console.log('Welcome back:', user);
    
    // Load user profile
    const profile = await insforgeClient.getProfile(user.id);
    displayUserStats(profile);
    
    // Start VR session
    await startVRSession();
  } else {
    // Show login UI
    showLoginDialog();
  }
}

// When user creates a compound in VR
async function onCompoundCreated(compoundSymbol) {
  // Track for achievements
  const userId = insforgeClient.getCurrentUserId();
  if (userId) {
    await insforgeClient.checkAchievements(userId);
  }
}

// Save button in VR menu
async function onSaveButtonPressed() {
  if (!insforgeClient.isAuthenticated()) {
    alert('Please sign in to save experiments');
    return;
  }
  
  // Collect current simulation state
  const experimentData = {
    user_id: insforgeClient.getCurrentUserId(),
    title: prompt('Experiment name:') || 'Untitled Experiment',
    description: prompt('Description (optional):') || '',
    compounds_used: getUsedCompounds(), // Your function
    reaction_data: getCurrentSimulationState(), // Your function
    is_public: confirm('Share with community?')
  };
  
  const saved = await insforgeClient.createExperiment(experimentData);
  alert('Experiment saved! ID: ' + saved.id);
  
  // Award XP
  await insforgeClient.awardXP(insforgeClient.getCurrentUserId(), 10);
  await insforgeClient.checkAchievements(insforgeClient.getCurrentUserId());
}

// Load button in VR menu
async function onLoadButtonPressed() {
  // Get user's experiments
  const experiments = await insforgeClient.getUserExperiments(
    insforgeClient.getCurrentUserId()
  );
  
  // Show selection UI
  showExperimentList(experiments);
}

function showExperimentList(experiments) {
  // Create UI to select experiment
  // When selected, call loadExperimentById(id)
}

async function loadExperimentById(id) {
  const experiment = await insforgeClient.getExperiment(id);
  restoreSimulationState(experiment.reaction_data);
}
```

## Database Schema

### Tables Available:

1. **profiles** - User profiles (username, level, XP, stats)
2. **compounds** - Chemical elements library (17 pre-seeded)
3. **experiments** - Saved chemistry simulations
4. **experiment_likes** - Track likes on experiments
5. **achievements** - Available achievements (7 pre-seeded)
6. **user_achievements** - Unlocked achievements per user
7. **leaderboard** - Competitive rankings
8. **user_sessions** - VR session tracking

### Pre-seeded Data:

**17 Chemical Elements:**
H, He, C, N, O, Na, Mg, Al, Si, P, S, Cl, Fe, Cu, Zn, Ag, Au

**7 Achievements:**
- First Steps (1 experiment)
- Experiment Master (10 experiments)
- Chemist (50 experiments)
- Element Explorer (5 compounds used)
- Periodic Master (10 compounds used)
- Social Butterfly (10 likes)
- Lab Influencer (100 likes)

## Security (Row Level Security)

All tables have RLS policies enabled:
- Users can only edit their own data
- Public experiments are viewable by everyone
- Private experiments only viewable by owner
- Compounds library is public read-only
- Leaderboard is public read-only

## Next Steps

1. **Add Login UI** - Create a login/signup dialog in your VR menu
2. **Save/Load Buttons** - Add experiment save/load functionality
3. **Leaderboard Display** - Show top chemists in your UI
4. **Achievement Notifications** - Show popup when achievements unlock
5. **Social Features** - Browse and like community experiments
6. **OAuth Integration** - Add Google/GitHub sign-in buttons

## Testing

You can test the backend directly from your browser console:

```javascript
// Sign up test user
await insforgeClient.signUp('test@example.com', 'password123', {
  display_name: 'Test Chemist'
});

// Create test experiment
await insforgeClient.createExperiment({
  user_id: insforgeClient.getCurrentUserId(),
  title: 'Test Experiment',
  compounds_used: ['H', 'O'],
  reaction_data: { test: true },
  is_public: true
});

// Check profile
const profile = await insforgeClient.getProfile(insforgeClient.getCurrentUserId());
console.log(profile);
```

## Environment Variables

The `.env.local` file contains your backend credentials:
- `VITE_INSFORGE_URL` - Backend API URL
- `VITE_INSFORGE_ANON_KEY` - Public anonymous key (safe for client-side)
- `INSFORGE_API_KEY` - Admin key (server-side only, never expose!)

**Important:** Add `.env.local` to your `.gitignore` to keep credentials secret!

## Support

- Dashboard: https://insforge.dev/dashboard/project/8c464103-8025-4445-bd81-64e378a80134
- Documentation: https://insforge.dev/docs
- API Reference: https://3dcyc4u8.ap-southeast.insforge.app/docs
