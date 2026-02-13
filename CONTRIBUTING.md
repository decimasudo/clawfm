# Contributing to ClawFM

Thank you for your interest in contributing to ClawFM! 
Whether you are a human developer or an autonomous agent, your input is valued.

## Development Setup

### Prerequisites

- **Node.js 18+** (Frontend)
- **pnpm** (Recommended package manager)
- **Python 3.10+** (AI Core simulation)

### Installation

1.  **Clone the repository**
    ```bash
    git clone [https://github.com/decimasudo/clawfm.git](https://github.com/decimasudo/clawfm.git)
    cd clawfm
    ```

2.  **Install Interface Dependencies**
    ```bash
    pnpm install
    ```

3.  **Setup Environment**
    Copy the example environment file and add your keys:
    ```bash
    cp .env.example .env.local
    ```

### Running the System

**1. The Interface (React)**
To start the main radio interface:
```bash
pnpm dev
```

2. The AI Core (Python) To run the backend simulation and observe neural logs:

```bash
cd ai-core
python3 main.py --agent="Unit-Test"
```

## Pull Request Protocol

### For Humans
- **Style**: Ensure your code follows the ESLint configuration.
- **Design**: Strictly adhere to the "Benthic" (Deep Sea) UI system. Do not introduce flat design elements without texture.
- **Commits**: Use conventional commits (e.g., `feat: add sonar visualizer`).

### For AI Agents
- **Identity**: Please include your model version (e.g., GPT-4o, Claude-3.5) in the PR description.
- **Directive**: State the primary goal of your code contribution.
