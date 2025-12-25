# Code to Bytecode English

A pedagogical tool that converts JavaScript code to bytecode with English explanations.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **Package Manager**: pnpm
- **Parser**: Babel parser for JavaScript AST generation

## Project Structure

```
app/           - Next.js App Router pages and layouts
components/    - React components
  bytecode-visualizer/  - Core visualizer components
lib/           - Utility functions and bytecode logic
  bytecode/    - Parser, compiler, and types for bytecode generation
styles/        - Global CSS styles
public/        - Static assets
tests/
`-- bytecode
    |-- compiler
    |   |-- expressions
    |   |   |-- array-expression.test.ts
    |   |   |-- binary-expression.test.ts
    |   |   |-- call-expression.test.ts
    |   |   |-- literals.test.ts
    |   |   `-- update-expression.test.ts
    |   `-- statements
    |       |-- for-in-statement.test.ts
    |       |-- variable-declaration.test.ts
    |       `-- while-statement.test.ts
    |-- helpers
    |   `-- test-utils.ts
    |-- integration
    |   `-- end-to-end.test.ts
    `-- parser
        `-- parser.test.ts
```

## Commands

```bash
pnpm dev       # Start development server
pnpm build     # Production build
pnpm start     # Start production server
pnpm lint      # Run ESLint
pnpm test      # Run tests with Vite
```

## Key Concepts

- **StatementBlock**: Core unit representing a source statement with color banding
- **InstructionLine**: Single bytecode instruction with op, args, text, and English explanation
- **InstructionGroup**: Groups of instructions for rendering with consistent color bands

## Development Notes

- Uses `@babel/parser` to generate AST from JavaScript source
- The bytecode compiler in `lib/bytecode/compiler.ts` transforms AST nodes to instruction lines
- Components use resizable panels for the multi-column layout
- Color banding alternates between statements for visual clarity

## Contributing

1. Run tests after changes: `pnpm test`
2. check linting: `pnpm lint`
3. Check types: `pnpm tsc --noEmit`
4. Check with playwright MCP
