/**
 * Shared formatting utilities for string-based code generators.
 *
 * Keep this module tiny and stable. Renderers can override indent/newline
 * by passing options to `indent()` / `joinLines()` / `line()`.
 */

export const DEFAULT_INDENT = "  ";
export const DEFAULT_NEWLINE = "\n";

export type RenderFormatOptions = {
    indent?: string;
    newline?: string;
};

/**
 * Returns an indentation string for the given level.
 */
export function indent(level: number, opts: RenderFormatOptions = {}): string {
    const indentStr = opts.indent ?? DEFAULT_INDENT;
    if (level <= 0) return "";
    return indentStr.repeat(level);
}

/**
 * Joins lines using the configured newline (defaults to LF).
 */
export function joinLines(lines: string[], opts: RenderFormatOptions = {}): string {
    const nl = opts.newline ?? DEFAULT_NEWLINE;
    return lines.join(nl);
}

/**
 * Convenience helper for building indented lines.
 */
export function line(level: number, text: string, opts: RenderFormatOptions = {}): string {
    return `${indent(level, opts)}${text}`;
}
