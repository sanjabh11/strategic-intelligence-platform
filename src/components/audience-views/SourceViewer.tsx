// Source Viewer Modal Component
// Displays full source details and provenance for evidence verification

import React, { useEffect } from 'react';
import { X, ExternalLink, Calendar, Link, FileText, AlertCircle } from 'lucide-react';
import { SourceCitation } from '../../types/audience-views';

interface SourceViewerProps {
  source: SourceCitation;
  isOpen: boolean;
  onClose: () => void;
}

const SourceViewer: React.FC<SourceViewerProps> = ({
  source,
  isOpen,
  onClose
}) => {
  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-slate-800 rounded-xl border border-slate-700 max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
              <FileText className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-200">Source Details</h2>
              <p className="text-sm text-slate-400">Evidence verification and provenance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Title and URL */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-slate-200 mb-2">{source.title}</h3>
            {source.url && (
              <div className="flex items-center space-x-2 mb-4">
                <Link className="w-4 h-4 text-slate-500" />
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 hover:text-cyan-300 underline truncate"
                >
                  {source.url}
                </a>
                <ExternalLink className="w-4 h-4 text-slate-500" />
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center space-x-2 mb-2">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">Publication Date</span>
              </div>
              <p className="text-slate-200">
                {formatDate(source.date) || 'Not specified'}
              </p>
            </div>

            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-300">Relevance Score</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-slate-600 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(source.relevance_score || 0) * 100}%` }}
                  ></div>
                </div>
                <span className="text-sm font-mono text-cyan-400">
                  {Math.round((source.relevance_score || 0) * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Full Snippet/Content */}
          <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
            <h4 className="font-medium text-slate-200 mb-3">Source Content</h4>
            <div className="text-slate-300 leading-relaxed whitespace-pre-line">
              {source.snippet}
            </div>
          </div>

          {/* Provenance Information */}
          <div className="mt-6 bg-slate-700 rounded-lg p-4 border border-slate-600">
            <h4 className="font-medium text-slate-200 mb-3">Provenance Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400">Source ID:</span>
                <span className="text-slate-200 ml-2 font-mono">{source.id}</span>
              </div>
              <div>
                <span className="text-slate-400">Retrieved:</span>
                <span className="text-slate-200 ml-2">
                  {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex space-x-3">
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-white transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>View Original Source</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-slate-300 hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceViewer;