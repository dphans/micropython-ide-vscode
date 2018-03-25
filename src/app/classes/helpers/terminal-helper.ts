'use strict';
import Base from '../base';
import * as child_process from 'child_process';
import { window } from 'vscode';


export default new class TerminalHelper extends Base {

  public execPromise(command: string) {
    return new Promise((resolve, reject) => {
      child_process.exec(command, (error, stdout, stderr) => {
        if (error) {
          return reject(error);
        }
        return resolve(stdout);
      });
    });
  }

  public checkExecutableToolPromise(executeCommandName: string, installScript: string) {
    return new Promise(async (resolve, reject) => {
      try {
        let toolPath = await this.getExecutableToolPathPromise(executeCommandName);
        if ((toolPath || '') as string === "") { throw new Error("Build tool is not available"); }
        resolve(true);
      } catch (commandNotFoundException) {
        if (await window.showInformationMessage(
          "`" + executeCommandName + "` command not found in your executable environment. Do you want to install `" + executeCommandName + "` tool?",
          { modal: false },
          "No",
          "Install"
        ) === "Install") {
          try {
            this.statusText("Installing `" + executeCommandName + "`...");
            await this.execPromise(installScript);
          } catch (installAmpyException) {
            window.showErrorMessage("Error while installing `" + executeCommandName + "`, please recheck your internet connection and try again!");
          } finally {
            this.statusDone();
            try {
              let isAvailable = await this.getExecutableToolPathPromise(executeCommandName) !== '';
              if (isAvailable) {
                window.showInformationMessage("`" + executeCommandName + "` has been installed successfully!");
              }
              resolve(isAvailable);
            } catch (e) {
              resolve(false);
            }
          }
        } else {
          resolve(false);
        }
      }
    });
  }

  public getExecutableToolPathPromise(executeCommandName: string) {
    return new Promise(async (resolve, reject) => {
      try {
        let toolPath = await this.execPromise("which " + executeCommandName);
        if (typeof toolPath !== "string") { toolPath = ''; }
        resolve((toolPath as string).trim());
      } catch (toolPathNotFound) {
        reject(toolPathNotFound);
      }
    });
  }

};
