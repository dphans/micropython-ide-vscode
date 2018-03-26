'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Terminal from './helpers/terminal-helper';


export default class Base {

  public static readonly CONSTANTS: any = require("../constants");

  /* default Status */
  private static _statusBar: vscode.StatusBarItem;
  private static _isStatusBarShown: boolean = false;

  /* default Output Window */
  private static _outputChannel: vscode.OutputChannel;
  private static _isOutputChannelShown: boolean = false;

  /* default Terminal Window */
  private static _terminal?: vscode.Terminal;
  private static _isTerminalShown: boolean = false;

  /* default Toolbar items */
  private static _toolbarRunProject: vscode.StatusBarItem;
  private static _isToolbarRunProjectShown: boolean = false;
  private static _toolbarStopProject: vscode.StatusBarItem;
  private static _isToolbarStopProjectShown: boolean = false;

  public static getTerminalHelper() {
    return Terminal;
  }

  constructor() {
    this.onInitial();
  }

  protected onInitial() {
    if (!Base._statusBar) {
      Base._statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
      Base._statusBar.command = Base.CONSTANTS.COMMANDS.GET_STARTED;
    }
    if (!Base._outputChannel) {
      Base._outputChannel = vscode.window.createOutputChannel(Base.CONSTANTS.APP.UNIQUE_NAME);
    }
    if (!Base._toolbarRunProject) {
      Base._toolbarRunProject = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
      Base._toolbarRunProject.text = "▶";
      Base._toolbarRunProject.tooltip = Base.CONSTANTS.APP.UNIQUE_NAME + ": Build this file then run main.py script";
      Base._toolbarRunProject.color = '#89D185';
      Base._toolbarRunProject.command = Base.CONSTANTS.COMMANDS.PROJECT_RUN;
    }
    if (!Base._toolbarStopProject) {
      Base._toolbarStopProject = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right);
      Base._toolbarStopProject.text = "■";
      Base._toolbarStopProject.tooltip = Base.CONSTANTS.APP.UNIQUE_NAME + ": Stop current running serial monitor";
      Base._toolbarStopProject.color = '#F48771';
      Base._toolbarStopProject.command = Base.CONSTANTS.COMMANDS.PROJECT_STOP;
    }
  }

  protected onDestroyed() {
    this.statusShown(false);
    delete Base._statusBar;
    this.outputShown(false);
    delete Base._outputChannel;
  }

  /**
   * Show status bar with message
   * @param message text need to show
   */
  protected statusText(message: string, tooltipText: string = "") {
    if (!Base._statusBar) { return; }
    Base._statusBar.text = Base.CONSTANTS.APP.UNIQUE_NAME + ": " + message;
    if (tooltipText.length) { Base._statusBar.tooltip = tooltipText; }
    this.statusShown(true);
  }

  protected statusWarning(isWarning: boolean = true) {
    if (!Base._statusBar) { return; }
    Base._statusBar.color = isWarning ? '#F48771' : '#FFFFFF';
  }

  /**
   * Toggle status bar
   * @param isShown true if need to show status bar
   */
  protected statusShown(isShown: boolean = false) {
    if (!Base._statusBar) { return; }
    if (isShown) {
      if (Base._isStatusBarShown) { return; }
      Base._statusBar.show();
      Base._isOutputChannelShown = true;
      return;
    }
    if (!Base._isStatusBarShown) { return; }
    Base._statusBar.hide();
    Base._isOutputChannelShown = false;
  }

  /**
   * Reset status bar text
   */
  protected statusDone() {
    this.statusText("Done!", "Click here to getting started!");
  }

  /**
   * Print into Output window
   * @param message text need to log into output
   */
  protected outputPrint(message: string) {
    if (!Base._outputChannel) { return; }
    this.outputShown(true);
    Base._outputChannel.append(message);
  }

  /**
   * Print into Output window with new line
   * @param message text need to log into output
   */
  protected outputPrintLn(message: string, isAlsoUpdateStatus: boolean = false) {
    if (!Base._outputChannel) { return; }
    this.outputShown(true);
    Base._outputChannel.appendLine(message);
    if (isAlsoUpdateStatus) { this.statusText(message); }
  }

  /**
   * Clear Output window
   * @param alsoHideWindow hide Output after clear, default is false
   */
  protected outputClear(alsoHideWindow: boolean = false) {
    if (!Base._outputChannel) { return; }
    Base._outputChannel.clear();
    if (alsoHideWindow) { this.outputShown(false); }
  }

  /**
   * Create Terminal window if not available
   */
  protected terminalInitIfNeeded() {
    if (Base._terminal) { return; }
    Base._terminal = vscode.window.createTerminal(Base.CONSTANTS.APP.UNIQUE_NAME);
    Base._isTerminalShown = false;
  }

  /**
   * Send command into Terminal window
   * @param commandText command need to send to terminal
   * @param newLine append new line command also, default is true
   */
  protected terminalWrite(commandText: string, newLine: boolean = true) {
    this.terminalInitIfNeeded();
    this.terminalShown(true);
    if (Base._terminal) { Base._terminal.sendText(commandText, newLine); }
  }

  /**
   * Show Terminal window
   * @param isShown set to true if need display terminal, default is false
   */
  protected terminalShown(isShown: boolean = false) {
    this.terminalInitIfNeeded();
    if (isShown === Base._isTerminalShown) { return; }
    if (!Base._terminal) { return; }
    if (isShown) {
      Base._terminal.show(false);
    } else {
      Base._terminal.hide();
    }
    Base._isTerminalShown = isShown;
  }

  /**
   * Kill current running process on default terminal then reinit
   */
  public async terminalKillCurrentProcess() {
    let processId = await this.terminalGetProcessId();
    if (!processId) { return; }
    try { await Terminal.killProcessPromise(processId); } catch (e) { /* no such process */ }
    try { Base._terminal!.dispose(); } catch (e) { /* terminal window killed */ }
    Base._isTerminalShown = false;
    Base._terminal = undefined;
    this.toolbarStopShown(false);
  }

  /**
   * Get current terminal process
   */
  protected async terminalGetProcessId() {
    if (!Base._terminal) { return undefined; }
    try {
      return await Base._terminal.processId || undefined;
    } catch (e) { return undefined; }
  }

  /**
   * Toggle Output window
   * @param isShown true if need to show Output window
   */
  protected outputShown(isShown: boolean = false) {
    if (isShown) {
      if (Base._isOutputChannelShown) { return; }
      Base._outputChannel.show(false);
      Base._isOutputChannelShown = true;
      return;
    }
    if (!Base._isOutputChannelShown) { return; }
    Base._outputChannel.hide();
    Base._isOutputChannelShown = false;
  }

  /**
   * Toogle toolbar RUN
   * @param isShown set to true if need to show Run item
   */
  protected toolbarRunShown(isShown: boolean = false) {
    if (isShown === Base._isToolbarRunProjectShown) { return; }
    if (isShown) { Base._toolbarRunProject.show(); }
    else { Base._toolbarRunProject.hide(); }
    Base._isToolbarRunProjectShown = isShown;
  }

  /**
   * Toogle toolbar STOP
   * @param isShown set to true if need to show Stop item
   */
  protected toolbarStopShown(isShown: boolean = false) {
    if (isShown === Base._isToolbarStopProjectShown) { return; }
    if (isShown) { Base._toolbarStopProject.show(); }
    else { Base._toolbarStopProject.hide(); }
    Base._isToolbarStopProjectShown = isShown;
  }

  /**
   * Check if current document is in Micropython project
   * @param documentPath path of document included inside project need to check
   */
  protected isMicropythonProject(documentPath: vscode.Uri) {
    let projectPath = vscode.workspace.getWorkspaceFolder(documentPath);
    if (!projectPath) { return false; }
    return fs.existsSync(path.join(projectPath.uri.fsPath, Base.CONSTANTS.APP.CONFIG_FILE_NAME));
  }

  /**
   * Get current user Operation System
   * @returns name of platform, possibles:
   *          'darwin' => MacOS,
   *          'freebsd' => FreeBSD
   *          'linux' => Ubuntu or CentOS,...
   *          'sunos' => SunOS
   *          'win32' => Microsoft Windows
   */
  protected getUserPlatform() {
    return process.platform || '';
  }

  /**
   * Print log for debugging
   * @param message message need to print
   * @param optionalParams additional params
   */
  protected log(message?: any, ...optionalParams: any[]) {
    console.log(message, optionalParams);
  }

  /**
   * Send report to developer if user have any exception
   * @param exception error need to report
   */
  protected reportException(exception: Error) {
    // TODO: Send report...
  }

}
