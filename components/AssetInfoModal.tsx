"use client";

import { useEffect, useState } from "react";
import type { Asset } from "@/lib/types";

interface OSMMetadata {
  version: number;
  changeset: number;
  user: string;
  uid: number;
  timestamp: string;
}

interface AssetInfoModalProps {
  asset: Asset | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function AssetInfoModal({
  asset,
  isOpen,
  onClose,
}: AssetInfoModalProps) {
  const [metadata, setMetadata] = useState<OSMMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !asset) {
      setMetadata(null);
      setError(null);
      return;
    }

    const fetchMetadata = async () => {
      setLoading(true);
      setError(null);

      try {
        const [type, id] = asset.id.split("/");
        const response = await fetch(
          `https://api.openstreetmap.org/api/0.6/${type}/${id}.json`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch metadata");
        }

        const data = await response.json();
        const element = data.elements?.[0];

        if (element) {
          setMetadata({
            version: element.version,
            changeset: element.changeset,
            user: element.user,
            uid: element.uid,
            timestamp: element.timestamp,
          });
        }
      } catch (err) {
        setError("Could not load metadata");
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [isOpen, asset]);

  if (!isOpen || !asset) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{asset.name}</h2>
          <button className="modal-close" onClick={onClose} title="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <section className="modal-section">
            <h3>Basic Information</h3>
            <div className="modal-info-grid">
              <span className="modal-info-label">Type</span>
              <span className="modal-info-value">{asset.type}</span>
              
              {asset.operator && (
                <>
                  <span className="modal-info-label">Operator</span>
                  <span className="modal-info-value">{asset.operator}</span>
                </>
              )}
              
              <span className="modal-info-label">Coordinates</span>
              <span className="modal-info-value">
                {asset.lat.toFixed(6)}, {asset.lon.toFixed(6)}
              </span>
              
              <span className="modal-info-label">OSM ID</span>
              <span className="modal-info-value">{asset.id}</span>
            </div>
          </section>

          {loading && (
            <section className="modal-section">
              <div className="modal-loading">
                <div className="modal-loading-spinner"></div>
                Loading metadata...
              </div>
            </section>
          )}

          {error && (
            <section className="modal-section">
              <div className="modal-error">{error}</div>
            </section>
          )}

          {metadata && (
            <section className="modal-section">
              <h3>Edit History</h3>
              <div className="modal-info-grid">
                <span className="modal-info-label">Last Edited</span>
                <span className="modal-info-value">
                  {formatDate(metadata.timestamp)}
                </span>
                
                <span className="modal-info-label">Edited By</span>
                <a
                  href={`https://www.openstreetmap.org/user/${encodeURIComponent(metadata.user)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-info-link"
                >
                  {metadata.user}
                </a>
                
                <span className="modal-info-label">Changeset</span>
                <a
                  href={`https://www.openstreetmap.org/changeset/${metadata.changeset}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="modal-info-link"
                >
                  #{metadata.changeset}
                </a>
                
                <span className="modal-info-label">Version</span>
                <span className="modal-info-value">v{metadata.version}</span>
              </div>
            </section>
          )}

          <section className="modal-section">
            <h3>All Tags ({Object.keys(asset.tags).length})</h3>
            <table className="modal-tags-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(asset.tags)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, value]) => (
                    <tr key={key}>
                      <td className="modal-tag-key">{key}</td>
                      <td className="modal-tag-value">{value}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>

          <section className="modal-section">
            <h3>External Links</h3>
            <div className="modal-links">
              <a
                href={`https://www.openstreetmap.org/${asset.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-link modal-link-primary"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on OpenStreetMap
              </a>
              <a
                href={`https://www.openstreetmap.org/${asset.id}/history`}
                target="_blank"
                rel="noopener noreferrer"
                className="modal-link"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                View Edit History
              </a>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
