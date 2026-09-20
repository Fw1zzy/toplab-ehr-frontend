# Toplab EHR Frontend

This is a [Next.js](https://nextjs.org/) project bootstrapped with `create-next-app`, serving as the frontend for the Toplab EHR (Electronic Health Record) system.

## 🚀 Running the Project Locally

Follow these detailed steps to set up and run the Toplab EHR frontend on your local machine.

---

### ✅ Step 1: Prerequisites

Make sure you have the following installed **before** doing anything else:

#### 1.1 — Node.js (v18 or higher)
- Download and install from: [https://nodejs.org/](https://nodejs.org/)
- Choose the **LTS (Long Term Support)** version.
- After installing, verify it works by opening a terminal and running:
  ```bash
  node -v
  npm -v
  ```
  You should see version numbers printed (e.g., `v20.x.x` and `10.x.x`).

#### 1.2 — Git
- Download and install from: [https://git-scm.com/](https://git-scm.com/)
- After installing, verify it works:
  ```bash
  git --version
  ```

#### 1.3 — Visual Studio Code (VS Code)
- Download and install from: [https://code.visualstudio.com/](https://code.visualstudio.com/)
- This is the recommended code editor for this project.
- **Recommended VS Code extensions to install** (search in the Extensions panel `Ctrl+Shift+X`):
  - `ESLint` — for code linting
  - `Prettier` — for code formatting
  - `Tailwind CSS IntelliSense` — for Tailwind class autocomplete
  - `GitLens` — for viewing Git history inside the editor

#### 1.4 — GitHub Desktop *(Optional but recommended)*
- Download from: [https://desktop.github.com/](https://desktop.github.com/)
- Useful for managing commits and pull requests without using command-line Git.

---

### 📥 Step 2: Clone the Repository

You can clone the project using either **GitHub Desktop** or the **terminal**.

#### Option A — Using GitHub Desktop
1. Open **GitHub Desktop**.
2. Go to **File** > **Clone repository...** (`Ctrl+Shift+O`).
3. Click the **URL** tab.
4. Paste the repository URL: `https://github.com/Fw1zzy/toplab-ehr-frontend`
5. Choose a local folder where you want to save the project.
6. Click **Clone**.

#### Option B — Using Terminal (Git)
1. Open a terminal (Command Prompt, PowerShell, or Git Bash).
2. Navigate to the folder where you want to save the project:
   ```bash
   cd path/to/your/folder
   ```
3. Run the clone command:
   ```bash
   git clone https://github.com/Fw1zzy/toplab-ehr-frontend.git
   ```
4. Enter the project folder:
   ```bash
   cd toplab-ehr
   ```

---

### 🗂️ Step 3: Open the Project in VS Code

1. Open **VS Code**.
2. Go to **File** > **Open Folder...**.
3. Select the cloned `toplab-ehr` folder.
4. VS Code will open the project. You should see the `src/`, `public/`, and `docs/` folders in the Explorer panel on the left.

---

### ⚙️ Step 4: Set Up Environment Variables

The project requires a `.env` file to configure API endpoints and other environment-specific settings.

1. In the root of the project, look for a file named `.env.example` (if it exists) or ask a team member for the `.env` values.
2. Create a new file named exactly `.env` in the root folder (same level as `package.json`).
3. Add the required environment variables. At minimum, you will need:
   ```env
   NEXT_PUBLIC_API_URL=http://your-backend-api-url
   ```
4. Save the file. **Do NOT commit `.env` to GitHub** — it is already listed in `.gitignore` for security.

---

### 📦 Step 5: Install Dependencies

In VS Code, open the integrated terminal (`Ctrl+`` ` or **Terminal > New Terminal**) and run:

```bash
npm install
```

This will download all the packages listed in `package.json` into a `node_modules/` folder. This may take a minute or two.

---

### ▶️ Step 6: Start the Development Server

Once dependencies are installed, start the local development server:

```bash
npm run dev
```

You should see output similar to:
```
▲ Next.js 15.x
- Local:   http://localhost:3000
- Ready in Xs
```

---

### 🌐 Step 7: Open in Browser

Open your browser and go to:

**[http://localhost:3000](http://localhost:3000)**

The app will load and auto-refresh whenever you save changes to files inside `src/`.

---

> **Note:** If port `3000` is already in use, Next.js will automatically try port `3001`, `3002`, etc. Check the terminal output for the correct URL.



---

## 🤝 How to Contribute (Fork & Pull Request)

If you want to contribute to this project, you can do so by forking it and creating a Pull Request (PR). We recommend using **GitHub Desktop** for an easy workflow.

### 1. Fork the Repository
1. Go to this project's repository page on GitHub.
2. Click the **Fork** button in the top right corner.
3. Select your GitHub account as the destination. This creates a copy of the project under your own GitHub account.

### 2. Clone the Fork using GitHub Desktop
1. Open **GitHub Desktop**.
2. Go to **File** > **Clone repository...** (or press `Ctrl+Shift+O`).
3. Under the **GitHub.com** tab, find and select your forked repository (e.g., `YOUR_USERNAME/toplab-ehr`).
4. Choose the local path where you want to save the project.
5. Click **Clone**.

### 3. Make Changes and Commit
1. Open the cloned folder in your code editor (e.g., VS Code).
2. Make your code changes or additions.
3. Return to **GitHub Desktop**. You will see your changed files listed on the left sidebar.
4. In the bottom-left corner, write a clear **Summary** (and Description if needed) for your changes.
5. Click **Commit to main** (or your current working branch).

### 4. Create a Pull Request
1. Once committed, click the **Push origin** button at the top of GitHub Desktop to upload your changes to your fork on GitHub.
2. After pushing, GitHub Desktop will show a prompt to **Create Pull Request**, or you can click **Branch** > **Create Pull Request** from the top menu.
3. This will open your browser to the GitHub Pull Request page.
4. Review your changes, add a title and description for your PR, and click **Create pull request**.

You've successfully proposed changes to the main project!
