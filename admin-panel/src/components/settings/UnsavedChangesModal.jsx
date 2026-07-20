import Icon from "../Icon";

const UnsavedChangesModal = ({ onDiscard, onKeepEditing, open }) => {
  if (!open) return null;
  return (
    <div className="modal-backdrop settings-modal-backdrop" onMouseDown={onKeepEditing}>
      <section aria-labelledby="unsaved-title" aria-modal="true" className="settings-confirm-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <span className="settings-modal-icon warning"><Icon name="alert" size={23} /></span>
        <h2 id="unsaved-title">Leave with unsaved changes?</h2>
        <p>Your changes have not been saved and will be lost if you leave this page.</p>
        <div className="settings-modal-actions">
          <button className="button button-secondary" onClick={onKeepEditing} type="button">Keep editing</button>
          <button className="button button-danger" onClick={onDiscard} type="button">Discard and leave</button>
        </div>
      </section>
    </div>
  );
};

export default UnsavedChangesModal;
