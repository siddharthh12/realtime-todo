✅ Project Overview:

Real-Time Collaborative To-Do Board (Mini Trello Clone).
Built for managing tasks collaboratively with real-time updates and conflict handling.

✅ Tech Stack:

Frontend: React, Vite, Socket.io-client, @dnd-kit
Backend: Node.js, Express, MongoDB, Socket.io
Deployment: Frontend on Vercel, Backend on Render

✅ Setup Instructions:

Backend:
cd backend
npm install
npm run dev
Add a .env:

           PORT=5000
          MONGO_URI=mongodb+srv://siddharthtiwari1265:LxRDr3XgVXbIFoZy@cluster0.klppggs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
          JWT_SECRET=your_secret_key

           
Frontend:

cd frontend
npm install
npm run dev

✅ Features:

User registration & login
Real-time Kanban board with live sync
Drag and drop tasks
Smart Assign (auto-assign to user with fewest active tasks)
Conflict handling (shows prompt if edited simultaneously)
Activity Log of last 20 actions
Fully responsive

✅ Usage Guide:

Register/Login
Add tasks, edit, delete, drag between columns
Use Smart Assign
Check activity log panel for live updates

✅ Logic Explanations:

Smart Assign: Uses backend to count active tasks per user and auto-assign to the user with the fewest.

Conflict Handling: Compares updatedAt timestamps and shows a prompt if a conflict is detected, allowing the user to overwrite or cancel.

✅ Add:

Deployed app URL: https://realtime-todo-apr4.vercel.app/

Demo Video URL: 

Document Link: https://drive.google.com/file/d/15Q08hlweVGdFm961R8_nBCxuQjvUOh0T/view?usp=sharing
