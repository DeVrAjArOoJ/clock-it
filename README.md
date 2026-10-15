# Clock It

Clock It is a clean, responsive task manager for making time for what matters. It includes task search, status and priority filters, due dates, progress summaries, and a distraction-free local workspace.

## Get started

**Requirements:** Node.js 18 or newer and npm.

From the project folder, run:

```bash
npm install
npm run dev
```

Open the local address printed by Vite (usually <http://localhost:5173>) and choose **Start a free local workspace**. No database, account, environment file, or separate server is needed. Local tasks are saved in that browser on that device.

To create a production build:

```bash
npm run build
```

## Optional: account-backed API

The Express API adds account registration and sign-in, with tasks stored in MongoDB. A local workspace is the quickest way to try Clock It; the API is only needed if you want account-backed storage.

1. Start MongoDB locally or create a MongoDB Atlas database.
2. Copy `backend/.env.example` to `backend/.env` and set `MONGODB_URI` and a long, random `JWT_SECRET`.
3. In a second terminal, run `npm run api:dev` from the project folder.
4. Use **Create one** on the Clock It sign-in page to register an account.

The API listens on `http://localhost:5000`. To point the frontend to another API, set `VITE_API_URL` in `frontend/.env` (see `frontend/.env.example`).

## Included API endpoints

- `POST /api/auth/register` — create an account
- `POST /api/auth/login` — sign in
- `GET /api/auth/me` — current user (JWT required)
- `GET /api/tasks` — list the current user's tasks
- `POST /api/tasks` — create a task
- `GET /api/tasks/:id` — get one task
- `PATCH /api/tasks/:id` — update a task
- `DELETE /api/tasks/:id` — delete a task
- `GET /api/health` — health check
