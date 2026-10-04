# ADR 006: Docker Compose for a one-command setup

**Status:** accepted

> The decision is mine. The code that implements it was written with Claude Code as an AI pair programmer, from my step descriptions, and I reviewed it in the pull request.

## Context

The app has four parts that must run together: the frontend, the backend, PostgreSQL and Redis, plus Ollama. Before this decision, starting it meant three terminals and the right versions of Java and Node.js installed. Someone who wants to look at the project should not need any of that.

## Decision

I decided that `docker compose up --build` starts the whole application, and that this is the documented way to run it.

- Two multi-stage Dockerfiles: the build tools stay in the first stage, the image that runs contains only the jar or the static files.
- Both app containers run as a normal user, not root.
- Health checks define the start order: the backend waits for PostgreSQL and Redis to answer, the frontend waits for the backend.
- nginx serves the frontend and passes `/api` on to the backend, so the browser talks to one address.
- Secrets come from `.env`; Compose refuses to start without them.
- Ollama is not put into a container. It stays on the host and the backend reaches it through `host.docker.internal`.

The same Compose file is used by the browser tests in CI.

## Alternatives

- **Keep running everything by hand.** Nothing to maintain, but a high barrier for anyone else, and "works on my machine" problems.
- **Ollama in a container too.** One command would then start really everything, but the model is several gigabytes, a container has no access to the graphics chip on a Mac, and most people who have Ollama already run it on the host.
- **Kubernetes.** Closer to a production setup, far too much for one machine and four containers.
- **One container with everything in it.** Simple to start, but it hides the structure and breaks the rule of one process per container.

## Consequences

- One command and one address (http://localhost:3000) instead of three terminals.
- The final images are small: 448 MB for the backend and 87 MB for the frontend, against 1.09 GB and 1.34 GB for their build stages.
- Running the full flow against the containers found three bugs that the development setup never showed: nginx served the pdf.js worker with the wrong file type, a health check asked an address nginx did not listen on, and nginx kept using the backend's old address after a backend restart. All three are fixed.
- Development still works without Docker for the two apps: `docker compose up -d postgres redis` starts only the database and the cache.
- The first build takes a few minutes, because all dependencies are downloaded inside the build stages.
- Ollama remains a manual step. The setup is for one machine; there is no production deployment yet.
