"""A tiny async TTL cache with single-flight and stale-on-error fallback.

The GeoMet upstream is large (the full city-page payload is ~26 MB) and rate
sensitive, so every expensive fetch is wrapped here:

  * results are cached per key for a TTL,
  * concurrent callers for the same cold key wait on one in-flight fetch
    (single-flight) instead of stampeding the upstream,
  * if a refresh fails we serve the last successful value rather than erroring,
    keeping the dashboard usable during an upstream outage.
"""

from __future__ import annotations

import asyncio
import time
from collections.abc import Awaitable, Callable
from typing import Any


class TTLCache:
    def __init__(self) -> None:
        self._fresh: dict[str, tuple[float, Any]] = {}
        self._stale: dict[str, Any] = {}
        self._stamp: dict[str, float] = {}
        self._locks: dict[str, asyncio.Lock] = {}
        self._guard = asyncio.Lock()

    async def _lock_for(self, key: str) -> asyncio.Lock:
        async with self._guard:
            lock = self._locks.get(key)
            if lock is None:
                lock = asyncio.Lock()
                self._locks[key] = lock
            return lock

    def _peek(self, key: str) -> Any | None:
        item = self._fresh.get(key)
        if item is None:
            return None
        expires_at, value = item
        if time.monotonic() >= expires_at:
            return None
        return value

    def age_seconds(self, key: str) -> float | None:
        """Seconds since this key was last refreshed, or None if never."""
        stamped = self._stamp.get(key)
        return None if stamped is None else time.monotonic() - stamped

    async def get_or_set(
        self,
        key: str,
        ttl: float,
        factory: Callable[[], Awaitable[Any]],
    ) -> Any:
        cached = self._peek(key)
        if cached is not None:
            return cached

        lock = await self._lock_for(key)
        async with lock:
            cached = self._peek(key)  # re-check inside the lock (single-flight)
            if cached is not None:
                return cached
            try:
                value = await factory()
            except Exception:
                if key in self._stale:
                    return self._stale[key]  # serve last good on upstream failure
                raise
            self._fresh[key] = (time.monotonic() + ttl, value)
            self._stale[key] = value
            self._stamp[key] = time.monotonic()
            return value


cache = TTLCache()
