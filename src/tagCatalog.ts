import * as fs from 'fs';
import * as path from 'path';

export interface TagArg {
    name: string;
    description: string;
}

export interface TagDef {
    name: string;
    description: string;
    usage: string;
    args: TagArg[];
    source: 'function' | 'grid' | 'template' | 'query';
}

const SOURCE_FILES: Array<{ file: string; source: TagDef['source'] }> = [
    { file: 'TagReference.ini', source: 'function' },
    { file: 'GridTagReference.ini', source: 'grid' },
    { file: 'TemplateTagReference.ini', source: 'template' },
    { file: 'QueryTagReference.ini', source: 'query' }
];

const RESERVED_KEYS = new Set([
    '1-description',
    '2-description',
    '3-neutral',
    '4-positive',
    '5-negative',
    '6-usage',
    '6-usage-1',
    '6-usage-2',
    '6-usage-3'
]);

function readUtf16Le(filePath: string): string {
    const buf = fs.readFileSync(filePath);
    let start = 0;
    if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
        start = 2;
    }
    return buf.slice(start).toString('utf16le');
}

function stripVersionPrefix(text: string): string {
    return text.replace(/^\{[^}]+\}/, '').trim();
}

function deriveTagName(sectionHeader: string): string | null {
    if (!sectionHeader.startsWith('TTag')) {
        return null;
    }
    return sectionHeader.slice(4);
}

interface RawSection {
    header: string;
    lines: string[];
}

function splitSections(content: string): RawSection[] {
    const sections: RawSection[] = [];
    let current: RawSection | null = null;
    const lineEnd = /\r?\n/;
    for (const rawLine of content.split(lineEnd)) {
        const line = rawLine.replace(/^﻿/, '');
        const headerMatch = /^\s*\[([^\]]+)\]\s*$/.exec(line);
        if (headerMatch) {
            if (current) {
                sections.push(current);
            }
            current = { header: headerMatch[1].trim(), lines: [] };
            continue;
        }
        if (current) {
            current.lines.push(line);
        }
    }
    if (current) {
        sections.push(current);
    }
    return sections;
}

function foldContinuations(lines: string[]): Array<{ key: string; value: string }> {
    const out: Array<{ key: string; value: string }> = [];
    for (const raw of lines) {
        if (!raw.trim()) {
            continue;
        }
        if (/^\s*\+/.test(raw) && out.length > 0) {
            out[out.length - 1].value += ' ' + raw.replace(/^\s*\+\s?/, '');
            continue;
        }
        const eqIdx = raw.indexOf('=');
        if (eqIdx < 0) {
            continue;
        }
        const key = raw.slice(0, eqIdx).trim();
        const value = raw.slice(eqIdx + 1).trim();
        out.push({ key, value });
    }
    return out;
}

function parseSection(section: RawSection, source: TagDef['source']): TagDef | null {
    const name = deriveTagName(section.header);
    if (!name) {
        return null;
    }
    const entries = foldContinuations(section.lines);
    let description = '';
    let usage = '';
    const args: TagArg[] = [];
    for (const { key, value } of entries) {
        const lowerKey = key.toLowerCase();
        if (lowerKey === '1-description' || lowerKey === '2-description') {
            if (!description) {
                description = stripVersionPrefix(value);
            }
        } else if (lowerKey === '6-usage') {
            if (!usage) {
                usage = value;
            }
        } else if (RESERVED_KEYS.has(lowerKey)) {
            continue;
        } else {
            const argDesc = stripVersionPrefix(value);
            if (argDesc.toLowerCase().startsWith('hidden')) {
                continue;
            }
            args.push({ name: key, description: argDesc });
        }
    }
    if (description.toLowerCase().startsWith('hidden')) {
        return null;
    }
    return { name, description, usage, args, source };
}

export function loadTagCatalog(baseDir: string): TagDef[] {
    const tags: TagDef[] = [];
    for (const { file, source } of SOURCE_FILES) {
        const full = path.join(baseDir, file);
        if (!fs.existsSync(full)) {
            continue;
        }
        let content: string;
        try {
            content = readUtf16Le(full);
        } catch {
            continue;
        }
        for (const section of splitSections(content)) {
            const tag = parseSection(section, source);
            if (tag) {
                tags.push(tag);
            }
        }
    }
    const seen = new Set<string>();
    const unique: TagDef[] = [];
    for (const tag of tags) {
        const key = `${tag.source}:${tag.name}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        unique.push(tag);
    }
    return unique;
}
