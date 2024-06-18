import * as vscode from 'vscode';
import * as path from 'path';
import * as sound from 'sound-play';

let lastPlayTime = 0; // Moved to a higher scope

// Function to play sound
function playSound(context: vscode.ExtensionContext) {
    const soundPath = vscode.Uri.file(path.join(context.extensionPath, 'media', 'Placement_Warning.wav')).fsPath;
    sound.play(soundPath).catch(err => console.error('Error playing sound:', err));
    lastPlayTime = Date.now(); // Update lastPlayTime after playing sound
}

export function activate(context: vscode.ExtensionContext) {
    const typeScriptDiagnostics = vscode.languages.createDiagnosticCollection('typescript');
    const previousDiagnostics = new Set<string>();

    // Listen for changes in diagnostics
    vscode.languages.onDidChangeDiagnostics(event => {
        const editor = vscode.window.activeTextEditor;
        if (editor && editor.document.languageId.includes('typescript')) {
            handleDiagnosticsForActiveEditor(editor.document, previousDiagnostics, context);
        }
    });

    context.subscriptions.push(vscode.commands.registerCommand('extension.playSound', () => playSound(context)));
}

function handleDiagnosticsForActiveEditor(document: vscode.TextDocument, previousDiagnostics: Set<string>, context: vscode.ExtensionContext) {
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    let soundPlayed = false; // Flag to ensure sound is played only once

    diagnostics.forEach(diagnostic => {
        if (diagnostic.code === 2322) { // TS2322 is the code for a type error
            let lineText = document.lineAt(diagnostic.range.start.line).text;
            lineText = lineText.split("//")[0];
            // trim the line text
            lineText = lineText.trim();

            // is it possible to remove this condition to support TSX?
            // if (!lineText.endsWith(";")) {
            //     return;
            // }

            const diagnosticKey = `${document.uri.toString()}|${diagnostic.range.start.line}|${diagnostic.message}`;
            if (!previousDiagnostics.has(diagnosticKey)) {
                previousDiagnostics.add(diagnosticKey);

                // Play a sound only if it hasn't been played yet
                // Assuming the existing code context
				if (!soundPlayed && Date.now() - lastPlayTime > 10000) {
					playSound(context);
					soundPlayed = true;

					const selection = new vscode.Selection(diagnostic.range.start, diagnostic.range.end);

                    // is it possible to remove jumping to selection as it break DX? I think just highlighting in enough
					// if (vscode.window.activeTextEditor) {
					// 	// If activeTextEditor is not undefined, proceed with the operations
					// 	vscode.window.activeTextEditor.selection = selection;
					// 	vscode.window.activeTextEditor.revealRange(selection);
					// }

					// Create and apply decoration
					const decorationType = vscode.window.createTextEditorDecorationType({
						backgroundColor: 'rgba(255, 0, 0, 0.3)' // Example: light red background
					});
					if (vscode.window.activeTextEditor) {
						vscode.window.activeTextEditor.setDecorations(decorationType, [selection]);
					}

					// Remove decoration after 3 seconds
					setTimeout(() => {
						if (vscode.window.activeTextEditor) {
							vscode.window.activeTextEditor.setDecorations(decorationType, []); // Clear the decoration
						}
					}, 3000);
				}
            }
        }
    });

    // Clean up old diagnostics for the current document
    const currentDocumentDiagnostics = new Set(diagnostics.map(d => `${document.uri.toString()}|${d.range.start.line}|${d.message}`));
    for (let diagnostic of previousDiagnostics) {
        if (diagnostic.startsWith(document.uri.toString()) && !currentDocumentDiagnostics.has(diagnostic)) {
            previousDiagnostics.delete(diagnostic);
        }
    }
}

export function deactivate() {
    // Clean up resources if necessary
}