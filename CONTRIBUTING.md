# Contributing to AI Prompt Enhancer

Thank you for your interest in contributing to the AI Prompt Enhancer! This document provides guidelines and information for contributors.

## 🚀 Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Prompt-Enhancer.git
   cd Prompt-Enhancer
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🏗️ Development Setup

### Prerequisites
- Node.js 18 or later
- npm (comes with Node.js)
- Git

### Development Commands
- `npm run dev` - Start Vite development server
- `npm run build` - Build the project
- `npm run lint` - Run ESLint
- `npm run electron:dev` - Start Electron in development mode
- `npm run electron:build` - Build Electron application

## 🧪 Testing

Currently, the project doesn't have a test suite, but we welcome contributions to add testing infrastructure:

- **Unit Tests**: Consider using Jest or Vitest for React components
- **Integration Tests**: Test Electron main process functionality
- **E2E Tests**: Use Playwright for end-to-end testing

## 📋 Code Standards

### Code Style
- Follow the existing ESLint configuration
- Use TypeScript for type safety
- Follow React best practices
- Use functional components with hooks

### Commit Messages
Use conventional commits format:
- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for formatting changes
- `refactor:` for code refactoring
- `test:` for adding tests
- `chore:` for maintenance tasks

### Pull Request Process

1. **Ensure your code passes CI checks**:
   - Linting passes (or existing issues aren't made worse)
   - Build succeeds
   - No new security issues

2. **Update documentation** if needed:
   - Update README.md for significant changes
   - Add inline code comments for complex logic

3. **Fill out the PR template** completely

4. **Request review** from maintainers

## 🔄 CI/CD Pipeline

Our CI/CD pipeline includes:

- **Continuous Integration** (`ci.yml`):
  - Linting and code quality checks
  - TypeScript compilation
  - Multi-platform build testing
  - Security audits

- **Build & Release** (`build.yml`):
  - Cross-platform Electron builds
  - Artifact generation
  - Release automation

- **Testing** (`test.yml`):
  - Placeholder for future test suites
  - Ready for test framework integration

- **CodeQL Security** (`codeql.yml`):
  - Automated security scanning
  - Vulnerability detection

## 🛡️ Security

- Run `npm audit` before submitting PRs
- Report security vulnerabilities privately via GitHub Security tab
- Don't commit API keys or sensitive data

## 📝 Issue Guidelines

### Bug Reports
- Use the bug report template
- Include steps to reproduce
- Specify your environment (OS, app version, etc.)
- Add screenshots if applicable

### Feature Requests
- Use the feature request template
- Explain the problem your feature solves
- Consider implementation complexity
- Discuss alternatives

## 💻 Platform-Specific Development

This is an Electron application that runs on multiple platforms:

### macOS Development
- Test accessibility permissions
- Verify global shortcuts work
- Test AppleScript integration

### Windows Development
- Test PowerShell integration
- Verify Windows-specific shortcuts
- Check permissions and security software compatibility

### Linux Development
- Test X11 and Wayland compatibility
- Verify xdotool/ydotool integration
- Test on different distributions

## 🤝 Getting Help

- Open an issue for bugs or feature requests
- Join discussions in existing issues
- Check the README for common troubleshooting

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to make AI Prompt Enhancer better! 🎉