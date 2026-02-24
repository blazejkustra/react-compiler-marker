# react-compiler-marker

CLI for generating React Compiler reports. Scan your project to see which components are optimized by the React Compiler and which have issues.

## Usage

```bash
npx react-compiler-marker [options] [directory]
```

**Requirements:** `babel-plugin-react-compiler` must be installed in your project.

## Examples

```bash
# Text summary (default)
npx react-compiler-marker .

# Interactive HTML report
npx react-compiler-marker --format html .

# HTML report saved to file
npx react-compiler-marker --format html --output report.html .

# JSON for CI pipelines
npx react-compiler-marker --format json . > report.json

# Custom extensions and excludes
npx react-compiler-marker --include-extensions .tsx,.ts --exclude-dirs node_modules,dist .
```

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--format <format>` | Output format: `text`, `html`, `json` | `text` |
| `--output <path>` | Write output to a file instead of stdout | stdout |
| `--exclude-dirs <dirs>` | Comma-separated directories to exclude | `node_modules,.git,dist,build,out,coverage,.next,.turbo` |
| `--include-extensions <exts>` | Comma-separated file extensions to include | `.js,.jsx,.ts,.tsx,.mjs,.cjs` |
| `--babel-plugin-path <path>` | Path to babel-plugin-react-compiler | Auto-detected from `node_modules` |
| `--help` | Show help message | |
| `--version` | Show version number | |

## Output Formats

### Text (default)

```
React Compiler Report
========================================
Files scanned:      120
Files with results: 85
Compiled (success): 200
Failed:             12

Failures:
----------------------------------------
  src/components/Foo.tsx:42 - MyComponent: (BuildHIR::lowerStatement) Handle TryStatement
  src/screens/Bar.tsx:15 - (anonymous): Mutating a variable after render
```

### HTML

Self-contained interactive report with filtering, search, and a tree view. When no `--output` is specified, opens automatically in your browser.

### JSON

Full report data for programmatic use and CI integration.

## CI Usage

The CLI exits with code 1 if any compilation failures exist, making it useful in CI pipelines:

```bash
npx react-compiler-marker --format json --output report.json . || echo "Compilation failures found"
```

## License

MIT
