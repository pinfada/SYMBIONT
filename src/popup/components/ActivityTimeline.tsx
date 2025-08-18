// src/popup/components/ActivityTimeline.tsx
import React from 'react';

interface Activity {
  id: string;
  type: string;
  timestamp: number;
  duration?: number;
  url?: string;
  data?: unknown;
}

interface ActivityTimelineProps {
  data: Activity[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="activity-timeline--empty">
        <p>No activity recorded yet</p>
      </div>
    );
  }
  
  // Grouper par heure
  const groupedByHour = groupActivitiesByHour(data);
  
  return (
    <div className="activity-timeline">
      {Object.entries(groupedByHour).map(([hour, activities]) => (
        <div key={hour} className="timeline-hour">
          <div className="timeline-hour__header">
            <h4>{formatHour(parseInt(hour))}</h4>
          </div>
          <ul className="timeline-activities">
            {activities.map(activity => (
              <li key={activity.id} className="timeline-activity">
                <div className={`activity-icon activity-icon--${activity.type}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="activity-content">
                  <div className="activity-title">
                    {getActivityTitle(activity)}
                  </div>
                  {activity.duration && (
                    <div className="activity-duration">
                      {formatDuration(activity.duration)}
                    </div>
                  )}
                </div>
                <div className="activity-time">
                  {formatTime(activity.timestamp)}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

// Grouper les activités par heure
const groupActivitiesByHour = (activities: Activity[]): Record<string, Activity[]> => {
  const grouped: Record<string, Activity[]> = {};
  
  activities.forEach(activity => {
    const date = new Date(activity.timestamp);
    const hour = date.getHours();
    
    if (!grouped[hour]) {
      grouped[hour] = [];
    }
    
    grouped[hour].push(activity);
  });
  
  // Trier les clés (heures) par ordre décroissant
  return Object.fromEntries(
    Object.entries(grouped)
      .sort(([hourA], [hourB]) => parseInt(hourB) - parseInt(hourA))
  );
};

const formatHour = (hour: number): string => {
  return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDuration = (duration: number): string => {
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  
  return `${seconds}s`;
};

const getActivityIcon = (type: string): string => {
  switch (type) {
    case 'navigation':
      return '🧭';
    case 'interaction':
      return '👆';
    case 'search':
      return '🔍';
    case 'reading':
      return '📖';
    case 'idle':
      return '⏸️';
    default:
      return '•';
  }
};

const getActivityTitle = (activity: Activity): string => {
  switch (activity.type) {
    case 'navigation':
      return activity.url 
        ? `Visited ${new URL(activity.url).hostname}`
        : 'Navigated to a page';
    case 'interaction':
      return 'Interacted with content';
    case 'search':
      return 'Searched for content';
    case 'reading':
      return 'Read content';
    case 'idle':
      return 'Idle period';
    default:
      return activity.type || 'Unknown activity';
  }
};
