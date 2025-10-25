import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { webSocketService } from '../services/websocket';
import { apiService } from '../services/api';

export function useWebSocket(internshipId?: string) {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id && user?.role) {
      // Get internship ID for students
      const connectWebSocket = async () => {
        let wsInternshipId = internshipId;
        
        if (user.role === 'student' && !wsInternshipId) {
          try {
            const student = await apiService.getStudentByUserId(user.id.toString()) as any;
            if (student?.current_internship?.id) {
              wsInternshipId = student.current_internship.id.toString();
            }
          } catch (error) {
            console.error('Error getting student internship:', error);
          }
        }
        
        // Connect to WebSocket
        webSocketService.connect(user.id, user.role, wsInternshipId);
      };
      
      connectWebSocket();

      // Listen for connection status - faqat connection yo'q bo'lsa tekshirish
      let interval: NodeJS.Timeout | null = null;
      
      const checkConnection = () => {
        const connected = webSocketService.isConnected();
        setIsConnected(connected);
        
        // Agar connected bo'lsa, interval ni to'xtatish
        if (connected && interval) {
          clearInterval(interval);
          interval = null;
        }
      };

      // Faqat connection yo'q bo'lsa tekshirish
      if (!isConnected) {
        interval = setInterval(checkConnection, 5000); // 5 soniyaga o'zgartirish
      }

      // Listen for notifications
      const handleNotification = (event: CustomEvent) => {
        setNotifications(prev => [...prev, event.detail]);
      };

      // Listen for updates
      const handleInternshipUpdate = (event: CustomEvent) => {
        console.log('Internship updated:', event.detail);
        // Trigger data refresh in components
        window.dispatchEvent(new CustomEvent('refresh-internship-data'));
      };

      const handleReportUpdate = (event: CustomEvent) => {
        console.log('Report updated:', event.detail);
        window.dispatchEvent(new CustomEvent('refresh-report-data'));
      };

      const handleDocumentUpdate = (event: CustomEvent) => {
        console.log('Document updated:', event.detail);
        window.dispatchEvent(new CustomEvent('refresh-document-data'));
      };

      const handleGradeUpdate = (event: CustomEvent) => {
        console.log('Grade updated:', event.detail);
        window.dispatchEvent(new CustomEvent('refresh-grade-data'));
      };

      const handleDailyStatusUpdate = (event: CustomEvent) => {
        console.log('Daily status updated:', event.detail);
        window.dispatchEvent(new CustomEvent('refresh-daily-status-data'));
      };

      // Add event listeners
      window.addEventListener('websocket-notification', handleNotification as EventListener);
      window.addEventListener('websocket-internship-update', handleInternshipUpdate as EventListener);
      window.addEventListener('websocket-report-update', handleReportUpdate as EventListener);
      window.addEventListener('websocket-document-update', handleDocumentUpdate as EventListener);
      window.addEventListener('websocket-grade-update', handleGradeUpdate as EventListener);
      window.addEventListener('websocket-daily-status-update', handleDailyStatusUpdate as EventListener);

      // Join user-specific room
      webSocketService.joinRoom(`user_${user.id}`);

      // Join role-specific room
      webSocketService.joinRoom(`role_${user.role}`);

      // Join internship-specific room if internshipId is provided
      if (internshipId) {
        webSocketService.joinRoom(`internship_${internshipId}`);
      }

      return () => {
        if (interval) {
          clearInterval(interval);
        }
        window.removeEventListener('websocket-notification', handleNotification as EventListener);
        window.removeEventListener('websocket-internship-update', handleInternshipUpdate as EventListener);
        window.removeEventListener('websocket-report-update', handleReportUpdate as EventListener);
        window.removeEventListener('websocket-document-update', handleDocumentUpdate as EventListener);
        window.removeEventListener('websocket-grade-update', handleGradeUpdate as EventListener);
        window.removeEventListener('websocket-daily-status-update', handleDailyStatusUpdate as EventListener);
        
        webSocketService.leaveRoom(`user_${user.id}`);
        webSocketService.leaveRoom(`role_${user.role}`);
        if (internshipId) {
          webSocketService.leaveRoom(`internship_${internshipId}`);
        }
        webSocketService.disconnect();
      };
    }
  }, [user?.id, user?.role, internshipId]);

  const clearNotifications = () => {
    setNotifications([]);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    isConnected,
    notifications,
    clearNotifications,
    removeNotification,
  };
}
