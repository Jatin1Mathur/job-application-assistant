# Frontend image, built in two stages.
#
# Stage 1 needs Node.js to turn the React and TypeScript source into plain HTML, CSS and JavaScript files.
# Stage 2 only serves those finished files with nginx (a small, fast web server). Node.js, node_modules and the
# source code are not part of the final image.

# ---------- Stage 1: build the static files ----------
FROM node:24-alpine AS build
WORKDIR /app

# First only the dependency lists, so "npm ci" is cached until they change
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Stage 2: serve them ----------
# This variant of the official nginx image runs as a normal user (not root) and listens on port 8080
FROM nginxinc/nginx-unprivileged:1.29-alpine

# nginx fills in ${BACKEND_URL} from the environment when the container starts (files in /templates are templates)
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Where /api calls are passed on to. docker-compose.yml sets it to the backend container.
ENV BACKEND_URL=http://backend:8080

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:8080/ || exit 1
