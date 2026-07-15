# Security Policy

## Supported versions

Security fixes are applied to the latest development version until the project reaches a stable 1.0 release.

## Reporting a vulnerability

Do not publish vulnerabilities involving arbitrary file access, path traversal, unsafe deletion, code execution, or exposure of local data in a public issue.

Use GitHub's private vulnerability reporting feature after this repository is published. Until that feature is enabled, contact the maintainer through the private contact method listed on the maintainer's GitHub profile.

Include:

- A clear description of the impact.
- Reproduction steps.
- Affected ComfyUI and frontend versions.
- Relevant operating system details.
- The smallest safe proof of concept.
- Suggested mitigation, when known.

Do not include private workflow contents, API keys, account tokens, or unrelated local file paths.

## High-risk areas

Extra care is required for:

- Workflow file move, rename, delete, trash, restore, and import operations.
- Custom workflow roots and path validation.
- Official favorites import and export.
- Template and settings migration.
- Frontend HTML rendering and untrusted labels.
- Third-party panel registration.

The project will acknowledge a valid report, investigate it, and publish a fix and advisory when appropriate. Exact response times are not guaranteed for this pre-1.0 volunteer project.
