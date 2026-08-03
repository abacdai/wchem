# Quick Start Guide

## How to Run Your WChem (VR Chemistry) with Backend

### Option 1: Using the Start Script (Recommended)

1. Open terminal in your project folder:
```bash
cd /home/dominh/Desktop/Wchem
```

2. Run the server:
```bash
./start-server.sh
```

3. Open your browser and visit:
   - **Main app:** http://localhost:8000/index.html
   - **Backend test:** http://localhost:8000/backend-test.html

### Option 2: Manual Python Server

```bash
cd /home/dominh/Desktop/Wchem
python3 -m http.server 8000
```

Then open: http://localhost:8000/backend-test.html

### Option 3: Manual Node Server

```bash
cd /home/dominh/Desktop/Wchem
npx http-server -p 8000
```

Then open: http://localhost:8000/backend-test.html

## What to Test

1. **Backend Test Page** (http://localhost:8000/backend-test.html)
   - Click "Test Sign Up" to create a new account
   - Click "Get All Compounds" to see the 17 chemical elements
   - Try creating experiments, checking achievements, etc.

2. **Your VR App** (http://localhost:8000/index.html)
   - Now you can integrate the backend client into your VR app
   - See `backend/README.md` for integration examples

## Troubleshooting

**If you see CORS errors:**
- Make sure you're accessing via `http://localhost:8000`, NOT `file://`
- The server must be running

**If the server won't start:**
- Make sure the script is executable: `chmod +x start-server.sh`
- Check if port 8000 is available: `lsof -i :8000`

## Next Steps

Once the test page works:
1. Integrate authentication into your VR menu
2. Add save/load experiment buttons
3. Display leaderboard and achievements
4. See `backend/README.md` for full integration guide
