# Research output

Research files are committed as one schema-conformant JSON record per candidate:

```text
data/research/{sector}/{candidate-slug}.json
```

`{sector}` is one of `BS-01` through `BS-15`. Candidate slugs use lowercase kebab-case. Every record is validated before import and must retain evidence for each researched fact. Use the shared CLI from the repository root:

```bash
pnpm research:validate "data/research/BS-01/*.json"
pnpm research:validate --json "data/research/**/*.json"
```

The validator checks the Research Output Schema, evidence URL shape, sector bounding-box sanity, taxonomy codes, and the sector directory/file naming convention. A non-zero exit code blocks invalid output.
