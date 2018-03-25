'use strict';
import * as vscode from 'vscode';
import Base from './classes/base';
import GettingStarted from './classes/getting-started/getting-started';


export default new class App extends Base {

  public registerExtensionContext(context: vscode.ExtensionContext) {
    let gettingStartedInstance: GettingStarted = new GettingStarted();
    context.subscriptions.push(vscode.commands.registerCommand(Base.CONSTANTS.COMMANDS.GET_STARTED, () => {
      gettingStartedInstance.showMainMenu();
    }));
    this.statusDone();
  }

  public onDestroyed() {
    super.onDestroyed();
  }

};
