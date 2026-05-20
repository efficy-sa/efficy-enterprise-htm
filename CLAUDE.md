# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Purpose

VS Code extension that adds editor support for Efficy Enterprise CRM `.htm` template files. The extension provides syntax highlighting, snippets, and tag-name autocompletion for Efficy's proprietary `<%Tag(...)%>` server-side templating language.

## Commands

```bash
npm install           # Install dev dependencies
npm run compile       # TypeScript → JS (outputs to out/)
npm run watch         # Recompile on file changes
npm run package       # Bundle into .vsix for distribution
```

There is no test runner — verification is manual (see README.md for the checklist).

## Architecture

The extension has two source files:

- **`src/tagCatalog.ts`** — Parses up to 4 `TagReference*.ini` files from a user-configured directory. These files are UTF-16 LE encoded (BOM-aware). Each INI section `[TTagName]` maps to a `TagDef` with `name`, `description`, `usage`, `args[]`, and `source` (`function | grid | template | query`). Tags marked hidden are filtered out; duplicates are deduplicated by source+name.

- **`src/extension.ts`** — Activates on `onLanguage:efficy-enterprise-htm`. Registers a `CompletionItemProvider` triggered by `%` that surfaces tag names from the catalog as completion items with Markdown documentation. Also detects plain `.htm` files containing `<%` in the first 4 KB and reassigns their language mode when `efficyEnterpriseHtm.activateOnHtmlWithTags` is enabled. Watches the `efficyEnterpriseHtm.tagReferencePath` setting and reloads the catalog on change.

Grammar is defined in two TextMate files under `syntaxes/`:
- `efficy-enterprise-htm.tmLanguage.json` — Full grammar for the `efficy-enterprise-htm` language ID.
- `efficy-tags.injection.tmLanguage.json` — Injects Efficy tag patterns into `text.html.basic` (plain HTML files).

Snippets live in `snippets/efficy-enterprise-htm.code-snippets`. All snippet prefixes follow the `eff-` convention.

## Key Setting

`efficyEnterpriseHtm.tagReferencePath` (default: `c:\Data\Application\App\Documentation`) — directory that must contain `TagReference.ini`, `GridTagReference.ini`, `TemplateTagReference.ini`, and/or `QueryTagReference.ini`. The extension degrades gracefully when none are found.
