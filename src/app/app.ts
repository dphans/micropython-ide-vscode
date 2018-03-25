'use strict';
import Base from './classes/base';
import * as vscode from 'vscode';
import ProjectManager from './classes/project/project';


export default new class App extends Base {

  private _projectManager: ProjectManager;
  private _toolbarRunProject: vscode.StatusBarItem;

  constructor() {
    super();
    this._projectManager = new ProjectManager();
    this._toolbarRunProject = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
    this._toolbarRunProject.text = "▶";
    this._toolbarRunProject.tooltip = Base.CONSTANTS.APP.UNIQUE_NAME + ": Build this file then run main.py script";
    this._toolbarRunProject.color = '#89D185';
    this._toolbarRunProject.command = Base.CONSTANTS.COMMANDS.PROJECT_RUN;
  }

  public registerExtensionContext(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand(Base.CONSTANTS.COMMANDS.GET_STARTED, () => {
      this._projectManager.showMainMenu();
    }));
    context.subscriptions.push(vscode.commands.registerCommand(Base.CONSTANTS.COMMANDS.PROJECT_RUN, () => {
      this._projectManager.buildActiveDocumentThenRun();
    }));
    if (vscode.window.activeTextEditor) {
      this.showToolbarForActiveDocumentIfNeeded(vscode.window.activeTextEditor.document.uri);
    }
    this.statusDone();
  }

  protected onInitial() {
    super.onInitial();
    this.registerWorkspaceBehaviours();
  }

  private registerWorkspaceBehaviours() {
    // document open
    vscode.workspace.onDidOpenTextDocument((textDocument: vscode.TextDocument) => {
      this.showToolbarForActiveDocumentIfNeeded(textDocument.uri);
    });

    // document text changed
    vscode.workspace.onDidChangeTextDocument((textDocumentChangeEvent: vscode.TextDocumentChangeEvent) => {
      console.log("User did updated text document but not saved yet");
    });

    // document did saved
    vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
      console.log("User did saved text document");
    });

    // document did closed
    vscode.workspace.onDidCloseTextDocument((textDocument: vscode.TextDocument) => {
      this._toolbarRunProject.hide();
    });

    // user switch between documents
    vscode.window.onDidChangeActiveTextEditor((textEditor?: vscode.TextEditor) => {
      if (!textEditor) {
        this._toolbarRunProject.hide();
        return;
      }
      this.showToolbarForActiveDocumentIfNeeded(textEditor.document.uri);
    });
  }

  private showToolbarForActiveDocumentIfNeeded(documentUri: vscode.Uri) {
    if (this.isMicropythonProject(documentUri)) {
      this._toolbarRunProject.show();
    } else {
      this._toolbarRunProject.hide();
    }
  }

  public onDestroyed() {
    super.onDestroyed();
  }

};
