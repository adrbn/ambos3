# Contributing to AMBOS

Thank you for your interest in contributing to AMBOS! This document provides guidelines for contributing to the project.

## 🤝 Ways to Contribute

- 🐛 **Bug Reports**: Found a bug? Let us know!
- 💡 **Feature Requests**: Have an idea? Share it!
- 📝 **Documentation**: Help improve our docs
- 🔧 **Code**: Submit pull requests
- 🌍 **Translations**: Help translate AMBOS
- 🧪 **Testing**: Help test new features

---

## 🚀 Getting Started

### Prerequisites

- Node.js 22+
- npm 10+
- Git
- Supabase account (for testing backend)

### Setup Development Environment

```bash
# 1. Fork and clone
git clone https://github.com/YOUR_USERNAME/ambos.git
cd ambos

# 2. Install dependencies
npm install

# 3. Create .env.local
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Start development server
npm run dev
```

---

## 📋 Development Guidelines

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **Formatting**: Use Prettier (run `npm run format`)
- **Linting**: Follow ESLint rules (run `npm run lint`)
- **Naming**: Use camelCase for variables, PascalCase for components

### Component Structure

```typescript
// Good component structure
import { useState } from 'react';
import { Button } from '@/components/ui/button';

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

const MyComponent = ({ title, onAction }: MyComponentProps) => {
  const [isActive, setIsActive] = useState(false);

  return (
    <div className="my-component">
      <h2>{title}</h2>
      <Button onClick={onAction}>Action</Button>
    </div>
  );
};

export default MyComponent;
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

**Examples:**
```bash
git commit -m "feat: add real-time alerts for sector watches"
git commit -m "fix: resolve map marker clustering issue"
git commit -m "docs: update deployment guide for AWS"
```

---

## 🔄 Pull Request Process

### 1. Create a Branch

```bash
# Feature branch
git checkout -b feature/your-feature-name

# Bug fix branch
git checkout -b fix/bug-description

# Documentation branch
git checkout -b docs/what-you-are-documenting
```

### 2. Make Changes

- Write clean, documented code
- Follow existing code style
- Add comments for complex logic
- Update relevant documentation

### 3. Test Your Changes

```bash
# Run linter
npm run lint

# Type check
npm run type-check

# Build to ensure no errors
npm run build

# Test manually in browser
npm run dev
```

### 4. Commit and Push

```bash
# Stage changes
git add .

# Commit with meaningful message
git commit -m "feat: add your feature"

# Push to your fork
git push origin feature/your-feature-name
```

### 5. Create Pull Request

1. Go to GitHub repository
2. Click "New Pull Request"
3. Select your branch
4. Fill in PR template:
   - Description of changes
   - Related issues
   - Screenshots (if UI changes)
   - Testing performed

### 6. Code Review

- Be responsive to feedback
- Make requested changes
- Discuss alternatives if needed
- Be respectful and professional

### 7. Merge

Once approved:
- Maintainer will merge your PR
- Delete your branch after merge

---

## 🐛 Bug Reports

### Before Submitting

- Check existing issues
- Try latest version
- Verify it's not environment-specific

### Good Bug Report Includes

```markdown
**Description**
Clear description of the bug

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior**
What should happen

**Actual Behavior**
What actually happens

**Screenshots**
If applicable

**Environment**
- OS: [e.g. Windows 11]
- Browser: [e.g. Chrome 120]
- AMBOS Version: [e.g. 2.0.0]

**Additional Context**
Any other relevant information
```

---

## 💡 Feature Requests

### Good Feature Request Includes

```markdown
**Is your feature request related to a problem?**
Clear description of the problem

**Describe the solution you'd like**
Clear description of desired functionality

**Describe alternatives you've considered**
Other solutions you've thought about

**Additional context**
Use cases, screenshots, mockups

**Priority**
How important is this? (Low/Medium/High)
```

---

## 🌍 Translation Guidelines

### Adding a New Language

1. Edit `src/i18n/translations.ts`
2. Add language code and translations:

```typescript
export const translations = {
  // ... existing languages
  de: {
    appName: "AmbOS",
    appSubtitle: "OSINT Kommandozentrale v2.0",
    // ... all other keys
  }
};

export type Language = 'fr' | 'en' | 'it' | 'de';
```

3. Test all screens with new language
4. Submit PR

### Translation Quality

- Use appropriate formal/informal tone
- Maintain technical accuracy
- Keep similar length to avoid layout breaks
- Consider cultural context

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Search functionality works
- [ ] All modules display correctly
- [ ] Map shows markers properly
- [ ] Reports export successfully
- [ ] Authentication works
- [ ] Sector watches function
- [ ] Settings save correctly
- [ ] Mobile responsive
- [ ] Works in Chrome, Firefox, Safari
- [ ] No console errors

### Writing Tests (when available)

```typescript
// Example test
import { render, screen } from '@testing-library/react';
import SearchBar from '@/components/SearchBar';

describe('SearchBar', () => {
  it('renders search input', () => {
    render(<SearchBar onSearch={jest.fn()} language="en" />);
    expect(screen.getByPlaceholderText(/enter your query/i)).toBeInTheDocument();
  });
});
```

---

## 📚 Documentation

### What to Document

- New features
- API changes
- Configuration options
- Deployment procedures
- Troubleshooting steps

### Documentation Style

- Clear and concise
- Use code examples
- Include screenshots
- Provide step-by-step instructions

---

## 🏗️ Architecture Guidelines

### File Structure

```
src/
├── components/        # React components
│   ├── ui/           # Reusable UI components
│   └── ...           # Feature components
├── hooks/            # Custom React hooks
├── pages/            # Page components
├── lib/              # Utilities
├── i18n/             # Translations
└── integrations/     # External services
```

### Component Guidelines

- **Small & Focused**: One component, one responsibility
- **Reusable**: Design for reuse
- **Typed**: Always use TypeScript interfaces
- **Documented**: Add JSDoc comments
- **Tested**: Write tests for critical components

### State Management

- **Local State**: useState for component state
- **Server State**: TanStack Query for API data
- **Global State**: Keep minimal (auth, theme)

---

## 🔐 Security

### Reporting Security Issues

**DO NOT** open public issues for security vulnerabilities!

Email: security@ambos.dev

Include:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We'll respond within 48 hours.

### Security Guidelines

- Never commit API keys or secrets
- Sanitize all user input
- Use parameterized queries
- Follow OWASP guidelines
- Enable RLS on Supabase tables

---

## 📝 License

By contributing, you agree that your contributions will be licensed under the same license as the project (see [LICENSING.md](./LICENSING.md)).

For commercial contributions, a Contributor License Agreement (CLA) may be required.

---

## 💬 Communication

### Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, general discussion
- **Discord**: Real-time chat (coming soon)
- **Email**: direct-contact@ambos.dev

### Response Times

- Bug reports: 1-3 days
- Feature requests: 1 week
- Pull requests: 3-7 days
- Security issues: 24-48 hours

---

## 🎖️ Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Featured on ambos.dev (major contributions)

---

## ❓ Questions?

- Read the [documentation](./README.md)
- Check [existing issues](https://github.com/your-org/ambos/issues)
- Ask in [Discussions](https://github.com/your-org/ambos/discussions)
- Email: dev@ambos.dev

---

**Thank you for contributing to AMBOS! Together we're building better intelligence tools. 🛡️**
