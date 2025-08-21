// System Status Dashboard - Production Monitoring
import React, { useState, useEffect } from 'react';
import { logger } from '@shared/utils/secureLogger';

interface SystemHealth {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  cache: 'healthy' | 'degraded' | 'down';
  websocket: 'connected' | 'reconnecting' | 'disconnected';
}

interface SystemMetrics {
  activeUsers: number;
  totalOrganisms: number;
  mutationsPerHour: number;
  apiLatency: number;
  uptime: string;
  version: string;
}

interface NetworkStats {
  totalConnections: number;
  activeRituals: number;
  dataProcessed: string;
  evolutionEvents: number;
}

export const SystemStatusDashboard: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth>({
    api: 'healthy',
    database: 'healthy',
    cache: 'healthy',
    websocket: 'connected'
  });

  const [metrics, setMetrics] = useState<SystemMetrics>({
    activeUsers: 0,
    totalOrganisms: 0,
    mutationsPerHour: 0,
    apiLatency: 0,
    uptime: '0h 0m',
    version: '1.0.0'
  });

  const [networkStats, setNetworkStats] = useState<NetworkStats>({
    totalConnections: 0,
    activeRituals: 0,
    dataProcessed: '0 MB',
    evolutionEvents: 0
  });

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 5000); // Update every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      // Fetch system health
      const healthResponse = await fetch('/api/system/health');
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        setHealth(healthData);
      }

      // Fetch metrics
      const metricsResponse = await fetch('/api/system/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Fetch network stats
      const networkResponse = await fetch('/api/system/network-stats');
      if (networkResponse.ok) {
        const networkData = await networkResponse.json();
        setNetworkStats(networkData);
      }
    } catch (_error) {
      logger.error('Failed to fetch system status:', _error);
      setHealth(prev => ({ ...prev, api: 'down' }));
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return '#00C9DB';
      case 'degraded':
      case 'reconnecting':
        return '#FFB800';
      case 'down':
      case 'disconnected':
        return '#FF6B6B';
      default:
        return '#6B7280';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return '✅';
      case 'degraded':
      case 'reconnecting':
        return '⚠️';
      case 'down':
      case 'disconnected':
        return '❌';
      default:
        return '⚪';
    }
  };

  if (!isExpanded) {
    return (
      <div className="system-status-compact">
        <button
          onClick={() => setIsExpanded(true)}
          className="status-toggle"
          title="Voir le status système"
        >
          <span className="status-indicator">
            {getStatusIcon(health.api)} SYMBIONT
          </span>
          <span className="metrics-preview">
            {metrics.activeUsers} utilisateurs • {metrics.apiLatency}ms
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="system-status-dashboard">
      <div className="dashboard-header">
        <h2>🔍 System Status Dashboard</h2>
        <button
          onClick={() => setIsExpanded(false)}
          className="close-button"
        >
          ✕
        </button>
      </div>

      {/* Health Status Grid */}
      <div className="health-grid">
        <div className="health-card">
          <div className="health-header">
            <span className="health-icon">{getStatusIcon(health.api)}</span>
            <h3>API Backend</h3>
          </div>
          <div 
            className="health-status"
            style={{ color: getStatusColor(health.api) }}
          >
            {health.api.toUpperCase()}
          </div>
          <div className="health-metric">
            Latence: {metrics.apiLatency}ms
          </div>
        </div>

        <div className="health-card">
          <div className="health-header">
            <span className="health-icon">{getStatusIcon(health.database)}</span>
            <h3>Base de Données</h3>
          </div>
          <div 
            className="health-status"
            style={{ color: getStatusColor(health.database) }}
          >
            {health.database.toUpperCase()}
          </div>
          <div className="health-metric">
            {metrics.totalOrganisms} organismes
          </div>
        </div>

        <div className="health-card">
          <div className="health-header">
            <span className="health-icon">{getStatusIcon(health.cache)}</span>
            <h3>Cache Redis</h3>
          </div>
          <div 
            className="health-status"
            style={{ color: getStatusColor(health.cache) }}
          >
            {health.cache.toUpperCase()}
          </div>
          <div className="health-metric">
            Données: {networkStats.dataProcessed}
          </div>
        </div>

        <div className="health-card">
          <div className="health-header">
            <span className="health-icon">{getStatusIcon(health.websocket)}</span>
            <h3>WebSocket</h3>
          </div>
          <div 
            className="health-status"
            style={{ color: getStatusColor(health.websocket) }}
          >
            {health.websocket.toUpperCase()}
          </div>
          <div className="health-metric">
            {networkStats.totalConnections} connexions
          </div>
        </div>
      </div>

      {/* Real-time Metrics */}
      <div className="metrics-section">
        <h3>📊 Métriques Temps Réel</h3>
        <div className="metrics-grid">
          <div className="metric-item">
            <div className="metric-value">{metrics.activeUsers}</div>
            <div className="metric-label">Utilisateurs Actifs</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-value">{metrics.mutationsPerHour}</div>
            <div className="metric-label">Mutations/heure</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-value">{networkStats.activeRituals}</div>
            <div className="metric-label">Rituels Actifs</div>
          </div>
          
          <div className="metric-item">
            <div className="metric-value">{networkStats.evolutionEvents}</div>
            <div className="metric-label">Évènements Evolution</div>
          </div>
        </div>
      </div>

      {/* System Info */}
      <div className="system-info">
        <div className="info-item">
          <span className="info-label">Uptime:</span>
          <span className="info-value">{metrics.uptime}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Version:</span>
          <span className="info-value">v{metrics.version}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Environnement:</span>
          <span className="info-value">
            {process.env.NODE_ENV?.toUpperCase() || 'DEVELOPMENT'}
          </span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <button 
          className="action-button"
          onClick={() => window.open('/api/health', '_blank')}
        >
          🔗 API Health
        </button>
        <button 
          className="action-button"
          onClick={() => window.open(':3000', '_blank')}
        >
          📈 Grafana
        </button>
        <button 
          className="action-button"
          onClick={() => window.open(':9090', '_blank')}
        >
          🎯 Prometheus
        </button>
        <button 
          className="action-button"
          onClick={fetchSystemStatus}
        >
          🔄 Refresh
        </button>
      </div>

      <style>{`
        .system-status-compact {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 1000;
        }

        .status-toggle {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border: 1px solid var(--cyan);
          border-radius: 25px;
          padding: 8px 16px;
          font-size: 12px;
          backdrop-filter: blur(10px);
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .status-toggle:hover {
          background: rgba(0, 201, 219, 0.1);
          border-color: var(--cyan-bright);
        }

        .status-indicator {
          font-weight: bold;
        }

        .metrics-preview {
          opacity: 0.7;
          font-size: 11px;
        }

        .system-status-dashboard {
          position: fixed;
          top: 50px;
          right: 20px;
          width: 600px;
          background: rgba(0, 0, 0, 0.95);
          border: 1px solid var(--cyan);
          border-radius: 15px;
          backdrop-filter: blur(20px);
          padding: 20px;
          color: white;
          z-index: 1000;
          max-height: 80vh;
          overflow-y: auto;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid rgba(0, 201, 219, 0.3);
        }

        .dashboard-header h2 {
          margin: 0;
          color: var(--cyan);
        }

        .close-button {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.3s;
        }

        .close-button:hover {
          opacity: 1;
        }

        .health-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }

        .health-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          padding: 15px;
          transition: all 0.3s ease;
        }

        .health-card:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: var(--cyan);
        }

        .health-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .health-header h3 {
          margin: 0;
          font-size: 14px;
          color: white;
        }

        .health-icon {
          font-size: 16px;
        }

        .health-status {
          font-weight: bold;
          font-size: 12px;
          margin-bottom: 5px;
        }

        .health-metric {
          font-size: 11px;
          opacity: 0.7;
        }

        .metrics-section h3 {
          color: var(--cyan);
          margin-bottom: 15px;
          font-size: 16px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 15px;
          margin-bottom: 25px;
        }

        .metric-item {
          text-align: center;
          background: rgba(0, 201, 219, 0.1);
          border-radius: 10px;
          padding: 15px 10px;
        }

        .metric-value {
          font-size: 24px;
          font-weight: bold;
          color: var(--cyan);
          margin-bottom: 5px;
        }

        .metric-label {
          font-size: 11px;
          opacity: 0.8;
        }

        .system-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 10px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 8px;
        }

        .info-item {
          display: flex;
          flex-direction: column;
          text-align: center;
        }

        .info-label {
          font-size: 11px;
          opacity: 0.7;
          margin-bottom: 3px;
        }

        .info-value {
          font-size: 12px;
          font-weight: bold;
          color: var(--cyan);
        }

        .quick-actions {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }

        .action-button {
          background: rgba(0, 201, 219, 0.2);
          border: 1px solid var(--cyan);
          color: white;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .action-button:hover {
          background: rgba(0, 201, 219, 0.4);
          border-color: var(--cyan-bright);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .system-status-dashboard {
            width: calc(100vw - 40px);
            right: 20px;
            left: 20px;
          }

          .health-grid {
            grid-template-columns: 1fr;
          }

          .metrics-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default SystemStatusDashboard; 