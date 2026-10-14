import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, X } from "lucide-react";
import { getAttachment, getAttachmentPreviewUrl } from "../attachmentStore.js";

function formatSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileAttachment({ attachment, compact = false, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState("");
  const isImage = attachment.mimeType.startsWith("image/");

  useEffect(() => {
    if (!isImage) return undefined;
    let cancelled = false;
    getAttachment(attachment.id)
      .then((record) => {
        if (cancelled) return;
        if (!record?.file) throw new Error(`Attachment data is missing for ${attachment.name}.`);
        setPreviewUrl(getAttachmentPreviewUrl(attachment.id, record.file));
      })
      .catch((error) => {
        console.error("Could not load attachment preview:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [attachment.id, attachment.mimeType, attachment.name, isImage]);

  return (
    <div className={`file-attachment ${compact ? "file-attachment-compact" : ""} ${isImage ? "file-attachment-image" : ""}`}>
      {isImage && previewUrl ? (
        <img src={previewUrl} alt={attachment.name} className="file-attachment-thumbnail" />
      ) : (
        <span className="file-attachment-icon">
          {isImage ? <ImageIcon size={17} /> : <FileText size={17} />}
        </span>
      )}
      <span className="file-attachment-details">
        <strong title={attachment.name}>{attachment.name}</strong>
        <small>{formatSize(attachment.size)}</small>
      </span>
      {onRemove && (
        <button className="file-attachment-remove" type="button" onClick={onRemove} aria-label={`Remove ${attachment.name}`}>
          <X size={14} />
        </button>
      )}
    </div>
  );
}
