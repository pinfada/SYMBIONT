import React from 'react';

interface TimelineEvent {
  type: 'mutation' | 'transmission' | 'activation' | 'consciousness' | 'energy';
  date: number;
  description: string;
  details?: unknown;
  id?: string;
  metadata?: Record<string, unknown>;
}

interface OrganismTimelineProps {
  events: TimelineEvent[];
}

export const OrganismTimeline: React.FC<OrganismTimelineProps> = ({ events }) => {
  return (
    <div className="organism-timeline">
      <h3 style={{ textAlign: 'center', color: '#00e0ff', marginBottom: 18 }}>Évolution de l'organisme</h3>
      <ul className="timeline-list">
        {events.map((evt, idx) => (
          <li className={`timeline-event timeline-event--${evt.type}`} key={idx}>
            <div className="timeline-icon">
              {evt.type === 'mutation' && <span title="Mutation">🧬</span>}
              {evt.type === 'transmission' && <span title="Transmission">🔗</span>}
              {evt.type === 'activation' && <span title="Activation">✨</span>}
              {evt.type === 'consciousness' && <span title="Consciousness">🧠</span>}
              {evt.type === 'energy' && <span title="Energy">⚡</span>}
            </div>
            <div className="timeline-content">
              <div className="timeline-date">{new Date(evt.date).toLocaleString()}</div>
              <div className="timeline-desc">{evt.description}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}; 