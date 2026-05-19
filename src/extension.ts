import * as vscode from 'vscode';
import { loadTagCatalog, TagDef } from './tagCatalog';

const LANGUAGE_ID = 'efficy-enterprise-htm';
const HTML_PROBE_BYTES = 4096;

let catalog: TagDef[] = [];

export function activate(context: vscode.ExtensionContext): void {
    refreshCatalog();

    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration((event) => {
            if (event.affectsConfiguration('efficyEnterpriseHtm.tagReferencePath')) {
                refreshCatalog();
            }
        })
    );

    for (const doc of vscode.workspace.textDocuments) {
        void maybeAdoptDocument(doc);
    }
    context.subscriptions.push(
        vscode.workspace.onDidOpenTextDocument((doc) => void maybeAdoptDocument(doc))
    );

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(
            { language: LANGUAGE_ID, scheme: 'file' },
            new EfficyTagCompletionProvider(() => catalog),
            '%'
        )
    );
}

export function deactivate(): void {
    catalog = [];
}

function refreshCatalog(): void {
    const config = vscode.workspace.getConfiguration('efficyEnterpriseHtm');
    const dir = config.get<string>('tagReferencePath', '');
    if (!dir) {
        catalog = [];
        return;
    }
    try {
        catalog = loadTagCatalog(dir);
    } catch {
        catalog = [];
    }
}

async function maybeAdoptDocument(doc: vscode.TextDocument): Promise<void> {
    if (doc.languageId !== 'html' && doc.languageId !== 'plaintext') {
        return;
    }
    if (!doc.fileName.toLowerCase().endsWith('.htm')) {
        return;
    }
    const config = vscode.workspace.getConfiguration('efficyEnterpriseHtm');
    if (!config.get<boolean>('activateOnHtmlWithTags', true)) {
        return;
    }
    const probe = doc.getText(
        new vscode.Range(
            doc.positionAt(0),
            doc.positionAt(Math.min(HTML_PROBE_BYTES, doc.getText().length))
        )
    );
    if (!/<%[A-Za-z/]/.test(probe)) {
        return;
    }
    try {
        await vscode.languages.setTextDocumentLanguage(doc, LANGUAGE_ID);
    } catch {
        // setTextDocumentLanguage can race during shutdown; safe to ignore.
    }
}

class EfficyTagCompletionProvider implements vscode.CompletionItemProvider {
    constructor(private readonly getCatalog: () => TagDef[]) {}

    provideCompletionItems(
        document: vscode.TextDocument,
        position: vscode.Position
    ): vscode.CompletionItem[] {
        const lineToCursor = document.lineAt(position.line).text.slice(0, position.character);
        const triggerMatch = /<%(\/?)([A-Za-z_][A-Za-z0-9_]*)?$/.exec(lineToCursor);
        if (!triggerMatch) {
            return [];
        }
        const isClosing = triggerMatch[1] === '/';
        const prefix = triggerMatch[2] ?? '';
        const items: vscode.CompletionItem[] = [];
        const tags = this.getCatalog();
        for (const tag of tags) {
            if (prefix && !tag.name.toLowerCase().startsWith(prefix.toLowerCase())) {
                continue;
            }
            const item = new vscode.CompletionItem(tag.name, vscode.CompletionItemKind.Function);
            item.detail = `Efficy ${tag.source} tag`;
            item.documentation = buildMarkdownDoc(tag);
            if (isClosing) {
                item.insertText = `${tag.name}%>`;
            } else {
                const snippet = new vscode.SnippetString();
                snippet.appendText(tag.name);
                snippet.appendText('(');
                snippet.appendPlaceholder('');
                snippet.appendText(')%>');
                item.insertText = snippet;
            }
            items.push(item);
        }
        return items;
    }
}

function buildMarkdownDoc(tag: TagDef): vscode.MarkdownString {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${tag.name}** — Efficy ${tag.source} tag\n\n`);
    if (tag.description) {
        md.appendMarkdown(`${tag.description}\n\n`);
    }
    if (tag.usage) {
        md.appendCodeblock(tag.usage, 'efficy-enterprise-htm');
    }
    if (tag.args.length > 0) {
        md.appendMarkdown(`\n**Arguments:**\n\n`);
        for (const arg of tag.args) {
            md.appendMarkdown(`- \`${arg.name}\` — ${arg.description}\n`);
        }
    }
    md.isTrusted = false;
    return md;
}
