// src/popup/components/MetricsPanel.tsx
import React, { useState, useEffect } from 'react';
import { BehaviorPatterns } from './BehaviorPatterns';
import { ActivityTimeline } from './ActivityTimeline';
import { useOrganism } from '../hooks/useOrganism';
import { SymbiontStorage } from '../../core/storage/SymbiontStorage';

export const MetricsPanel: React.FC = () => {
  const { organism } = useOrganism();
  const [behaviorData, setBehaviorData] = useState<any[]>([]);
  const [activityData, setActivityData] = useState<any[]>([]);
  
  useEffect(() => {
    const loadData = async () => {
      const storage = new SymbiontStorage();
      await storage.initialize();
      try {
        const patterns = await storage.getBehaviorPatterns();
        setBehaviorData(patterns);
        const activity = await storage.getRecentActivity();
        setActivityData(activity);
      } catch (e) {
        setBehaviorData([]);
        setActivityData([]);
      }
    };
    
    loadData();
    const interval = setInterval(loadData, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!organism) return null;
  
  return (
    <div className="metrics-panel max-w-xl mx-auto p-6 bg-white rounded-xl shadow-lg mt-8">
      <section className="metrics-section mb-6">
        <h3 className="text-lg font-bold text-[#00e0ff] mb-2">Behavior Patterns</h3>
        <BehaviorPatterns data={behaviorData} />
      </section>
      <section className="metrics-section mb-6">
        <h3 className="text-lg font-bold text-[#00e0ff] mb-2">Activity Timeline</h3>
        <ActivityTimeline data={activityData} />
      </section>
      <section className="metrics-section">
        <h3 className="text-lg font-bold text-[#00e0ff] mb-2">Evolution Stats</h3>
        <div className="evolution-stats flex gap-8 justify-center">
          <div className="stat-item flex flex-col items-center">
            <span className="stat-label text-[#888] text-sm">Total Mutations</span>
            <span className="stat-value text-lg font-bold">{organism.mutations.length}</span>
          </div>
          <div className="stat-item flex flex-col items-center">
            <span className="stat-label text-[#888] text-sm">Génération</span>
            <span className="stat-value text-lg font-bold">{organism.generation}</span>
          </div>
          <div className="stat-item flex flex-col items-center">
            <span className="stat-label text-[#888] text-sm">Âge</span>
            <span className="stat-value text-lg font-bold">
              {Math.floor((Date.now() - (organism.createdAt ?? 0)) / (1000 * 60 * 60))}h
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MetricsPanel;