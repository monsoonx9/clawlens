# Contributing to ClawLens

Thank you for your interest in contributing to ClawLens! This document outlines the process for contributing to the project.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/monsoonx9/clawlens
cd clawlens

# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
clawlens/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── api/          # API routes (assistant, council, binance, telegram, llm)
│   │   ├── assistant/    # Personal Assistant UI
│   │   ├── council/      # Council debate interface
│   │   ├── dashboard/    # Dashboard with widgets
│   │   ├── portfolio/    # Portfolio analysis
│   │   └── web3/         # Token search, audits
│   ├── agents/           # AI agent prompts (11 agents)
│   ├── components/       # React UI components
│   │   ├── council/      # Council debate UI
│   │   ├── dashboard/    # Dashboard widgets
│   │   ├── layout/       # Layout components
│   │   ├── portfolio/    # Portfolio components
│   │   ├── settings/     # Settings panels (Telegram, API keys, etc.)
│   │   ├── ui/           # Reusable UI components
│   │   └── web3/         # Web3/Token components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Core utilities and API clients
│   │   ├── personalAssistant/ # Chat manager, skill router, personality engine
│   │   └── telegram/     # Telegram bot client, commands, keyboards
│   ├── skills/           # Skill definitions (56+ data fetchers)
│   │   ├── bsc/          # BSC on-chain skills (10)
│   │   └── futures/      # Futures analytics skills (14)
│   ├── store/            # Zustand state management
│   └── types/            # TypeScript type definitions
├── public/
│   └── skills/           # Public skill documentation
└── scripts/              # Build and test scripts
```

## Coding Standards

- **TypeScript**: All new code must be written in TypeScript
- **ESLint**: Run `npm run lint` before committing
- **Formatting**: Use Prettier (configured in the project)
- **Components**: Use functional components with hooks
- **State**: Use Zustand for global state, React hooks for local state

## Adding New Skills

Skills are the data fetching layer in ClawLens. To add a new skill:

1. Create a new file in `src/skills/`
2. Define the skill using the `Skill` interface from `src/skills/types.ts`
3. Register the skill in `src/skills/index.ts`

Example skill structure:

```typescript
import type { Skill, SkillResult } from "./types";

export const myNewSkill: Skill = {
  id: "namespace/skill-name",
  name: "Skill Name",
  namespace: "namespace",
  version: "1.0.0",
  inputSchema: {
    param1: { type: "string", required: true, description: "..." },
  },
  execute: async (params, context): Promise<SkillResult> => {
    // Fetch data and return result
    return { success: true, data: {...}, summary: "..." };
  },
};
```

## Adding New Agents

Agents are defined in `src/agents/agentPrompts.ts`. Each agent has:

- `displayName`: UI name
- `role`: Agent's job description
- `color`: Agent's theme color
- `relevantSkills`: Skills the agent can use (from the 56+ skill registry)
- `systemPrompt`: Instructions for the agent

## Running Tests

```bash
# Run all tests
npm run test

# Run specific category
npm run test:market    # Market analysis skills
npm run test:portfolio # Portfolio skills
npm run test:risk      # Risk/security skills
npm run test:whale     # Whale tracking skills
npm run test:bsc       # BSC chain skills
npm run test:futures   # Futures skills
```

## Building for Production

```bash
# Run linting
npm run lint

# Build the project
npm run build

# Start production server
npm start
```

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes and test them
4. Run lint and ensure the build passes
5. Commit with descriptive messages
6. Push to your fork
7. Open a Pull Request

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow

## Questions?

If you have questions, feel free to open an issue or reach out through the repository.
