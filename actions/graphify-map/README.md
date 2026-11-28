# Graphify Codebase Map

Generate a navigable codebase dependency graph and Markdown report using
[Graphify](https://github.com/Graphify-Labs/graphify).

This action runs in code-only mode. It does not require an AI provider,
API key, embeddings, or LLM calls.

## Outputs

Graphify generates:

| File | Description |
|---|---|
| `graph.json` | Structured codebase graph |
| `graph.html` | Interactive graph visualization |
| `GRAPH_REPORT.md` | Human-readable codebase report |
| `manifest.json` | Extraction manifest, when generated |

## Usage

```yaml
- name: Generate codebase map
  uses: ./actions/graphify-map
  with:
    scan-path: .
    output-dir: graphify-out
    graphify-version: '0.9.121'
    python-version: '3.12'
    max-workers: '2'

- name: Upload map
  uses: actions/upload-artifact@v4
  with:
    name: codebase-map
    path: graphify-out/