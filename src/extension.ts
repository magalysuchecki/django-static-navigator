import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {

	// Registramos un proveedor de definición para plantillas Django
	const djangoHtmlDefinitionProvider = vscode.languages.registerDefinitionProvider(

		{ scheme: 'file', language: 'django-html' }, // Solo aplica a plantillas Django
		{
			provideDefinition(document, position, token) {
				const config = vscode.workspace.getConfiguration();
				const range =
					document.getWordRangeAtPosition(position, /{% static "([^"]+)" %}/) ||
					document.getWordRangeAtPosition(position, /{% static '([^']+)' %}/)

				if (!range) {
					return null;
				}
				const match =
					document.getText(range).match(/"([^"]+)"/) ||
					document.getText(range).match(/'([^']+)'/);
				if (!match) {
					return null;
				}
				const relativePath = match[1]; // Ruta extraída del bloque {% static %}
				const workspaceFolders = vscode.workspace.workspaceFolders;

				if (!workspaceFolders) {
					return null;
				}

				const staticDirRelative = String(config.get('django-static-navigator.staticDir'));
				const staticDir = path.join(workspaceFolders[0].uri.fsPath, staticDirRelative);
				const filePath = path.join(staticDir, relativePath);
				return new vscode.Location(vscode.Uri.file(filePath), new vscode.Position(0, 0));
			}
		}
	);

	// Registramos un proveedor de definición para archivos Python
	const pythonDefinitionProvider = vscode.languages.registerDefinitionProvider(
		{ scheme: 'file', language: 'python' }, // Solo aplica a archivos Python
		{
			provideDefinition(document, position, token) {
				const config = vscode.workspace.getConfiguration();
				let fileExts: string[] = config.get('django-static-navigator.filesExtensions') || [];
				const fileExtsPattern = fileExts.join("|");
				const regexDoubleQuotes = new RegExp(`"[^"]+\\.(${fileExtsPattern})"`);
				const regexSingleQuotes = new RegExp(`'[^']+\\.(${fileExtsPattern})'`);

				const range =
					document.getWordRangeAtPosition(position, regexDoubleQuotes) ||
					document.getWordRangeAtPosition(position, regexSingleQuotes);
				if (!range) {
					return null;
				}
				const match =
					document.getText(range).match(/"([^"]+)"/) ||
					document.getText(range).match(/'([^']+)'/);
				if (!match) {
					return null;
				}
				const relativePath = match[1]; // Ruta extraída de la función static()
				const workspaceFolders = vscode.workspace.workspaceFolders;

				if (!workspaceFolders) {
					return null;
				}

				const staticDirRelative = String(config.get('django-static-navigator.staticDir'));
				const staticDir = path.join(workspaceFolders[0].uri.fsPath, staticDirRelative);
				const filePath = path.join(staticDir, relativePath);
				return new vscode.Location(vscode.Uri.file(filePath), new vscode.Position(0, 0));
			}
		}
	);
	context.subscriptions.push(djangoHtmlDefinitionProvider, pythonDefinitionProvider);
}

export function deactivate() { }
