import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Paperclip,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleStop,
  Command,
  LoaderCircle,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  PanelLeftClose,
  Plus,
  Settings2,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import MessageContent, { CopyButton } from "./components/MessageContent.jsx";
import FileAttachment from "./components/FileAttachment.jsx";
import {
  getAttachment,
  releaseAttachmentPreviews,
  removeAttachments,
  saveAttachment,
} from "./attachmentStore.js";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || ""
).replace(/\/$/, "");

const STORAGE_KEY = "clarity-chat-conversations-v1";
const THEME_KEY = "clarity-chat-theme";
const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const SUPPORTED_FILES = {
  jpg: { mimeType: "image/jpeg", maxBytes: 8 * 1024 * 1024 },
  jpeg: { mimeType: "image/jpeg", maxBytes: 8 * 1024 * 1024 },
  png: { mimeType: "image/png", maxBytes: 8 * 1024 * 1024 },
  webp: { mimeType: "image/webp", maxBytes: 8 * 1024 * 1024 },
  pdf: { mimeType: "application/pdf", maxBytes: 10 * 1024 * 1024 },
  docx: { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", maxBytes: 5 * 1024 * 1024 },
  txt: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  csv: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  json: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  md: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  yaml: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  yml: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  xml: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  html: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  css: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  js: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  jsx: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  ts: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  tsx: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  py: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  java: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  c: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  cpp: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  h: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  cs: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  go: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  rs: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  sh: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  sql: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  toml: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
  log: { mimeType: "text/plain", maxBytes: 1024 * 1024 },
};
const ACCEPTED_FILES = Object.keys(SUPPORTED_FILES).map((extension) => `.${extension}`).join(",");
const SUGGESTIONS = [
  { title: "Learn something new", prompt: "Explain a complex idea in simple terms, with an example." },
  { title: "Write some code", prompt: "Help me write a clean, well-documented function for " },
  { title: "Get organized", prompt: "Help me turn a big goal into a simple, practical plan." },
  { title: "Explore an idea", prompt: "What are some interesting perspectives on " },
];

function readConversations() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        Array.isArray(item.messages),
    );
  } catch (error) {
    console.error("Could not read saved conversations:", error);
    return [];
  }
}

function newConversation() {
  return {
    id: crypto.randomUUID(),
    title: "New conversation",
    messages: [],
    updatedAt: Date.now(),
  };
}

