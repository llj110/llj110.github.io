# BAT3R project website

Public route: https://llj110.github.io/bat3r/

This static project page is built with the existing GitHub Pages Jekyll site. It has an interactive point-cloud comparison, 27 scenes from 7-Scenes / NRGBD, input ground-truth camera paths, paired RGB keyframes, 96 preserved experiment records, method explanation, paper resources, and citation copying. Inference is not executed on the website.

## Data contract

- `assets/data/gallery.json` lists scene IDs, previews, methods, and metadata paths.
- Each `scene.json` stores camera matrices, common view bounds, source sampling details, and method payload checksums.
- A `.bin` file contains all XYZ positions as little-endian float32, followed by all original RGB bytes (15 bytes per point in total).
- PLY downloads reconstruct an interleaved binary file from the displayed sample. They are explicitly labeled preview exports.
- `results.json` keeps numeric saved-run metrics, seed, sequence count, source tag, and protocol. These records are separate from paper-reported tables and from the geometry gallery.
- Camera paths are input ground truth. Do not label them as model estimates.
- The historical `ttt3r` directory is the modified BAT3R path; attention-only controls are labeled as references rather than independent upstream TTT3R runs.

Original server files are preserved. Public assets contain neither server credentials nor private absolute server paths. The private audit and raw source paper remain outside the published repository. Dataset sources are linked in the BAT3R implementation documentation; 7-Scenes / NRGBD visualization assets are derived from their recorded evaluation sequences.

## Implementation

`assets/project.js` handles scene selection, camera linking, orbit controls, RGB / height coloring, camera-path playback, preview PLY exports, searchable gallery, results selectors, and citation copying. It gracefully retains a static preview when WebGL is unavailable. Three.js 0.180.0 is vendored under `assets/vendor` with `THREE-LICENSE.txt`.

The owner explicitly authorized a public implementation release. The project page links directly to https://github.com/llj110/BAT3R. The demo is public, with no login or code-application gate.

Run `python scripts/check_bat3r.py` after a Jekyll build. Browser QA should cover desktop and mobile layouts, scene switching, paired rendering, RGB / height modes, camera playback, filtering, result tabs, error fallback, and download payloads.
