# Cache

Cache-aside reads (`read`) and a client that retries slow reads at once (`fetch`) or with backoff (`fetch_with_backoff`), for the example scene `examples/scenes/cache-storm.exl.md`: how a traffic spike on a cold cache feeds itself through retries, and what stops it.
