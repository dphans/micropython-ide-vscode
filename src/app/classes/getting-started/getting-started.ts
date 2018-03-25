'use strict';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Base from '../base';
import Terminal from '../helpers/terminal-helper';


export default class GettingStarted extends Base {

  public async showMainMenu() {
    let menuItems: vscode.QuickPickItem[] = [];
    menuItems.push({
      label: "New project...",
      description: "",
      detail: "Generate new project included supported files"
    });

    let selectedAction = await vscode.window.showQuickPick(menuItems);
    if (!selectedAction) { return; }

    switch (selectedAction.label) {
      case 'New project...':
        this.actionNewProject();
        break;
    }
  }

  async actionNewProject() {
    try {
      let selectedFolder = await vscode.window.showOpenDialog({
        openLabel: "Create...",
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false
      });
      if (!selectedFolder) { this.statusDone(); return; }
      if (!selectedFolder.length) { this.statusDone(); return; }
  
      let workingFolder = selectedFolder[0].fsPath;
      let configFile    = path.join(workingFolder, Base.CONSTANTS.APP.CONFIG_FILE_NAME);
  
      // check directory is empty or not, prompt user if needed
      if (fs.readdirSync(workingFolder).length) {
        if (await vscode.window.showInformationMessage("Directory is not empty, do you need to continue? " + workingFolder, { modal: false }, "No", "Continue") === "No") {
          this.statusDone();
          return;
        }
      }
  
      // check micropython config file is exist or not, it maybe existing project if available
      if (fs.existsSync(configFile)) {
        if (await vscode.window.showInformationMessage("Existing project detected, do you need to open this project?", { modal: false }, "No", "Open") === "Open") {
          vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(workingFolder));
        }
        this.statusDone();
        return;
      }

      // find connected ports
      var selectedPort: string = '';
      switch (this.getUserPlatform()) {
        case 'win32':
          selectedPort = await vscode.window.showInputBox({
            placeHolder: 'COM1',
            prompt: "Current, we are not support auto detect devices connected for Windows. You need to enter port manually."
          }) || '';
          break;
        default:
          selectedPort = '> Reload list';
          while (selectedPort === '> Reload list') {
            var serialPorts: string[] = [];
            try {
              fs.readdirSync('/dev/').forEach((portItem) => {
                if (portItem.startsWith('tty.') && portItem.length >= 15) {
                  serialPorts.push(portItem);
                }
              });
            } catch (exception) {
              serialPorts = [];
              this.reportException(exception);
            } finally {
              serialPorts.push('> Not in list above?');
              serialPorts.push('> Reload list');
            }
            selectedPort = await vscode.window.showQuickPick(serialPorts, {
              placeHolder: "Please select port of connected device"
            }) || '';
          }
          break;
      }

      if (!fs.existsSync(selectedPort)) {
        vscode.window.showErrorMessage("Port not exist, please connect device and try again!");
        this.statusDone();
        return;
      }

      let selectedBaudRate = parseInt(await vscode.window.showQuickPick([
        "300", "600", "1200", "2400", "4800", "9600", "14400", "19200", "28800", "38400", "57600", "115200", "128000", "256000"
      ], {
        placeHolder: "Please select default baud rate"
      }) || '115200') || 115200;

      // content of micropython config file
      let configFileObject = {
        upload: { port: selectedPort, baud: selectedBaudRate },
        serial: { port: selectedPort, baud: selectedBaudRate },
        ignore: { extensions: [Base.CONSTANTS.APP.CONFIG_FILE_NAME], directories: [".vscode"] }
      };

      fs.writeFileSync(path.join(workingFolder, "boot.py"), "# This is script that run when device boot up or wake from sleep.\n\n\n");
      fs.writeFileSync(path.join(workingFolder, "main.py"), "# This is your main script.\n\n\nprint(\"Hello, world!\")\n");
      fs.writeFileSync(configFile, JSON.stringify(configFileObject, null, 2));
      vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.parse(workingFolder));
    } catch (exception) {
      this.reportException(exception);
    } finally {
      this.statusDone();
    }
  }

}
