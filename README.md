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

### Listing tasks and pagination

`GET /tasks` returns HTTP 200. Without the exact query keys `page` or `limit`, the
response remains an array of **all** tasks in insertion order, with no size cap:

```sh
curl 'http://localhost:3000/tasks'
```

An empty store returns `[]`. A nonempty store returns Task objects containing
`id`, `title`, `description`, `status`, `createdAt`, and `updatedAt`.

Supplying either `page` or `limit` opts into a paginated response:

```sh
curl 'http://localhost:3000/tasks?limit=10'
curl 'http://localhost:3000/tasks?page=2&limit=20'
```

| Parameter | Default when omitted | Allowed values |
| --- | --- | --- |
| `page` | 1 | Positive safe integer, at most 9007199254740991 |
| `limit` | 20 | Integer from 1 to 100 |

For an empty store, the limit-only example returns:

```json
{
  "items": [],
  "page": 1,
  "limit": 10,
  "total": 0,
  "totalPages": 0
}
```

With one task, `GET /tasks?page=1&limit=20` returns, for example:

```json
{
  "items": [
    {
      "id": "cb3a8757-4e51-456c-a51b-d65b2a72f342",
      "title": "Write documentation",
      "description": "",
      "status": "todo",
      "createdAt": "2026-09-24T12:00:00.000Z",
      "updatedAt": "2026-09-24T12:00:00.000Z"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1,
  "totalPages": 1
}
```

`total` counts all tasks, not just this page; `totalPages` is the ceiling of
`total / limit`. Empty collections have zero pages. A page beyond the last page
returns HTTP 200 with empty `items`, the requested page, and current totals, not
404. Tasks retain insertion order. Creates/deletes between requests can shift
page membership; there is no snapshot guarantee, and all data is lost on restart.

Values must be single strings of ASCII digits representing positive safe integers.
Leading zeros are accepted and normalized (for example, `page=002` becomes 2).
Empty values, whitespace, signs, decimals, exponent notation, nonnumeric values,
zero, unsafe integers, repeated pagination keys, and limits over 100 are rejected
with HTTP 400, even when another pagination parameter is valid. Invalid values
are not clamped or replaced with defaults.

Errors use the shared JSON envelope, with field-specific validation details:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request query validation failed",
    "details": {
      "formErrors": [],
      "fieldErrors": {
        "page": ["Must contain only digits"]
      }
    }
  }
}
```

Unknown query keys are ignored and do not activate pagination, so
`GET /tasks?unrelated=value` still returns an array. Bracketed keys such as
`page[nested]` or `limit[]` are not supported pagination aliases and are ignored.
Clients that previously sent `page` or `limit` expecting them to be ignored must
now handle the paginated envelope or remove those parameters.