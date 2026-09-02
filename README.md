# Kasatria - 3D Periodic Table Web Application

An interactive 3D Data Visualization Web Application built with **Three.js (CSS3DRenderer)**, **Google Identity Services (OAuth 2.0)**, and **Google Sheets Live CSV Integration**.

---

## Features & Implementation

1. **Google Authentication (Image A)**:
   - Google Sign-In button powered by Google Identity Services (`gsi/client`).
   - Guest / Demo login option for instant testing and evaluation.
   - User profile info (Name, Avatar) and Sign Out functionality.
2. **Google Sheet Live Data Integration**:
   - Fetches and parses published Google Sheet CSV directly.
   - Fallback to local `Data Template.csv` for offline reliability.
3. **Custom 3D Data Tiles (Image B)**:
   - Displays Age, Country, Photo (with fallback initials), Name, Interest, and Net Worth.
4. **Net Worth Background Color Coding**:
   - 🔴 **Red**: Net Worth `< $100,000`
   - 🟠 **Orange**: Net Worth `$100,000 - $200,000`
   - 🟢 **Green**: Net Worth `> $200,000`
5. **5 Formats / 3D Layout Transformations**:
   - **Table**: $20 \times 10$ arrangement (20 columns, 10 rows).
   - **Sphere**: Fibonacci spherical distribution.
   - **Helix**: Intertwined **Double Helix** (2 strands with $180^\circ$ phase offset).
   - **Grid (Image C)**: $5 \times 4 \times 10$ 3D lattice (5 columns, 4 rows, 10 layers deep).
   - **Pyramid (Tetrahedron)**: 4-face triangular pyramid arrangement distributing elements across all 4 faces with outward surface orientation.
6. **Interactive Controls**:
   - Smooth 3D Trackball orbital navigation (mouse rotate, scroll to zoom, right-click to pan).
   - Smooth animated transitions powered by TWEEN.js.

---

## Quick Configuration

### 1. Update your Google Sheet CSV Link
Open `index.js` and locate the configuration variable at the top:
```javascript
const GOOGLE_SHEET_CSV_URL = 'YOUR_PUBLISHED_GOOGLE_SHEET_CSV_URL_HERE';
```
*(To publish your Google Sheet: Go to **File** > **Share** > **Publish to web** > Select **Entire Document** > Choose **CSV** > Click **Publish**).*

### 2. Set up Google Cloud Project & OAuth Client ID (For Google Login)
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project (e.g. `Kasatria-Periodic-Table`).
3. Go to **APIs & Services** > **OAuth consent screen**:
   - Choose **External** > Fill in App name and your email address > Save.
4. Go to **APIs & Services** > **Credentials**:
   - Click **+ CREATE CREDENTIALS** > **OAuth client ID**.
   - Application type: **Web application**.
   - Authorized JavaScript origins: Add `http://localhost:8000`, `http://127.0.0.1:5500`, or your deployed URL (e.g. `https://your-username.github.io`).
   - Click **Create** and copy your **Client ID**.
5. In `index.html`, replace `YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com` with your real Client ID in the `data-client_id` attribute:
```html
<div id="g_id_onload"
     data-client_id="YOUR_COPIED_CLIENT_ID.apps.googleusercontent.com"
     data-callback="handleCredentialResponse"
     data-auto_prompt="false">
</div>
```

---

## Running Locally

You can run the web application using any local HTTP server:

### Option A: Python (Built-in)
```bash
python -m http.server 8000
```
Open your browser and navigate to: [http://localhost:8000](http://localhost:8000)

### Option B: VS Code Live Server Extension
- Right-click `index.html` and select **"Open with Live Server"**.

---

## Deploying & Submitting Your Webpage Link

To complete requirement #10 and submit your public webpage URL:

### Free Deployment with GitHub Pages (Recommended)
1. Initialize git and push your repository to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of 3D periodic table"
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/kasatria-periodic-table.git
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment**, set Source to **Deploy from a branch** and select `main` / `root`.
   - Click **Save**.
3. Your live webpage URL will be ready at:
   `https://YOUR_GITHUB_USERNAME.github.io/kasatria-periodic-table/`
4. Copy this live URL, add it to your Google Cloud Console Authorized JavaScript origins, and submit the link!
