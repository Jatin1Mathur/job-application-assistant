# Architecture decision records

Short records of the decisions that shaped this project: what the situation was, what I decided, what else was possible, and what follows from it. How the parts fit together is described in [ARCHITECTURE.md](../ARCHITECTURE.md).

| No. | Decision |
|---|---|
| [001](001-local-ai-with-ollama.md) | A local AI model with Ollama, behind an `AiService` interface |
| [002](002-redis-cache-for-ai-results.md) | A Redis cache for AI match results, with hashed keys |
| [003](003-jwt-authentication.md) | Login with JWT |
| [004](004-flyway-for-database-migrations.md) | Flyway for database migrations |
| [005](005-3d-only-on-selected-pages.md) | 3D only on selected pages |
| [006](006-docker-compose-for-one-command-setup.md) | Docker Compose for a one-command setup |
| [007](007-login-token-in-an-httponly-cookie.md) | The login token in an httpOnly cookie, with CSRF protection |

The decisions are mine. The code that implements them was written with Claude Code as an AI pair programmer, from my step descriptions, and reviewed by me in pull requests.
