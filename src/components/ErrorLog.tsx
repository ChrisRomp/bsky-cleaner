import { useState } from 'react';

export interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: 'error' | 'warning' | 'info';
}

interface ErrorLogProps {
  entries: LogEntry[];
  onClear: () => void;
}

export function ErrorLog({ entries, onClear }: ErrorLogProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  if (entries.length === 0) return null;
  
  const errorCount = entries.filter(e => e.type === 'error').length;
  const warningCount = entries.filter(e => e.type === 'warning').length;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white border-t border-gray-700 z-50">
      <div 
        className="flex items-center justify-between px-4 py-2 bg-gray-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 text-sm">
          <span className="font-mono">📋 Activity Log</span>
          {errorCount > 0 && (
            <span className="bg-red-600 px-2 py-0.5 rounded text-xs">
              {errorCount} error{errorCount !== 1 ? 's' : ''}
            </span>
          )}
          {warningCount > 0 && (
            <span className="bg-yellow-600 px-2 py-0.5 rounded text-xs">
              {warningCount} warning{warningCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="text-xs text-gray-400 hover:text-white"
          >
            Clear
          </button>
          <span className="text-gray-400">{isExpanded ? '▼' : '▲'}</span>
        </div>
      </div>
      
      {isExpanded && (
        <div className="max-h-48 overflow-y-auto p-2 font-mono text-xs">
          {entries.map((entry) => (
            <div 
              key={entry.id} 
              className={`py-1 px-2 border-l-2 mb-1 ${
                entry.type === 'error' 
                  ? 'border-red-500 bg-red-900/30' 
                  : entry.type === 'warning'
                  ? 'border-yellow-500 bg-yellow-900/30'
                  : 'border-blue-500 bg-blue-900/30'
              }`}
            >
              <span className="text-gray-500">
                [{entry.timestamp.toLocaleTimeString()}]
              </span>{' '}
              <span className={
                entry.type === 'error' 
                  ? 'text-red-400' 
                  : entry.type === 'warning'
                  ? 'text-yellow-400'
                  : 'text-blue-400'
              }>
                {entry.type.toUpperCase()}:
              </span>{' '}
              {entry.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
