// Displays only Templates loading/error body states. It deliberately receives
// state values as arguments and returns whether it handled the body; fetching,
// state transitions, rerender scheduling, and Alt+C focus timing remain in
// entry.js. Keep this module free of listeners and side effects.
export function createTemplateBodyStateRenderer({ document, translate }) {
  const renderTemplateBodyState = ({ body, loading, error }) => {
    if (loading) {
      const notice = document.createElement("div");
      notice.className = "workspace2-empty";
      notice.textContent = translate("status.loading");
      body.append(notice);
      return true;
    }
    if (error) {
      const notice = document.createElement("div");
      notice.className = "workspace2-empty";
      notice.textContent = translate("status.error", { message: error });
      body.append(notice);
      return true;
    }
    return false;
  };

  return { renderTemplateBodyState };
}
