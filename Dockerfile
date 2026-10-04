# Backend image, built in two stages.
#
# Stage 1 ("build") has everything needed to compile: the full JDK and Maven. It is big.
# Stage 2 is what actually runs: a small Java runtime and the finished jar, nothing else.
# Only stage 2 ends up in the image, so the compiler, Maven and the source code are left behind.

# ---------- Stage 1: build the jar ----------
FROM eclipse-temurin:25-jdk AS build
WORKDIR /app

# First only the files that describe the dependencies. Docker caches each step: as long as pom.xml does not
# change, the next build skips the slow download of all libraries.
COPY mvnw pom.xml ./
COPY .mvn .mvn
RUN ./mvnw -B -q dependency:go-offline

# Then the source code. The tests are not run here: they need a database, and CI runs them (see .github/workflows).
COPY src src
RUN ./mvnw -B -q package -DskipTests

# ---------- Stage 2: the image that runs ----------
FROM eclipse-temurin:25-jre-alpine

# The app runs as its own user without admin rights, not as root. If someone breaks into the app,
# they cannot change the system inside the container.
RUN addgroup -S app && adduser -S app -G app
USER app
WORKDIR /app

COPY --from=build /app/target/*.jar app.jar

EXPOSE 8080

# Docker asks the app every 15 seconds whether it is alive. Until the first "yes", the frontend waits (see docker-compose.yml).
HEALTHCHECK --interval=15s --timeout=3s --start-period=40s --retries=5 \
  CMD wget -q -O /dev/null http://localhost:8080/api/health || exit 1

# Use at most 75% of the memory the container is given, instead of a fixed size
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
