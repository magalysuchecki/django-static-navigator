import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	// Registramos un proveedor de definición para plantillas Django
	const definitionProvider = vscode.languages.registerDefinitionProvider(
		{ scheme: 'file', language: 'django-html' }, // Solo aplica a plantillas Django
		{
			provideDefinition(document, position, token) {
				console.log('desde extension');
				// Busca la ruta entre comillas en {% static "..." %}
				const range = document.getWordRangeAtPosition(position, /{% static "([^"]+)" %}/);
				if (!range) {
					return null;
				}

				const match = document.getText(range).match(/"([^"]+)"/);
				if (!match) {
					return null;
				}

				const relativePath = match[1]; // Ruta extraída del bloque {% static %}
				const workspaceFolders = vscode.workspace.workspaceFolders;

				if (!workspaceFolders) {
					return null;
				}
				const config = vscode.workspace.getConfiguration();
				const staticDirRelative = String(config.get('django-static-navigator.staticDir'));
				const staticDir = path.join(workspaceFolders[0].uri.fsPath, staticDirRelative);
				const filePath = path.join(staticDir, relativePath);
				console.log('staticDir', staticDir, 'filePath', filePath);
				return new vscode.Location(vscode.Uri.file(filePath), new vscode.Position(0, 0));
			}
		}
	);

	context.subscriptions.push(definitionProvider);
}

export function deactivate() { }
