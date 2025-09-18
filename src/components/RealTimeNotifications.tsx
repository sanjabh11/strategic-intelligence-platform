// Real-Time Notification System
// Provides real-time updates for collaborative insights, Bayesian belief updates, and strategy analysis

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import {
  Bell, BellRing, X, Check, Zap, Brain, ArrowUpDown,
  MessageCircle, TrendingUp, AlertTriangle, Info
} from 'lucide-react';

interface NotificationItem {
  id: string;
  type: 'insight' | 'belief_update' | 'analysis_complete' | 'evidence_ready' | 'session_update';
  title: string;
  message: string;
  details?: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'collaborative' | 'bayesian' | 'analysis' | 'evidence';
  actionPayload?: any;
  read: boolean;
  autoDismiss?: boolean;
  dismissDelay?: number;
}

interface RealTimeNotificationsProps {
  sessionId?: string;
  participantId?: string;
  onNotificationClick?: (notification: NotificationItem) => void;
  isLearningMode?: boolean;
}

const RealTimeNotifications: React.FC<RealTimeNotificationsProps> = ({
  sessionId,
  participantId,
  onNotificationClick,
  isLearningMode = false
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();
  const dismissTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Supabase Realtime subscriptions
  useEffect(() => {
    const channels: any[] = []

    function pushNotification(n: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) {
      const item: NotificationItem = {
        id: `notif_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        timestamp: new Date(),
        read: false,
        ...n
      }
      setNotifications(prev => [item, ...prev].slice(0, 50))
      if (item.autoDismiss && item.dismissDelay) {
        const timeout = setTimeout(() => dismissNotification(item.id), item.dismissDelay)
        dismissTimeouts.current.set(item.id, timeout)
      }
    }

    if (supabase) {
      // Collaborative insights: new insight added
      const ch1 = supabase
        .channel('rt-collective-insights')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'collective_insights',
          ...(sessionId ? { filter: `session_id=eq.${sessionId}` } : {})
        }, (payload) => {
          const row: any = payload.new
          pushNotification({
            type: 'insight',
            title: 'New Collaborative Insight',
            message: row?.content?.slice(0, 120) || 'New insight posted',
            details: row?.author_id ? `by ${row.author_id}` : undefined,
            priority: 'medium',
            category: 'collaborative',
            actionPayload: { insight_id: row?.id },
            autoDismiss: true,
            dismissDelay: 15000
          })
        })
        .subscribe()
      channels.push(ch1)

      // Insight reactions (votes/comments)
      const ch2 = supabase
        .channel('rt-insight-reactions')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'insight_reactions',
          ...(sessionId ? { filter: `session_id=eq.${sessionId}` } : {})
        }, (payload) => {
          const row: any = payload.new
          pushNotification({
            type: 'session_update',
            title: 'Insight Reaction',
            message: `Reaction: ${row?.type || 'vote'}`,
            details: row?.insight_id ? `on insight ${row.insight_id}` : undefined,
            priority: 'low',
            category: 'collaborative',
            actionPayload: { reaction_id: row?.id },
            autoDismiss: true,
            dismissDelay: 10000
          })
        })
        .subscribe()
      channels.push(ch2)

      // Bayesian belief evolution log
      const ch3 = supabase
        .channel('rt-belief-evolution')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'belief_evolution_log',
        }, (payload) => {
          const row: any = payload.new
          pushNotification({
            type: 'belief_update',
            title: 'Belief Network Updated',
            message: row?.change_summary?.slice(0, 140) || 'Belief update recorded',
            details: row?.analysis_run_id ? `run ${row.analysis_run_id}` : undefined,
            priority: 'high',
            category: 'bayesian',
            actionPayload: { belief_log_id: row?.id },
            autoDismiss: false
          })
        })
        .subscribe()
      channels.push(ch3)
    }

    return () => {
      channels.forEach((ch) => {
        try { supabase.removeChannel(ch) } catch { /* ignore */ }
      })
      if (intervalRef.current) clearInterval(intervalRef.current)
      dismissTimeouts.current.forEach(timeout => clearTimeout(timeout))
    }
  }, [sessionId])

  // Update unread count
  useEffect(() => {
    const unread = notifications.filter(n => !n.read).length;
    setUnreadCount(unread);

    // Update notification permission in browser (if supported)
    if (unread > 0 && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(`Strategic Intelligence Update (${unread})`, {
          body: notifications.find(n => !n.read)?.message,
          icon: '/vite.svg',
          badge: '/vite.svg'
        });
      }
    }
  }, [notifications]);

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? {...n, read: true} : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(n => ({...n, read: true}))
    );
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));

    // Clear dismiss timeout if exists
    const timeout = dismissTimeouts.current.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      dismissTimeouts.current.delete(notificationId);
    }
  };

  const handleNotificationClick = (notification: NotificationItem) => {
    markAsRead(notification.id);
    onNotificationClick?.(notification);
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'insight': return Brain;
      case 'belief_update': return TrendingUp;
      case 'analysis_complete': return Check;
      case 'evidence_ready': return ArrowUpDown;
      case 'session_update': return MessageCircle;
      default: return Info;
    }
  };

  const getPriorityColor = (priority: NotificationItem['priority']) => {
    switch (priority) {
      case 'urgent': return 'border-red-500 bg-red-500/10';
      case 'high': return 'border-orange-500 bg-orange-500/10';
      case 'medium': return 'border-yellow-500 bg-yellow-500/10';
      case 'low': return 'border-green-500 bg-green-500/10';
      default: return 'border-slate-500 bg-slate-500/10';
    }
  };

  const getCategoryColor = (category: NotificationItem['category']) => {
    switch (category) {
      case 'collaborative': return 'text-purple-400';
      case 'bayesian': return 'text-indigo-400';
      case 'analysis': return 'text-emerald-400';
      case 'evidence': return 'text-cyan-400';
      default: return 'text-slate-400';
    }
  };

  // Analytics section
  const NotificationAnalytics = () => {
    const analytics = {
      total: notifications.length,
      unread: unreadCount,
      byCategory: notifications.reduce((acc, n) => {
        acc[n.category] = (acc[n.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byPriority: notifications.reduce((acc, n) => {
        acc[n.priority] = (acc[n.priority] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return (
      <div className="p-4 bg-slate-800 rounded-lg space-y-3">
        <h4 className="text-sm font-medium text-slate-300">Notification Analytics</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-2xl font-mono text-blue-400">{analytics.total}</div>
            <div className="text-xs text-slate-400">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono text-red-400">{analytics.unread}</div>
            <div className="text-xs text-slate-400">Unread</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-slate-400">
            By Category: {Object.entries(analytics.byCategory).map(([cat, count]) =>
              `${cat}: ${count}`).join(', ')}
          </div>
          <div className="text-xs text-slate-400">
            By Priority: {Object.entries(analytics.byPriority).map(([pri, count]) =>
              `${pri}: ${count}`).join(', ')}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Notification Bell Button */}
      <div className="relative">
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          className={`relative p-2 rounded-lg border transition-all ${
            unreadCount > 0
              ? 'border-blue-500 bg-blue-500/20'
              : 'border-slate-600 bg-slate-700'
          }`}
        >
          {unreadCount > 0 ? <BellRing className="w-5 h-5 text-blue-400" /> : <Bell className="w-5 h-5 text-slate-400" />}
          {unreadCount > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-mono">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="absolute right-0 top-14 w-96 max-h-96 bg-slate-800 border border-slate-600 rounded-lg shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-600">
            <h3 className="text-lg font-semibold text-slate-200">Strategic Updates</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1 hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const IconComponent = getNotificationIcon(notification.type);
                const timeAgo = Math.floor((Date.now() - notification.timestamp.getTime()) / 1000);

                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 border-b border-slate-700 hover:bg-slate-700/50 cursor-pointer transition-all ${
                      !notification.read ? 'bg-slate-800/70' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded border ${getPriorityColor(notification.priority)}`}
                      >
                        <IconComponent className={`w-4 h-4 ${getCategoryColor(notification.category)}`} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`text-sm font-medium ${!notification.read ? 'text-slate-200' : 'text-slate-300'}`}>
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">
                              {timeAgo < 60 ? `${timeAgo}s ago` :
                               timeAgo < 3600 ? `${Math.floor(timeAgo/60)}m ago` :
                               `${Math.floor(timeAgo/3600)}h ago`}
                            </span>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-slate-400 mb-1 line-clamp-2">
                          {notification.message}
                        </p>

                        {notification.details && (
                          <p className="text-xs text-slate-500 line-clamp-1">
                            {notification.details}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              notification.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
                              notification.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                              notification.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                              'bg-green-500/20 text-green-300'
                            }`}
                          >
                            {notification.priority}
                          </span>
                          <span className={`text-xs ${getCategoryColor(notification.category)}`}>
                            {notification.category}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(notification.id);
                        }}
                        className="p-1 hover:bg-slate-700 rounded opacity-0 hover:opacity-100"
                      >
                        <X className="w-3 h-3 text-slate-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Analytics Section */}
          {isLearningMode && (
            <div className="border-t border-slate-600 mt-2">
              <NotificationAnalytics />
            </div>
          )}
        </div>
      )}

      {/* Overlay to close panel when clicking outside */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </>
  );
};

export default RealTimeNotifications;