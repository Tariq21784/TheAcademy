# TheAcademy

TheAcademy is an adaptive learning platform for building mastery from uploaded documents.
This version supports document upload, automated lesson planning, section-based study, and retrieval practice.

## What it includes

- Upload `.txt`, `.md`, `.pdf`, `.docx`, or `.pptx` files and turn them into a learning plan.
- Upload multiple documents at once and combine them into a single adaptive study path.
- Automatic section extraction and keyword analysis.
- Science-backed pedagogy: direct instruction, spaced retrieval, mastery learning, Bloom 2 Sigma-style feedback.
- Practice quizzes created from each section.
- Progress tracking with mastery percentages per section.

## Getting started

1. Install dependencies:
   ```bash
   npm install
   ```
2. Run the backend server:
   ```bash
   npm run server
   ```
3. Start the frontend:
   ```bash
   npm run dev
   ```

Open the Vite URL shown in your terminal, then upload a document and begin studying.

## Static deploy version

You can also build a browser-only static site that runs without the backend.

```bash
npm run build:static
```

This writes a complete static site into the `docs/` folder.

## GitHub Pages deployment

A GitHub Actions workflow is included in `.github/workflows/gh-pages.yml`.
When you push to `main`, the action will build the static site and publish it to the `gh-pages` branch.

If GitHub Pages is enabled for this repository using the `gh-pages` branch, your site will be published automatically.

To preview the static build locally, open `docs/index.html` or use a static file server.

## Notes

- The backend is in `server/` and handles file uploads, plan generation, and quiz evaluation.
- The frontend is in `src/` and provides the study dashboard and practice flow.
- This scaffold is designed for extension to more advanced AI-assisted generation, spaced practice schedules, and richer mastery analytics.