function makeTitle(text) {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.length > 34 ? `${normalized.slice(0, 34)}…` : normalized;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function attachmentBytes(attachments) {
  return attachments.reduce((total, attachment) => total + attachment.size, 0);
}

async function encodeAttachment(attachment) {
  const record = await getAttachment(attachment.id);
  if (!record?.file) {
    throw new Error(`"${attachment.name}" is no longer available in browser storage. Remove it from this message and attach it again.`);
  }
  const bytes = new Uint8Array(await record.file.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return { ...attachment, data: btoa(binary) };
}

export default function App() {
  const [conversations, setConversations] = useState(readConversations);
  const [activeId, setActiveId] = useState(() => readConversations()[0]?.id ?? null);
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingRetry, setPendingRetry] = useState(null);
  const [apiStatus, setApiStatus] = useState({ state: "checking", model: "Gemini" });
  const [menuId, setMenuId] = useState(null);
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [mobileInputExpanded, setMobileInputExpanded] = useState(false);
  const abortController = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const activeConversation = conversations.find((item) => item.id === activeId);
  const activeConversationRef = useRef(activeConversation);
  activeConversationRef.current = activeConversation;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        abortController.current?.abort();
        setLoading(false);
        setPendingRetry(null);
        setError("");
        discardPendingAttachments();
        releaseAttachmentPreviews(activeConversationRef.current?.messages.flatMap((message) =>
          (message.attachments ?? []).map((attachment) => attachment.id),
        ) ?? []);
        const conversation = newConversation();
        setConversations((current) => [conversation, ...current]);
        setActiveId(conversation.id);
        setInput("");
        setSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [pendingAttachments]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Backend is unavailable.");
        setApiStatus({
          state: data.configured ? "connected" : "missing-key",
          model: data.model || "Gemini",
        });
      })
      .catch((fetchError) => {
        if (fetchError.name !== "AbortError") {
          setApiStatus({ state: "offline", model: "Gemini" });
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!activeConversation || loading) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [activeConversation?.messages.length, loading]);

  useEffect(() => {
    const element = messageListRef.current;
    if (!element) return undefined;
    const update = () => {
      setShowScrollButton(element.scrollHeight - element.scrollTop - element.clientHeight > 180);
    };
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => element.removeEventListener("scroll", update);
  }, [activeId]);

  function updateConversation(id, update) {
    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === id
          ? { ...conversation, ...update(conversation), updatedAt: Date.now() }
          : conversation,
      ),
    );
  }

  function startNewChat() {
    releaseAttachmentPreviews(activeConversation?.messages.flatMap((message) =>
      (message.attachments ?? []).map((attachment) => attachment.id),
    ) ?? []);
    abortController.current?.abort();
    setLoading(false);
    setPendingRetry(null);
    setError("");
    const conversation = newConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setInput("");
    discardPendingAttachments();
    setSidebarOpen(false);
    textareaRef.current?.focus();
  }

  function selectConversation(id) {
    releaseAttachmentPreviews(activeConversation?.messages.flatMap((message) =>
      (message.attachments ?? []).map((attachment) => attachment.id),
    ) ?? []);
    if (loading && id !== activeId) abortController.current?.abort();
    setLoading(false);
    setPendingRetry(null);
    setError("");
    setActiveId(id);
    discardPendingAttachments();
    setSidebarOpen(false);
  }

  function deleteConversation(id) {
    const deletedConversation = conversations.find((conversation) => conversation.id === id);
    const attachmentIds = deletedConversation?.messages.flatMap((message) =>
      (message.attachments ?? []).map((attachment) => attachment.id),
    ) ?? [];
    void removeAttachments(attachmentIds).catch((storageError) => {
      console.error("Could not delete stored chat attachments:", storageError);
      setError("The conversation was deleted, but its local files could not be removed from browser storage.");
    });
    const remaining = conversations.filter((conversation) => conversation.id !== id);
    setConversations(remaining);
    if (activeId === id) {
      discardPendingAttachments();
      if (loading) {
        abortController.current?.abort();
        abortController.current = null;
        setLoading(false);
      }
      setActiveId(remaining[0]?.id ?? null);
      setError("");
      setPendingRetry(null);
    }
    setMenuId(null);
  }

  function beginRename(conversation) {
    setRenameId(conversation.id);
    setRenameValue(conversation.title);
    setMenuId(null);
  }

  function saveRename(id) {
    const title = renameValue.trim();
    if (title) updateConversation(id, () => ({ title }));
    setRenameId(null);
  }

  function discardPendingAttachments() {
    const ids = pendingAttachments.map((attachment) => attachment.id);
    setPendingAttachments([]);
    void removeAttachments(ids).catch((storageError) => {
      console.error("Could not remove unsent attachments:", storageError);
      setError("An unsent file could not be removed from browser storage.");
    });
  }

  function removePendingAttachment(id) {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== id));
    void removeAttachments([id]).catch((storageError) => {
      console.error("Could not remove selected attachment:", storageError);
      setError("The file was removed from this message, but could not be removed from browser storage.");
    });
  }

  async function handleFilesSelected(event) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (files.length + pendingAttachments.length > MAX_ATTACHMENTS) {
      setError(`Attach up to ${MAX_ATTACHMENTS} files to one message.`);
      return;
    }
    const newAttachments = [];
    let totalBytes = attachmentBytes(pendingAttachments);
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
      const supported = SUPPORTED_FILES[extension];
      if (!supported) {
        setError(`"${file.name}" is not a supported file type.`);
        return;
      }
      if (file.size === 0 || file.size > supported.maxBytes) {
        setError(`"${file.name}" is empty or exceeds its ${Math.round(supported.maxBytes / (1024 * 1024))} MB size limit.`);
        return;
      }
      totalBytes += file.size;
      if (totalBytes > MAX_ATTACHMENT_BYTES) {
        setError("Attachments must total 12 MB or less.");
        return;
      }
      newAttachments.push({
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: supported.mimeType,
        size: file.size,
        file,
      });
    }

    const savedIds = [];
    try {
      for (const attachment of newAttachments) {
        await saveAttachment(attachment.id, attachment.file);
        savedIds.push(attachment.id);
      }
      setPendingAttachments((current) => [
        ...current,
        ...newAttachments.map(({ file, ...metadata }) => metadata),
      ]);
      setError("");
    } catch (storageError) {
      let cleanupFailed = false;
      try {
        await removeAttachments(savedIds);
      } catch (cleanupError) {
        cleanupFailed = true;
        console.error("Could not clean up a partially saved attachment:", cleanupError);
      }
      console.error("Could not save selected attachments:", storageError);
      setError(
        cleanupFailed
          ? "The selected file could not be saved, and some temporary file data may remain in browser storage."
          : "The selected file could not be saved in browser storage. Check available storage and try again.",
      );
    }
  }

  async function requestAnswer(conversationId, prompt, priorMessages, newAttachments = []) {
    const controller = new AbortController();
    abortController.current = controller;
    setLoading(true);
    setError("");
    setPendingRetry(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: await Promise.all(
            [
              ...priorMessages,
              { role: "user", content: prompt, attachments: newAttachments },
            ].map(async ({ role, content, attachments = [] }) => ({
              role,
              content,
              attachments: await Promise.all(attachments.map(encodeAttachment)),
            })),
          ),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const requestError = new Error(data.error || "The assistant couldn't respond.");
        requestError.status = response.status;
        requestError.code = data.code;
        throw requestError;
      }
      if (typeof data.answer !== "string" || !data.answer.trim()) {
        throw new Error("The assistant returned an empty response. Please try again.");
      }
      updateConversation(conversationId, (conversation) => ({
        messages: [...conversation.messages, { role: "assistant", content: data.answer }],
      }));
      setApiStatus((current) => ({
        ...current,
        state: "connected",
        model: data.model || current.model,
      }));
    } catch (requestError) {
      if (requestError.name === "AbortError") return;
      setError(requestError.message || "Something went wrong. Please try again.");
      setPendingRetry({ conversationId, prompt, priorMessages, attachments: newAttachments });
      if (requestError.code === "missing_api_key") {
        setApiStatus((current) => ({ ...current, state: "missing-key" }));
      } else if (requestError.status === 429) {
        setApiStatus((current) => ({ ...current, state: "rate-limited" }));
      } else if (requestError.code === "provider_busy") {
        setApiStatus((current) => ({ ...current, state: "provider-busy" }));
      } else if (!requestError.status) {
        setApiStatus((current) => ({ ...current, state: "offline" }));
      }
    } finally {
      if (abortController.current === controller) {
        abortController.current = null;
        setLoading(false);
      }
    }
  }

  function sendMessage(text = input) {
    const typedPrompt = text.trim();
    const attachments = pendingAttachments;
    const prompt = typedPrompt || (attachments.length ? "Please review the attached files." : "");
    if ((!prompt && !attachments.length) || loading || prompt.length > 6000) {
      if (prompt.length > 6000) setError("Messages must be 6,000 characters or fewer.");
      return;
    }
    let conversation = activeConversation;
    if (!conversation) {
      conversation = newConversation();
      setConversations((current) => [conversation, ...current]);
      setActiveId(conversation.id);
    }
    const priorMessages = conversation.messages.slice(-20);
    while (priorMessages.reduce((total, message) => total + message.content.length, 0) > 18000) {
      priorMessages.shift();
    }
    while (
      priorMessages.length &&
      attachmentBytes(priorMessages.flatMap((message) => message.attachments ?? [])) + attachmentBytes(attachments) >
        MAX_ATTACHMENT_BYTES
    ) {
      priorMessages.shift();
    }
    updateConversation(conversation.id, (current) => ({
      title: current.messages.length === 0
        ? makeTitle(typedPrompt || attachments[0]?.name || prompt)
        : current.title,
      messages: [...current.messages, { role: "user", content: prompt, attachments }],
    }));
    setInput("");
    setPendingAttachments([]);
    setError("");
    setMobileInputExpanded(false);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    void requestAnswer(conversation.id, prompt, priorMessages, attachments);
  }

  function retry() {
    if (pendingRetry && !loading) {
      void requestAnswer(
        pendingRetry.conversationId,
        pendingRetry.prompt,
        pendingRetry.priorMessages,
        pendingRetry.attachments,
      );
    }
  }

  function stopGeneration() {
    abortController.current?.abort();
    abortController.current = null;
    setLoading(false);
    setPendingRetry(null);
    setError("Generation stopped.");
  }

  function onInputKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function onInputChange(event) {
    setInput(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 180)}px`;
  }

  const sortedConversations = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  const statusLabel = {
    checking: "Checking connection…",
    connected: "Connected",
    "missing-key": "API key needed",
    offline: "Backend unavailable",
    "rate-limited": "Rate limited",
    "provider-busy": "Gemini busy",
  }[apiStatus.state];

  return (
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}>
      {sidebarOpen && <button className="mobile-backdrop" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-mobile-open" : ""}`}>
        <div className="sidebar-top">
          <button className="brand" onClick={startNewChat} aria-label="Shadow AI home">
            <span className="brand-mark"><Command size={18} strokeWidth={2.1} /></span>
            <span className="brand-name">shadow ai<span className="brand-period">.</span></span>
          </button>
          <button className="icon-button sidebar-collapse" onClick={() => setSidebarCollapsed(true)} aria-label="Collapse sidebar" title="Collapse sidebar">
            <PanelLeftClose size={17} />
          </button>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
            <X size={19} />
          </button>
        </div>

        <button className="new-chat-button" onClick={startNewChat}>
          <Plus size={17} />
          <span>New conversation</span>
          <span className="new-chat-shortcut">⌘ K</span>
        </button>

        <div className="history-section">
          <div className="section-label">RECENT</div>
          {sortedConversations.length ? (
            <div className="conversation-list">
              {sortedConversations.map((conversation) => (
                <div
                  className={`conversation-row ${conversation.id === activeId ? "conversation-active" : ""}`}
                  key={conversation.id}
                >
                  {renameId === conversation.id ? (
                    <form
                      className="rename-form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveRename(conversation.id);
                      }}
                    >
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onBlur={() => saveRename(conversation.id)}
                        onKeyDown={(event) => event.key === "Escape" && setRenameId(null)}
                        aria-label="Conversation name"
                      />
                    </form>
                  ) : (
                    <>
                      <button className="conversation-select" onClick={() => selectConversation(conversation.id)}>
                        <MessageCircle size={15} />
                        <span className="conversation-title">{conversation.title}</span>
                        <span className="conversation-date">{formatDate(conversation.updatedAt)}</span>
                      </button>
                      <button className="conversation-menu-trigger" onClick={() => setMenuId(menuId === conversation.id ? null : conversation.id)} aria-label={`Options for ${conversation.title}`}>
                        <MoreHorizontal size={16} />
                      </button>
                      {menuId === conversation.id && (
                        <>
                          <button className="menu-dismiss" onClick={() => setMenuId(null)} aria-label="Close menu" />
                          <div className="conversation-menu">
                            <button onClick={() => beginRename(conversation)}><span>Rename</span></button>
                            <button className="menu-delete" onClick={() => deleteConversation(conversation.id)}><Trash2 size={14} /><span>Delete</span></button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-history">Your conversations will show up here.</p>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-model">
            <span className={`status-dot status-${apiStatus.state}`} />
            <span>{apiStatus.state === "connected" ? apiStatus.model : statusLabel}</span>
          </div>
          <button className="settings-button" onClick={() => setSettingsOpen(true)}>
            <Settings2 size={16} />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="topbar-left">
            {sidebarCollapsed ? (
              <button className="icon-button" onClick={() => setSidebarCollapsed(false)} aria-label="Expand sidebar"><PanelLeftClose size={17} /></button>
            ) : null}
            <button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar"><Menu size={19} /></button>
            <div className="model-indicator">
              <span>{apiStatus.model}</span>
              <ChevronDown size={14} />
            </div>
          </div>
          <div className="topbar-actions">
            <div className="connection-indicator" title={statusLabel}>
              <span className={`status-dot status-${apiStatus.state}`} />
              <span className="connection-label">{statusLabel}</span>
            </div>
            <button
              className="icon-button theme-toggle"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </header>

        {activeConversation?.messages.length ? (
          <div className="chat-scroll-area" ref={messageListRef}>
            <div className="messages-container">
              {activeConversation.messages.map((message, index) => (
                <article className={`message-row message-${message.role}`} key={`${activeConversation.id}-${index}`}>
                  {message.role === "assistant" ? (
                    <div className="assistant-avatar"><Command size={15} /></div>
                  ) : null}
                  <div className="message-body">
                    {message.role === "user" ? (
                      <div className="user-message-content">
                        {message.attachments?.length > 0 && (
                          <div className="message-attachments">
                            {message.attachments.map((attachment) => (
                              <FileAttachment key={attachment.id} attachment={attachment} />
                            ))}
                          </div>
                        )}
                        <div>{message.content}</div>
                      </div>
                    ) : (
                      <MessageContent content={message.content} />
                    )}
                    {message.role === "assistant" && (
                      <div className="message-actions"><CopyButton value={message.content} label="Copy" /></div>
                    )}
                  </div>
                </article>
              ))}
              {loading && (
                <article className="message-row message-assistant">
                  <div className="assistant-avatar"><Command size={15} /></div>
                  <div className="message-body typing-body">
                    <div className="typing-indicator" aria-label="Assistant is thinking"><span /><span /><span /></div>
                    <span className="thinking-label">Thinking</span>
                  </div>
                </article>
              )}
              {error && (
                <div className="error-card" role="alert">
                  <div className="error-text"><strong>Couldn't get a response</strong><span>{error}</span></div>
                  {pendingRetry && <button className="retry-button" onClick={retry}><ArrowDown size={14} /> Try again</button>}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            {showScrollButton && (
              <button className="scroll-bottom-button" onClick={() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })} aria-label="Scroll to latest message">
                <ArrowDown size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="welcome-screen">
            <div className="welcome-mark"><Command size={21} /></div>
            <div className="welcome-eyebrow">A LITTLE CLARITY GOES A LONG WAY</div>
            <h1>What’s on your mind?</h1>
            <p className="welcome-subtitle">Ask a question, explore an idea, or figure out what comes next.</p>
            <div className="suggestion-grid">
              {SUGGESTIONS.map((suggestion, index) => (
                <button
                  className="suggestion-card"
                  key={suggestion.title}
                  onClick={() => {
                    setInput(suggestion.prompt);
                    textareaRef.current?.focus();
                  }}
                >
                  <span className={`suggestion-icon suggestion-icon-${index}`}><ChevronRight size={17} /></span>
                  <span><strong>{suggestion.title}</strong><small>{suggestion.prompt}</small></span>
                  <ArrowUp size={15} className="suggestion-arrow" />
                </button>
              ))}
            </div>
            {apiStatus.state === "missing-key" && (
              <button className="setup-notice" onClick={() => setSettingsOpen(true)}>
                <span className="status-dot status-missing-key" />
                Add a Gemini API key in the server .env file to start chatting.
                <ChevronRight size={15} />
              </button>
            )}
            {apiStatus.state === "offline" && (
              <p className="offline-notice">The chat server is offline. Start the backend to begin.</p>
            )}
          </div>
        )}

        <div className={`composer-area ${mobileInputExpanded ? "composer-expanded" : ""}`}>
          {error && !activeConversation?.messages.length && (
            <div className="error-card welcome-error" role="alert">
              <div className="error-text"><strong>Couldn't get a response</strong><span>{error}</span></div>
              {pendingRetry && <button className="retry-button" onClick={retry}><ArrowDown size={14} /> Try again</button>}
            </div>
          )}
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
            {pendingAttachments.length > 0 && (
              <div className="composer-attachments">
                {pendingAttachments.map((attachment) => (
                  <FileAttachment
                    key={attachment.id}
                    attachment={attachment}
                    compact
                    onRemove={() => removePendingAttachment(attachment.id)}
                  />
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={onInputChange}
              onKeyDown={onInputKeyDown}
              onFocus={() => setMobileInputExpanded(true)}
              onBlur={() => setMobileInputExpanded(false)}
              placeholder="Message Shadow AI…"
              rows={1}
              maxLength={6000}
              aria-label="Message"
            />
            <div className="composer-bottom">
              <div className="composer-tools">
                <button
                  className="attach-button"
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || pendingAttachments.length >= MAX_ATTACHMENTS}
                  aria-label="Attach images, PDFs, Word documents, or text and code files"
                  title="Attach files"
                >
                  <Paperclip size={15} />
                  <span>Attach</span>
                </button>
                <input
                  ref={fileInputRef}
                  className="file-input-hidden"
                  type="file"
                  accept={ACCEPTED_FILES}
                  multiple
                  onChange={handleFilesSelected}
                  aria-label="Choose files to attach"
                />
                <div className="composer-hint">
                <span><kbd>Enter</kbd> to send</span>
                <span className="hint-divider">·</span>
                <span><kbd>Shift + Enter</kbd> for a new line</span>
                </div>
              </div>
              <div className="composer-controls">
                {input.length > 0 && <span className="character-count">{input.length.toLocaleString()} / 6,000</span>}
                {loading ? (
                  <button className="send-button stop-button" type="button" onClick={stopGeneration} aria-label="Stop generation" title="Stop generation"><CircleStop size={17} /></button>
                ) : (
                  <button className="send-button" type="submit" disabled={!input.trim() && !pendingAttachments.length} aria-label="Send message"><ArrowUp size={17} /></button>
                )}
              </div>
            </div>
          </form>
          <div className="composer-disclaimer">Shadow AI can make mistakes. Check important information.</div>
        </div>
      </main>

      {settingsOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSettingsOpen(false)}>
          <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <div className="modal-header">
              <div><div className="modal-eyebrow">PREFERENCES</div><h2 id="settings-title">Settings</h2></div>
              <button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={19} /></button>
            </div>
            <div className="settings-section">
              <div className="settings-heading"><div><strong>AI model</strong><small>Model used to generate responses</small></div></div>
              <div className="settings-value"><span className="model-mini-icon"><Command size={14} /></span><span>{apiStatus.model}</span><span className="settings-value-note">Selected on server</span></div>
            </div>
            <div className="settings-section">
              <div className="settings-heading"><div><strong>API connection</strong><small>Your API key stays private on the backend</small></div></div>
              <div className="connection-status-card">
                <span className={`status-dot status-${apiStatus.state}`} />
                <div><strong>{statusLabel}</strong><small>{apiStatus.state === "connected" ? "The server has an API key configured." : apiStatus.state === "missing-key" ? "Set GEMINI_API_KEY in server/.env and restart the backend." : apiStatus.state === "offline" ? "Start the backend with npm run dev from the server folder." : "Checking the local chat server."}</small></div>
                {apiStatus.state === "connected" && <Check className="connection-check" size={16} />}
              </div>
            </div>
            <div className="settings-section">
              <div className="settings-heading"><div><strong>Appearance</strong><small>Choose the look that feels right</small></div></div>
              <div className="theme-options">
                <button className={`theme-option ${theme === "light" ? "theme-option-active" : ""}`} onClick={() => setTheme("light")}><Sun size={17} /><span>Light</span></button>
                <button className={`theme-option ${theme === "dark" ? "theme-option-active" : ""}`} onClick={() => setTheme("dark")}><Moon size={17} /><span>Dark</span></button>
              </div>
            </div>
            <div className="settings-footer"><span>Conversations are saved only in this browser.</span></div>
          </section>
        </div>
      )}
    </div>
  );
}
