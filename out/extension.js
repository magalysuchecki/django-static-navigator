"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
function activate(context) {
    // Registramos un proveedor de definición para plantillas Django
    const definitionProvider = vscode.languages.registerDefinitionProvider({ scheme: 'file', language: 'django-html' }, // Solo aplica a plantillas Django
    {
        provideDefinition(document, position, token) {
            // Busca la ruta entre comillas en {% static "..." %}
            const range = document.getWordRangeAtPosition(position, /{% static "([^"]+)" %}/) ||
                document.getWordRangeAtPosition(position, /{% static '([^']+)' %}/);
            if (!range) {
                return null;
            }
            const match = document.getText(range).match(/"([^"]+)"/) ||
                document.getText(range).match(/'([^']+)'/);
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
            return new vscode.Location(vscode.Uri.file(filePath), new vscode.Position(0, 0));
        }
    });
    context.subscriptions.push(definitionProvider);
}
exports.activate = activate;
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map