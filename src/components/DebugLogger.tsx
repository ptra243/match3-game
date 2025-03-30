import React, { useState, useEffect } from 'react';
import { queryLogs } from '../store/middleware/loggerMiddleware';
import { DEBUG_KEYS } from '../store/slices/debug';

interface LogEntry {
  id?: number;
  timestamp: Date;
  actionType?: string;
  previousState?: string;
  changes?: string;
  nextState?: string;
  performanceMs?: number;
  errorMessage?: string;
  stackTrace?: string;
  key?: string;
  message?: string;
  data?: string;
}

export const DebugLogger: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'state' | 'errors' | 'debug'>('state');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKey, setSelectedKey] = useState<string>('all');

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen, activeTab]);

  const loadLogs = async () => {
    try {
      if (activeTab === 'state') {
        const stateLogs = await queryLogs.getRecentStateChanges(100);
        setLogs(stateLogs);
      } else if (activeTab === 'errors') {
        const errorLogs = await queryLogs.getErrors();
        setLogs(errorLogs);
      } else {
        const debugLogs = await queryLogs.getDebugLogs(100);
        setLogs(debugLogs);
      }
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const clearLogs = async () => {
    try {
      await queryLogs.clearLogs();
      setLogs([]);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  // Filter logs based on search query and selected key
  const filteredLogs = logs.filter(log => {
    const matchesSearch = searchQuery === '' || 
      (log.message?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       log.errorMessage?.toLowerCase().includes(searchQuery.toLowerCase()) ||
       (log.data && JSON.stringify(JSON.parse(log.data)).toLowerCase().includes(searchQuery.toLowerCase())));
    
    const matchesKey = selectedKey === 'all' || log.key === selectedKey;
    
    return matchesSearch && matchesKey;
  });

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700"
      >
        Debug Logs
      </button>
    );
  }

  const containerClasses = isFullscreen 
    ? "fixed inset-0 bg-gray-800 text-white flex flex-col"
    : "fixed bottom-4 right-4 w-96 h-96 bg-gray-800 text-white rounded-lg shadow-lg flex flex-col";

  return (
    <div className="hidden md:block">
      <div className={`fixed bottom-4 right-4 z-50 ${isFullscreen ? 'w-full h-full inset-0' : 'w-96 h-96'}`}>
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold">Debug Logger</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="text-gray-400 hover:text-white"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? "⤓" : "⤢"}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white"
              title="Minimize"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('state')}
            className={`flex-1 py-2 px-4 ${
              activeTab === 'state' ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            State Changes
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`flex-1 py-2 px-4 ${
              activeTab === 'errors' ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            Errors
          </button>
          <button
            onClick={() => setActiveTab('debug')}
            className={`flex-1 py-2 px-4 ${
              activeTab === 'debug' ? 'bg-gray-700' : 'hover:bg-gray-700'
            }`}
          >
            Debug Logs
          </button>
        </div>

        {activeTab === 'debug' && (
          <div className="p-4 border-b border-gray-700 space-y-2">
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                value={selectedKey}
                onChange={(e) => setSelectedKey(e.target.value)}
                className="px-3 py-2 bg-gray-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Keys</option>
                {Object.keys(DEBUG_KEYS).map(key => (
                  <option key={key} value={key}>{key}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-400">
              Showing {filteredLogs.length} of {logs.length} logs
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="mb-4 p-3 bg-gray-700 rounded-lg text-sm"
            >
              <div className="flex justify-between mb-2">
                <span className="text-gray-300">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
                <span className="text-blue-400">{log.actionType || log.key}</span>
              </div>
              {activeTab === 'state' ? (
                <>
                  <div className="text-gray-300 mb-1">
                    Performance: {log.performanceMs?.toFixed(2)}ms
                  </div>
                  <div className="text-gray-300">
                    <details>
                      <summary className="cursor-pointer">View Details</summary>
                      <pre className="mt-2 text-xs overflow-x-auto">
                        {JSON.stringify(
                          {
                            previous: JSON.parse(log.previousState || '{}'),
                            changes: JSON.parse(log.changes || '{}'),
                            next: JSON.parse(log.nextState || '{}'),
                          },
                          null,
                          2
                        )}
                      </pre>
                    </details>
                  </div>
                </>
              ) : activeTab === 'errors' ? (
                <>
                  <div className="text-red-400 mb-1">{log.errorMessage}</div>
                  <pre className="text-xs text-gray-400 overflow-x-auto">
                    {log.stackTrace}
                  </pre>
                </>
              ) : (
                <>
                  <div className="text-gray-300 mb-1">{log.message}</div>
                  {log.data && (
                    <pre className="text-xs text-gray-400 overflow-x-auto">
                      {JSON.stringify(JSON.parse(log.data), null, 2)}
                    </pre>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={clearLogs}
            className="w-full bg-red-600 hover:bg-red-700 py-2 rounded"
          >
            Clear Logs
          </button>
        </div>
      </div>
    </div>
  );
}; 