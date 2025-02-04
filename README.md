# WatcherAI
## Description
WatcherAI uses ollama models to summarise YouTube Videos

## About
This project is structured in such a way that it uses separate frameworks for both the frontend and backend:

- **Frontend**: React (with TypeScript) + Vite
- **Backend**: Flask

### 1. Requirements

- **Python**: v3.9+
- **NodeJS**: v22+
- **Ollama**: latest version

### 2. Installation & Dependencies

To install the project and all its dependencies, follow the steps below:

#### 2.1 Clone the Repository
Start by cloning this repository:
```bash
git clone https://github.com/macoki07/WatcherAI.git
```

#### 2.2 Set Up Frontend

```bash
cd client
npm install
```

#### 2.3 Set Up Backend

```bash
cd server
pip install virtualenv  # OPTIONAL - You can choose to run it in a virtual environment
python -m venv venv
venv\Scripts\activate  # On Mac: source venv/bin/activate
pip install -r requirements.txt
```

### 3. Running and Using the Web App GUI 
To run the web app, ensure you have two terminal windows open (1 for running the frontend and 1 for backend)

#### 3.1 Start the Frontend
Navigate to the client directory and start the React frontend:

```bash
cd client
npm run dev
```

#### 3.2 Start the Backend 
Navigate to the server directory and run the Flask server:

```bash
cd server
python main.py  # Ensure the Flask app runs without errors
```

By default, the frontend should be available at http://localhost:5173, and the backend should be running on http://127.0.0.1:8080.
