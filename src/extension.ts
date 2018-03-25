'use strict';
import * as vscode from 'vscode';
import app from './app/app';


export function activate(context: vscode.ExtensionContext) {
  app.registerExtensionContext(context);
}

export function deactivate() {
  app.onDestroyed();
}
