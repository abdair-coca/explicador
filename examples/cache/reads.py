"""Cache-aside reads, and a client that retries at once when a read is too slow."""
import time

TIMEOUT_S = 0.5  # a read slower than this counts as failed
RETRIES = 3  # the client tries again this many times, at once
cache = {}


def read(key, db):
    """The cache first; on a miss, the database, and the answer is kept for next time."""
    if key in cache:
        return cache[key]
    value = db.query(key)  # slower the more queries run at the same time
    cache[key] = value
    return value


def fetch(key, db):
    """What the client does: a slow read is sent again at once, up to RETRIES more times."""
    for _ in range(1 + RETRIES):
        start = time.monotonic()
        value = read(key, db)
        if time.monotonic() - start <= TIMEOUT_S:
            return value
    raise TimeoutError(key)


def fetch_with_backoff(key, db):
    """The fix: wait twice as long before each new try, so retries stop piling onto a busy database."""
    wait = 0.1
    for _ in range(1 + RETRIES):
        start = time.monotonic()
        value = read(key, db)
        if time.monotonic() - start <= TIMEOUT_S:
            return value
        time.sleep(wait)
        wait *= 2
    raise TimeoutError(key)
