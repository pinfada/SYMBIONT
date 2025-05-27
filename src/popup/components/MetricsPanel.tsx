// src/popup/components/MetricsPanel.tsx
import React, { useState, useEffect } from 'react';
import { BehaviorPatterns } from './BehaviorPatterns';
import { ActivityTimeline } from './ActivityTimeline';
import { useOrganism } from '../hooks/useOrganism';
import { SymbiontStorage } from '@storage/SymbiontStorage';

export const MetricsPanel: React.FC = () => {
  const { organism } = useOrganism();
  const [behaviorData, setBehaviorData] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      const storage = SymbiontStorage.getInstance();
      const patterns = await storage.getBehaviorPatterns();
      const activities = await storage.getRecentActivity(24 * 60 * 60 * 1000); // 24h
      
      setBehaviorData(patterns);
      setActivityData(activities);
    };
    
    loadData();
    const interval = setInterval(loadData, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!organism) return null;
  
  return (
    <div className="metrics-panel">
      <section className="metrics-section">
        <h3>Behavior Patterns</h3>
        <BehaviorPatterns data={behaviorData} />
      </section>
      
      <section className="metrics-section">
        <h3>Activity Timeline</h3>
        <ActivityTimeline data={activityData} />
      </section>
      
      <section className="metrics-section">
        <h3>Evolution Stats</h3>
        <div className="evolution-stats">
          <div className="stat-item">
            <span className="stat-label">Total Mutations</span>
            <span className="stat-value">{organism.mutations.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Generation</span>
            <span className="stat-value">{organism.generation}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Age</span>
            <span className="stat-value">
              {Math.floor((Date.now() - organism.createdAt) / (1000 * 60 * 60))}h
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};