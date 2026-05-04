"use client";

import { useState, useRef, useEffect } from "react";

interface ExportMenuProps {
  groundId: string;
  groundName: string;
  onExportToMarket: (title: string, description: string) => void;
  onCopyJson: (json: string) => void;
  getGroundJson: () => string;
}

export default function ExportMenu({
  groundId,
  groundName,
  onExportToMarket,
  onCopyJson,
  getGroundJson,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showMarketForm, setShowMarketForm] = useState(false);
  const [title, setTitle] = useState(groundName);
  const [description, setDescription] = useState("");
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowMarketForm(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCopyJson = () => {
    const json = getGroundJson();
    onCopyJson(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setIsOpen(false);
  };

  const handleExportToMarket = () => {
    setShowMarketForm(true);
  };

  const handleSubmitToMarket = () => {
    if (!title.trim()) return;
    onExportToMarket(title, description);
    setShowMarketForm(false);
    setIsOpen(false);
    setTitle(groundName);
    setDescription("");
  };

  return (
    <div className="export-menu-container" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="btn btn-secondary"
        style={{ display: "flex", alignItems: "center", gap: "6px" }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7,10 12,15 17,10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Export
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>

      {isOpen && (
        <div className="export-dropdown">
          {showMarketForm ? (
            <div className="export-form">
              <div className="export-form-title">导出到市场</div>
              <input
                type="text"
                placeholder="标题"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="export-input"
              />
              <textarea
                placeholder="描述（可选）"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="export-textarea"
                rows={3}
              />
              <div className="export-form-actions">
                <button
                  onClick={() => setShowMarketForm(false)}
                  className="btn btn-secondary"
                >
                  返回
                </button>
                <button
                  onClick={handleSubmitToMarket}
                  className="btn btn-primary"
                  disabled={!title.trim()}
                >
                  提交
                </button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={handleExportToMarket} className="export-option">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                导出到市场
              </button>
              <button onClick={handleCopyJson} className="export-option">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? "已复制！" : "复制 JSON"}
              </button>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        .export-menu-container {
          position: relative;
          display: inline-block;
        }

        .export-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          min-width: 200px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.12);
          overflow: hidden;
          z-index: 1000;
        }

        .export-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 12px 16px;
          border: none;
          background: none;
          font-size: 14px;
          color: #475569;
          cursor: pointer;
          transition: background 0.2s;
          text-align: left;
        }

        .export-option:hover {
          background: #f8fafc;
          color: #1e293b;
        }

        .export-option svg {
          flex-shrink: 0;
        }

        .export-form {
          padding: 16px;
        }

        .export-form-title {
          font-size: 14px;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 12px;
        }

        .export-input,
        .export-textarea {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          color: #1e293b;
          background: #f8fafc;
          margin-bottom: 10px;
          resize: none;
        }

        .export-input:focus,
        .export-textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .export-input::placeholder,
        .export-textarea::placeholder {
          color: #94a3b8;
        }

        .export-form-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
          margin-top: 12px;
        }
      `}</style>
    </div>
  );
}
