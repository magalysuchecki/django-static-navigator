import * as vscode from 'vscode';
import {
	StaticReference,
	findPythonReference,
	findTemplateReference,
	resolveStaticFile,
} from './staticResolver';

const SECTION = 'django-static-navigator';

// Carpetas que nunca contienen estáticos fuente; staticfiles es la salida de collectstatic.
const SEARCH_EXCLUDE = '**/{node_modules,.git,.venv,venv,env,staticfiles,__pycache__}/**';

type ReferenceFinder = (line: string, column: number, config: vscode.WorkspaceConfiguration) => StaticReference | null;

function getStaticDirs(config: vscode.WorkspaceConfiguration): string[] {
	const dirs = config.get<string[]>('staticDirs') ?? [];
	const legacy = config.get<string>('staticDir');
	return [...new Set([...dirs, ...(legacy ? [legacy] : [])])];
}

function getRoots(document: vscode.TextDocument): string[] {
	const own = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;
	const all = (vscode.workspace.workspaceFolders ?? []).map(f => f.uri.fsPath);
	return [...new Set([...(own ? [own] : []), ...all])];
}

// Respaldo: busca el archivo en cualquier carpeta "static" del workspace (estáticos de cada app).
async function searchInAppStatic(relativePath: string): Promise<string[]> {
	try {
		const uris = await vscode.workspace.findFiles(`**/static/${relativePath}`, SEARCH_EXCLUDE, 5);
		return uris.map(u => u.fsPath);
	} catch {
		return [];
	}
}

function createProvider(find: ReferenceFinder): vscode.DefinitionProvider {
	return {
		async provideDefinition(document, position) {
			const config = vscode.workspace.getConfiguration(SECTION, document.uri);
			const line = document.lineAt(position.line).text;
			const reference = find(line, position.character, config);
			if (!reference) {
				return null;
			}

			const filePath = await resolveStaticFile(reference.relativePath, {
				roots: getRoots(document),
				dirs: getStaticDirs(config),
				search: config.get<boolean>('searchAppStatic', true) ? searchInAppStatic : undefined,
			});
			if (!filePath) {
				return null;
			}

			const link: vscode.LocationLink = {
				originSelectionRange: new vscode.Range(position.line, reference.start, position.line, reference.end),
				targetUri: vscode.Uri.file(filePath),
				targetRange: new vscode.Range(0, 0, 0, 0),
			};
			return [link];
		},
	};
}

export function activate(context: vscode.ExtensionContext) {
	const templateProvider = createProvider((line, column) => findTemplateReference(line, column));
	const pythonProvider = createProvider((line, column, config) =>
		findPythonReference(line, column, config.get<string[]>('filesExtensions') ?? []));

	context.subscriptions.push(
		// "html" cubre a quienes no tienen instalada una extensión que defina django-html.
		vscode.languages.registerDefinitionProvider(
			[{ scheme: 'file', language: 'django-html' }, { scheme: 'file', language: 'html' }],
			templateProvider,
		),
		vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'python' }, pythonProvider),
	);
}

export function deactivate() { }
