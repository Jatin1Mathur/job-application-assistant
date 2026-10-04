# ADR 002: A Redis cache for AI match results, with hashed keys

**Status:** accepted

> The decision is mine. The code that implements it was written with Claude Code as an AI pair programmer, from my step descriptions, and I reviewed it in the pull request.

## Context

A match analysis is the slowest request in the app, because the local model needs seconds for one answer. Users often open the same application again or press "Analyze" twice with the same resume and the same posting. The analysis runs with temperature 0, so the same input gives (nearly) the same answer, and asking the model again adds nothing.

## Decision

I decided to cache match results in Redis for 24 hours.

The key is built from everything the answer depends on:

```
match-analysis:model:{model name}:resume:{resume id}:application:{application id}:{SHA-256 of the job description}
```

The job description is hashed, so the key has a fixed length whatever the length of the text, and any change to the text gives a different key. The response carries a header `X-Cache: HIT` or `MISS`, so the effect can be seen and tested.

## Alternatives

- **No cache.** Simplest, but every repeated click costs seconds and computing power.
- **Use the saved analysis in PostgreSQL as the cache.** The latest analysis is stored there anyway. But that row is the product's data ("the analysis of this application"), with one row per application; mixing it with "have I asked exactly this before" for different resumes and texts would make both jobs harder to reason about.
- **An in-memory cache inside the backend.** No extra container, but it is lost on every restart and does not work with more than one backend instance.
- **The text itself in the key instead of a hash.** Readable, but job descriptions are long and keys would be several kilobytes each.

## Consequences

- In one measured run the first call took 3.66 s (`MISS`) and the second 0.01 s (`HIT`).
- The model name is part of the key, so switching to another model never returns the old model's answers.
- The cache is an optimisation, not a dependency: if Redis is down, reading and writing the cache log a warning and the analysis is done by the model as if there were no cache.
- Errors are never cached, because a value is only stored after a valid answer.
- Cover letters are not cached on purpose: "Regenerate" should give new wording.
- One more container to run. Its host port is 6380, to avoid a clash with a Redis that may already be running on 6379.
