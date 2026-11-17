// Lógica pura (sin dependencia de VS Code) para detectar referencias a
// archivos estáticos y ubicarlos en disco. Se mantiene aparte para poder testearla.
import * as path from 'path';
import { promises as fs } from 'fs';

export interface StaticReference {
	/** Ruta tal como aparece en el código, sin query string ni barra inicial. */
	relativePath: string;
	/** Columna donde empieza la ruta (sin comillas). */
	start: number;
	/** Columna donde termina la ruta (sin comillas). */
	end: number;
}

export interface ResolveOptions {
	/** Carpetas raíz del workspace, en orden de prioridad. */
	roots: string[];
	/** Carpetas de estáticos relativas a cada raíz (acepta "\" o "/"). */
	dirs: string[];
	/** Búsqueda de respaldo cuando no está en ninguna carpeta configurada. */
	search?: (relativePath: string) => Promise<string[]>;
}

// {% static "x" %}, {%static 'x'%}, {% static 'x' as var %}
const TEMPLATE_TAG = /\{%\s*static\s+(["'])(.+?)\1(?:\s+as\s+\w+)?\s*%\}/g;

/** Pasa "\" a "/" para que la ruta funcione igual en Windows y Linux/WSL. */
export function normalizeSlashes(value: string): string {
	return value.replace(/\\/g, '/');
}

/** Quita barra inicial, query string y ancla: "/js/app.js?v=2" -> "js/app.js". */
export function cleanRelativePath(value: string): string {
	return normalizeSlashes(value).split(/[?#]/)[0].replace(/^\/+/, '').trim();
}

function toReference(rawPath: string, start: number): StaticReference | null {
	const relativePath = cleanRelativePath(rawPath);
	if (!relativePath) {
		return null;
	}
	return { relativePath, start, end: start + rawPath.length };
}

/** Busca una etiqueta {% static %} que contenga la columna indicada. */
export function findTemplateReference(line: string, column: number): StaticReference | null {
	for (const match of line.matchAll(TEMPLATE_TAG)) {
		const tagStart = match.index ?? 0;
		const tagEnd = tagStart + match[0].length;
		if (column < tagStart || column > tagEnd) {
			continue;
		}
		const pathStart = tagStart + match[0].indexOf(match[1]) + 1;
		return toReference(match[2], pathStart);
	}
	return null;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Busca un string de Python terminado en alguna de las extensiones dadas. */
export function findPythonReference(line: string, column: number, extensions: string[]): StaticReference | null {
	const exts = extensions.map(e => e.trim().replace(/^\./, '')).filter(Boolean);
	if (exts.length === 0) {
		return null;
	}
	const pattern = new RegExp(`(["'])([^"'\\s]+\\.(?:${exts.map(escapeRegExp).join('|')}))\\1`, 'g');
	for (const match of line.matchAll(pattern)) {
		const start = match.index ?? 0;
		if (column >= start && column <= start + match[0].length) {
			return toReference(match[2], start + 1);
		}
	}
	return null;
}

/**
 * Arma las rutas posibles (raíz x carpeta de estáticos) sin duplicados.
 * Descarta las que salen de la carpeta de estáticos, por ejemplo con "../".
 */
export function buildCandidates(relativePath: string, roots: string[], dirs: string[]): string[] {
	const rel = cleanRelativePath(relativePath);
	const result = new Set<string>();
	for (const root of roots) {
		for (const dir of dirs) {
			const base = path.resolve(root, normalizeSlashes(dir));
			const full = path.resolve(base, rel);
			const inside = path.relative(base, full);
			if (inside && !inside.startsWith('..') && !path.isAbsolute(inside)) {
				result.add(full);
			}
		}
	}
	return [...result];
}

async function isFile(filePath: string): Promise<boolean> {
	try {
		return (await fs.stat(filePath)).isFile();
	} catch {
		return false;
	}
}

/** Devuelve la ruta absoluta del primer archivo existente, o null si no aparece. */
export async function resolveStaticFile(relativePath: string, options: ResolveOptions): Promise<string | null> {
	const rel = cleanRelativePath(relativePath);
	if (!rel) {
		return null;
	}
	for (const candidate of buildCandidates(rel, options.roots, options.dirs)) {
		if (await isFile(candidate)) {
			return candidate;
		}
	}
	if (!options.search) {
		return null;
	}
	let found: string[] = [];
	try {
		found = await options.search(rel);
	} catch {
		return null;
	}
	for (const candidate of found) {
		if (await isFile(candidate)) {
			return candidate;
		}
	}
	return null;
}
