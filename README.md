# Task Management API

A small Express and TypeScript REST API with in-memory task storage.

## Commands

- `npm run dev` starts the development server with file watching.
- `npm run typecheck` checks strict TypeScript types without emitting files.
- `npm run build` compiles the API to `dist/`.
- `npm start` runs the compiled API.
- `npm test` runs the baseline API tests.

The server uses `PORT=3000` by default. Data is held in memory and is lost whenever the process restarts.

## Endpoints

- `GET /health`
- `GET /tasks`
- `GET /tasks/:id`
- `POST /tasks`
- `PUT /tasks/:id`
- `DELETE /tasks/:id`

Create requests require a non-empty `title`; `description` defaults to an empty string and `status` defaults to `todo`. Replace requests require `title`, `description`, and a status of `todo`, `in-progress`, or `done`.