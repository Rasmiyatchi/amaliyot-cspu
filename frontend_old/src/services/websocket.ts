class WebSocketService {
  private socket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private userId: string | null = null;
  private userRole: string | null = null;
  private rooms: Set<string> = new Set();

  connect(userId: string, userRole: string, internshipId?: string) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    this.userId = userId;
    this.userRole = userRole;

    // Connect to Django Channels WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Backend hostname'ni ishlatish
    const host = 'logistika.pythonanywhere.com';
    
    // Use provided internshipId or default to 'general' for admin/super_admin
    const wsPath = internshipId ? `ws/internship/${internshipId}/` : 'ws/general/';
    // PythonAnywhere'da port o'rniga path-based URL ishlatish
    const wsUrl = `${protocol}//${host}/${wsPath}`;
    
    console.log('Connecting to WebSocket:', wsUrl);
    this.socket = new WebSocket(wsUrl);

    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.onopen = () => {
      console.log('WebSocket connected successfully');
      this.reconnectAttempts = 0;
      
      // Send authentication
      this.send({
        type: 'authenticate',
        userId: this.userId,
        userRole: this.userRole
      });
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected');
      console.log('Close code:', event.code);
      console.log('Close reason:', event.reason);
      this.handleReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      console.error('WebSocket URL:', this.socket?.url);
      console.error('WebSocket readyState:', this.socket?.readyState);
      console.error('Error details:', error);
    };

    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }

  private handleMessage(data: any) {
    switch (data.type) {
      case 'internship_data':
        console.log('Internship data received:', data.data);
        break;
      case 'internship_update':
        this.handleInternshipUpdate(data.data);
        break;
      case 'report_update':
        this.handleReportUpdate(data.data);
        break;
      case 'document_update':
        this.handleDocumentUpdate(data.data);
        break;
      case 'daily_status_update':
        this.handleDailyStatusUpdate(data.data);
        break;
      case 'pong':
        console.log('Pong received');
        break;
      case 'error':
        console.error('WebSocket error:', data.message);
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.userId && this.userRole) {
      this.reconnectAttempts++;
      setTimeout(() => {
        console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.connect(this.userId!, this.userRole!);
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handleInternshipUpdate(data: any) {
    window.dispatchEvent(new CustomEvent('websocket-internship-update', { detail: data }));
  }

  private handleReportUpdate(data: any) {
    window.dispatchEvent(new CustomEvent('websocket-report-update', { detail: data }));
  }

  private handleDocumentUpdate(data: any) {
    window.dispatchEvent(new CustomEvent('websocket-document-update', { detail: data }));
  }

  private handleDailyStatusUpdate(data: any) {
    window.dispatchEvent(new CustomEvent('websocket-daily-status-update', { detail: data }));
  }

  private send(data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  // Join specific rooms
  joinRoom(room: string) {
    this.rooms.add(room);
    this.send({
      type: 'join_room',
      room: room
    });
  }

  leaveRoom(room: string) {
    this.rooms.delete(room);
    this.send({
      type: 'leave_room',
      room: room
    });
  }

  // Send ping to keep connection alive
  ping() {
    this.send({ type: 'ping' });
  }

  // Disconnect
  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.rooms.clear();
  }

  // Get connection status
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
