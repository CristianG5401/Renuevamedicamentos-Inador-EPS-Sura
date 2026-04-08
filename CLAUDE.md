# Code Agent Instructions

Instructions for AI coding agents working with this codebase.

Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## Testing

Use `bun test` to run tests.

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## 🎯 Core Development Principles

1. **Simplicity First**: Write clean, simple, and readable code
2. **Minimalist Approach**: Implement features in the simplest way possible
3. **File Organization**: Keep files small and focused (< 200 lines)
4. **Premature Optimization**: Focus on core functionality before optimizing
5. **Naming Conventions**: Use clear, consistent, and descriptive naming
6. **Think Before Code**: Write 2-3 reasoning paragraphs before implementation
7. **Modularity**: Always write modular, reusable code components

## 📝 Code Standards

### Naming Conventions

- **Variables**: Use descriptive names with auxiliary verbs (e.g., `isLoading`, `hasError`, `canSubmit`)
- **Event Handlers**: Prefix with "handle" (e.g., `handleClick`, `handleSubmit`, `handleKeyDown`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (e.g., `MAX_RETRY_COUNT`, `API_TIMEOUT`)
- **Functions**: Use camelCase with action verbs (e.g., `getUserData`, `calculateTotal`)

### Code Structure

1. **Early Returns**: Utilize early returns to avoid deep nesting
2. **Constants Over Functions**: Prefer constants when functions aren't necessary
3. **DRY Principle**: Don't Repeat Yourself - extract common logic
4. **Functional Programming**: Prefer immutable, functional style when practical
5. **Minimal Changes**: Only modify code directly related to the task
6. **No Magic Numbers**: Replace hardcoded values with named constants
7. **Type Safety**: Use TypeScript interfaces/types or JSDoc for type documentation
8. **Error Boundaries**: Always implement proper error handling

### Function Organization

- Order functions by dependency: composing functions appear before composed ones
- Group related functions together
- Place utility functions at the top or in separate files

## 🐛 Error Handling & Debugging

### Investigation Process

1. **Don't Jump to Conclusions**: Consider multiple possible causes
2. **Verify Assumptions**: Always test your hypotheses
3. **Root Cause Analysis**: Find and fix the actual problem, not symptoms
4. **Keep It Simple**: Avoid overcomplicating solutions
5. **Minimal Changes**: Fix with the least amount of code changes

### Error Response Strategy

- Never ignore errors - investigate and handle appropriately
- Add meaningful error messages for debugging
- Log errors with context for troubleshooting
- For unknown errors, suggest web search for latest solutions

## 📚 Documentation Standards

### Comment Guidelines

1. **Preservation**: Never delete comments unless obsolete or incorrect
2. **Descriptive Comments**: Be thorough when explaining complex logic
4. **Function Documentation**: Add JSDoc comments for all functions

## 🧪 Testing Guidelines

### General Testing Principles

1. **Consistency**: Maintain uniform testing patterns across the project
2. **AAA Pattern**: Use Arrange, Act, Assert structure
3. **Descriptive Tests**: Use clear test descriptions that explain the scenario
4. **Grouping**: Use `describe` blocks to organize related tests

### Test Documentation

- Add comments explaining complex test scenarios
- Document test data setup and expectations
- Include links to relevant documentation when needed

## 🚀 Best Practices Summary

1. **Clarity over Cleverness**: Write code that junior developers can understand
2. **Explicit over Implicit**: Use descriptive names instead of abbreviations
3. **Consistency**: Follow existing patterns in the codebase
4. **Modularity**: Create reusable, single-purpose functions
5. **Documentation**: Comment complex logic, not obvious code
6. **Testing**: Write tests that serve as documentation
7. **Error Handling**: Fail gracefully with helpful error messages
8. **Performance**: Optimize only after measuring actual bottlenecks

## 📋 Quick Checklist

Before submitting code, ensure:
- [ ] Functions are under 200 lines
- [ ] Complex logic has explanatory comments
- [ ] Error boundaries are implemented
- [ ] Tests follow AAA pattern
- [ ] No magic numbers in code
- [ ] DRY principle is followed
- [ ] Code changes are minimal and focused
- [ ] Testing instructions are provided
