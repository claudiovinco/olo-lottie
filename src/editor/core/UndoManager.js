class UndoManager {
  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
    this.undoStack = [];
    this.redoStack = [];
  }

  pushState(snapshot) {
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  undo() {
    if (!this.canUndo()) return null;
    const snapshot = this.undoStack.pop();
    this.redoStack.push(snapshot);
    return this.undoStack[this.undoStack.length - 1] ?? null;
  }

  redo() {
    if (!this.canRedo()) return null;
    const snapshot = this.redoStack.pop();
    this.undoStack.push(snapshot);
    return snapshot;
  }

  canUndo() {
    return this.undoStack.length > 1;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }
}

export default UndoManager;
