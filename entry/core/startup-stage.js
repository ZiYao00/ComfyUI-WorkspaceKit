// Keeps optional WorkspaceKit startup work isolated.  Sidebar registration is
// intentionally outside this runner, so a failing later stage cannot make the
// primary WorkspaceKit entry disappear.
export function createWorkspaceStartupStageRunner({ startup, onFailure = () => {} } = {}) {
  if (!startup || !Array.isArray(startup.failures)) {
    throw new TypeError("WorkspaceKit startup state requires a failures array.");
  }

  return async function runWorkspaceStartupStage(stage, task) {
    startup.lastStartedStage = stage;
    try {
      const result = await task();
      startup.lastCompletedStage = stage;
      return result;
    } catch (error) {
      startup.failures.push({
        stage,
        error: error instanceof Error ? error.name : "Error",
      });
      onFailure(stage, error);
      return undefined;
    }
  };
}
