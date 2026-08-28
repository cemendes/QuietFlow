# Contributing to QuietFlow

Thank you for your interest in making QuietFlow better! 🌿

## 📋 Code of Conduct
Please be kind, respectful, and supportive. We are building a welcoming tool that actively supports neurodiversity and accessibility.

## 🛠️ Architecture Overview
- **UI Framework**: React 18 + TypeScript + Tailwind CSS
- **Desktop Runtime**: Tauri 2.0 (Rust backend with local filesystem and native window chrome)
- **Data Model**: Local Markdown files with YAML frontmatter
- **State Management**: Zustand stores in `src/store/`

## 🧪 Testing Guidelines
- Run unit and component tests with `npm test`.
- All PRs should include automated tests for new components or utilities.
- Avoid external cloud lock-in: QuietFlow defaults to 100% offline local Markdown files.

## 🚀 Submitting Issues and Pull Requests
- Use GitHub Issues to suggest new features or report bugs.
- When opening a Pull Request, describe the problem it solves and attach screenshots if there are UI changes.
