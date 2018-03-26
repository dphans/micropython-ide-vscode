'use strict';
import Base from './classes/base';
import * as vscode from 'vscode';
import ProjectManager from './classes/project/project';


export default new class App extends Base {

  private _projectManager?: ProjectManager;

  public registerExtensionContext(context: vscode.ExtensionContext) {
    this._projectManager    = new ProjectManager();
    this.registerWorkspaceBehaviours();

    context.subscriptions.push(vscode.commands.registerCommand(Base.CONSTANTS.COMMANDS.GET_STARTED, () => {
      this._projectManager!.actionShowMainMenu();
    }));
    context.subscriptions.push(vscode.commands.registerCommand(Base.CONSTANTS.COMMANDS.PROJECT_RUN, () => {
      this._projectManager!.actionRun();
    }));
    context.subscriptions.push(vscode.commands.registerCommand(Base.CONSTANTS.COMMANDS.PROJECT_STOP, () => {
      this._projectManager!.terminalKillCurrentProcess();
    }));
    if (vscode.window.activeTextEditor) {
      this.showToolbarForActiveDocumentIfNeeded(vscode.window.activeTextEditor.document.uri);
    }
    this.statusDone();
  }

  private registerWorkspaceBehaviours() {
    // document open
    // purpose:
    //  - show run button if opened document can be run
    vscode.workspace.onDidOpenTextDocument((textDocument: vscode.TextDocument) => {
      this.log("onDidOpenTextDocument");
      this.showToolbarForActiveDocumentIfNeeded(textDocument.uri);
    });

    // document text changed
    // purpose:
    vscode.workspace.onDidChangeTextDocument((textDocumentChangeEvent: vscode.TextDocumentChangeEvent) => {
      this.log("onDidChangeTextDocument");
      console.log("User did updated text document but not saved yet");
    });

    // document did saved
    // purpose:
    //  - show run button if saved document can be execute
    vscode.workspace.onDidSaveTextDocument((textDocument: vscode.TextDocument) => {
      this.log("onDidSaveTextDocument");
      this.showToolbarForActiveDocumentIfNeeded(textDocument.uri);
    });

    // document did closed
    // purpose:
    //  - hide the run button because cannot run empty document
    vscode.workspace.onDidCloseTextDocument((textDocument: vscode.TextDocument) => {
      this.log("onDidCloseTextDocument");
      this.showToolbarForActiveDocumentIfNeeded(textDocument.uri);
    });

    // documents has been switched
    // purpose:
    //  - hide the run button if active text editor cannot be run
    vscode.window.onDidChangeActiveTextEditor((textEditor?: vscode.TextEditor) => {
      this.log("onDidChangeActiveTextEditor");
      if (!textEditor) {
        this.toolbarRunShown(false);
        return;
      }
      this.showToolbarForActiveDocumentIfNeeded(textEditor.document.uri);
    });

    // terminal did closed
    // purpose:
    //  - hide the stop button if closed terminal is default app's terminal
    vscode.window.onDidCloseTerminal(async (terminal: vscode.Terminal) => {
      this.log("onDidCloseTerminal");
      let defaultTerminalPID  = await this.terminalGetProcessId();
      let closedTerminalPID   = await terminal.processId;
      if (defaultTerminalPID === closedTerminalPID) {
        this.toolbarStopShown(false);
      }
    });
  }

  private showToolbarForActiveDocumentIfNeeded(documentUri: vscode.Uri) {
    if (this.isMicropythonProject(documentUri)) {
      this.toolbarRunShown(true);
    } else {
      this.toolbarRunShown(false);
    }
  }

  public onDestroyed() {
    super.onDestroyed();
  }

};
