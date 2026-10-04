# ADR 001: A local AI model with Ollama, behind an AiService interface

**Status:** accepted

> The decision is mine. The code that implements it was written with Claude Code as an AI pair programmer, from my step descriptions, and I reviewed it in the pull request.

## Context

The core feature of Job Assistant is comparing a resume with a job posting and drafting a cover letter. That needs a language model. A resume is personal data: name, contact details, work history. The project is also a student project without a budget for paid API calls, and it should run on a laptop without an account at any AI provider.

## Decision

I decided to use a local model: `llama3.2` served by [Ollama](https://ollama.com) on the same machine. The backend talks to Ollama over its HTTP API.

I also decided that the rest of the code must not know about Ollama. The services depend on an interface, `AiService`, with three methods: `modelName()`, `analyzeMatch(resumeText, jobDescription)` and `generateCoverLetter(...)`. `OllamaAiService` is the only implementation.

## Alternatives

- **A hosted model (OpenAI, Anthropic, Google).** Better answers and no local setup, but resume text would leave the machine, every request would cost money, and the app would need an API key to run at all.
- **Calling Ollama directly from the service that needs it.** Less code, but a later change of provider would touch every place that uses the model, and the services would be hard to test without a running model.
- **Rules instead of a model** (keyword matching only). Predictable and fast, but it cannot write a cover letter or give tips.

## Consequences

- Resume text is not sent to a cloud service. This is stated in the app.
- The app needs Ollama running for the AI features. Without it the backend answers 503 with a clear message, and everything else keeps working.
- A small local model makes mistakes and is slow: one analysis took 3.66 s in a measured run, and the timeout is set to 180 seconds. The answer is checked in code (valid JSON, a score from 0 to 100, at most three tips, the length of a cover letter), and the app tells users to check the result.
- Because of the interface, the services are unit-tested with a mock `AiService`, and the browser tests in CI replace only the model with a stand-in.
- A hosted model can be added as a second implementation of `AiService` without changing the services. This is the first item on the roadmap.
