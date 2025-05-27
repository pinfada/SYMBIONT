"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityTimeline = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ActivityTimeline = ({ data }) => {
    if (!data || data.length === 0) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "activity-timeline--empty", children: (0, jsx_runtime_1.jsx)("p", { children: "No activity recorded yet" }) }));
    }
    // Grouper par heure
    const groupedByHour = groupActivitiesByHour(data);
    return ((0, jsx_runtime_1.jsx)("div", { className: "activity-timeline", children: Object.entries(groupedByHour).map(([hour, activities]) => ((0, jsx_runtime_1.jsxs)("div", { className: "timeline-hour", children: [(0, jsx_runtime_1.jsx)("div", { className: "timeline-hour__header", children: (0, jsx_runtime_1.jsx)("h4", { children: formatHour(parseInt(hour)) }) }), (0, jsx_runtime_1.jsx)("ul", { className: "timeline-activities", children: activities.map(activity => ((0, jsx_runtime_1.jsxs)("li", { className: "timeline-activity", children: [(0, jsx_runtime_1.jsx)("div", { className: `activity-icon activity-icon--${activity.type}`, children: getActivityIcon(activity.type) }), (0, jsx_runtime_1.jsxs)("div", { className: "activity-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "activity-title", children: getActivityTitle(activity) }), activity.duration && ((0, jsx_runtime_1.jsx)("div", { className: "activity-duration", children: formatDuration(activity.duration) }))] }), (0, jsx_runtime_1.jsx)("div", { className: "activity-time", children: formatTime(activity.timestamp) })] }, activity.id))) })] }, hour))) }));
};
exports.ActivityTimeline = ActivityTimeline;
// Grouper les activités par heure
const groupActivitiesByHour = (activities) => {
    const grouped = {};
    activities.forEach(activity => {
        const date = new Date(activity.timestamp);
        const hour = date.getHours();
        if (!grouped[hour]) {
            grouped[hour] = [];
        }
        grouped[hour].push(activity);
    });
    // Trier les clés (heures) par ordre décroissant
    return Object.fromEntries(Object.entries(grouped)
        .sort(([hourA], [hourB]) => parseInt(hourB) - parseInt(hourA)));
};
const formatHour = (hour) => {
    return `${hour % 12 || 12} ${hour < 12 ? 'AM' : 'PM'}`;
};
const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
};
const getActivityIcon = (type) => {
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
const getActivityTitle = (activity) => {
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
