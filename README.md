# Efficy Enterprise HTM — VS Code Extension (Lightweight Starter)

Editor support for Efficy CRM `.htm` files: syntax highlighting, snippets, and basic tag-name autocompletion for the proprietary `<%TagName(...)%>` server-side tag language.

## What this gives you

- **Syntax highlighting** of `<%Tag(...)%>`, `<%/Tag%>`, the `%%inner%%` evaluation operator, and the `arg%=` / `arg@=` shorthand operators — layered on top of standard HTML, so HTML/CSS/JavaScript inside `.htm` files continue to highlight normally.
- **Snippets** for the most common tags (`GetLabel`, `Switch`, `If`, `OnArgument`, `Macro`, `LoadMacros`, `GetField`, `GetArgument`, `GetSetting`, `GetServerVariable`, `IncludeFile`, `RunScript`, `LoadServerJs`, `GetDataGrid`, `UseScript`, `UseEditForm`, `Navigate`, `SetBookmark`, `OnEntity`, `OnField`, plus operators). Type a prefix like `eff-getlabel` and press Tab.
- **Tag-name completion** triggered after `<%`. Sourced from the official `TagReference*.ini` files when available (~200+ function tags + grid/template/query tags).

This is the **starter** scope. Hover documentation, signature help, argument-value completion, and diagnostics are deferred to a future LSP-based release.

## Install (internal pilot)

```powershell
# from the plugin project folder
npm install
npm run compile
npx vsce package
code --install-extension efficy-enterprise-htm-0.1.0.vsix
```

## Configuration

Open VS Code settings and look for **Efficy Enterprise HTM**:

| Setting | Default | Description |
| --- | --- | --- |
| `efficyEnterpriseHtm.tagReferencePath` | `c:\Data\Application\App\Documentation` | Folder containing `TagReference.ini`, `GridTagReference.ini`, `TemplateTagReference.ini`, `QueryTagReference.ini`. UTF-16 LE encoding is auto-detected. |
| `efficyEnterpriseHtm.activateOnHtmlWithTags` | `true` | Auto-switch `.htm` files to the Efficy language when they contain `<%` in the first ~4 KB. |

If the `TagReference*.ini` files are not reachable, the extension still loads grammar + snippets — only the catalog-driven completion list will be empty.

## Manual file-association alternative

If you prefer explicit opt-in rather than auto-detection, add to your workspace `settings.json`:

```json
{
  "files.associations": {
    "**/WebClient/**/*.htm": "efficy-enterprise-htm"
  }
}
```

## Manual verification checklist

Open the file `c:\Data\ThinClient\WebClient\home.htm`:

- [ ] Lines 98–99: `<%GetLabel(...)%>` and `<%Switch(...)%>` are highlighted distinctly from surrounding HTML.
- [ ] JavaScript inside `<script>` blocks still highlights as JS.
- [ ] Open a few files from `efficy/pages/`, `conficy/pages/`, `extranet/pages/` — no regressions.
- [ ] Type `<%` on a new line — completion list appears with tag names.
- [ ] Type `<%get` — completion list filters to `Get…` tags.
- [ ] Type `eff-getlabel` and press Tab — snippet expands.
- [ ] Disable the extension and reload — `.htm` files revert to plain HTML highlighting.

## Project layout

```
c:\data\htm-plugin\
  package.json
  language-configuration.json
  tsconfig.json
  .vscodeignore
  syntaxes\
    efficy-enterprise-htm.tmLanguage.json
    efficy-tags.injection.tmLanguage.json
  snippets\
    efficy-enterprise-htm.code-snippets
  src\
    extension.ts
    tagCatalog.ts
```

## Roadmap

- **Phase 2 (LSP):** hover docs, signature help, argument-value completion, diagnostics for unknown tags / invalid arguments.
- **Phase 3 (AI):** RAG over the tag catalog and existing `.htm` examples, exposed as a Continue.dev / Copilot custom context provider.
- **IntelliJ port:** via LSP4IJ once the LSP server exists.
