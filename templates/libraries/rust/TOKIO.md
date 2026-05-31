<!-- TOKIO:START -->
# Tokio Rules

## Conventions
- Annotate the main entry point with `#[tokio::main]`; use `#[tokio::main(flavor = "current_thread")]` for single-threaded scenarios
- Spawn independent tasks with `tokio::spawn`; always `.await` or store the returned `JoinHandle` to surface panics
- Use `tokio::sync::Mutex` (not `std::sync::Mutex`) when the lock must be held across `.await` points
- Prefer `tokio::sync::mpsc` for task communication and `tokio::sync::broadcast` for fan-out messaging
- Use `tokio::time::timeout(duration, future)` to add cancellation deadlines; handle `Elapsed` explicitly
- Offload CPU-bound or blocking I/O with `tokio::task::spawn_blocking`; never call `std::thread::sleep` inside async code

## Avoid
- Do not hold a `std::sync::MutexGuard` across an `.await` — the future is not `Send` and the runtime can deadlock
- Do not `unwrap()` on `JoinHandle` results without checking for panics; use `handle.await?` or inspect the `JoinError`
- Do not create a second `#[tokio::main]` runtime inside an existing async context — use `tokio::runtime::Handle::current()` instead
<!-- TOKIO:END -->
