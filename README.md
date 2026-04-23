# Evidence Reasoning Instrument (ERI)

Static web front end for **guideRx** (gojitech): evidence-guided cannabinoid prescribing support. This repository holds the landing flow, the main **Evidence Reasoning Engine** template shell, and reusable UI widgets used in that experience.

## Contents

| Path | Purpose |
|------|---------|
| `index.html` | Landing page and acknowledgement dialog before entering the tool |
| `script.js` | Entry flow: session metadata in `sessionStorage`, dialog handling, navigation to `template.html` |
| `template.html` | Main multi-step shell (clinical context, widgets, evidence exploration) |
| `template.js` | Behavior for the template shell |
| `styles.css` | Shared styling (landing + shell) |
| `template-shell.css` | Layout and shell components for `template.html` |
| `chevron-progress.js` / `chevron-progress.css` | Step progress UI |
| `percent-slider.js` / `percent-slider.css` | Percentage slider control |
| `table-multiselect-dropdown.js` / `table-multiselect-dropdown.css` | Accessible table + multiselect combobox (`role="grid"`, keyboard support) |

### Standalone demos

- `table-multiselect-demo.html` — table multiselect widget
- `chevron-demo.html` — chevron progress
- `percent-slider-demo.html` — percent slider

## Running locally

There is no build step. Serve the repo root over HTTP (recommended so behavior matches deployment), for example:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080/index.html`. After acknowledging the entry dialog and choosing a role, **Proceed** opens `template.html`.

You can also open `index.html` directly from the file system in a browser; keep all assets in the same relative paths as in the repository.

## Stack

Vanilla HTML, CSS, and JavaScript (IIFE modules, no bundler).

## Disclaimer

Use of this software is intended for qualified healthcare professionals in a clinical decision-support context. Legal and clinical disclaimers shown in the application UI apply; this README does not replace them.
