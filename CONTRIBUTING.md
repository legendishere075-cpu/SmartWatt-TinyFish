# Contributing

Thanks for your interest in SmartWatt.

## Development principles
- Keep energy calculations explicit, unit-aware, and independently testable.
- Preserve the distinction between simulated, user-entered, and measured data.
- Validate user input and provide understandable error messages.
- Keep the application lightweight unless a new dependency provides a clear benefit.
- Do not add unsupported performance, savings, or accuracy claims.

## Before submitting a change
1. Explain the problem the change addresses.
2. Include a focused implementation.
3. Add or update tests for calculation changes.
4. Run `npm test` when Node.js is available.
5. Test the interface at desktop and mobile widths.
6. Update the README when behavior or assumptions change.
