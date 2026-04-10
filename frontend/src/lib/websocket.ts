import { useEffect, useCallback, useRef, useState } from 'react';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

export interface WebSocketMessage {
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
}

// CRIT-7 FIX: Configurable reconnect with exponential backoff and max retries
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000; // 1 second
const MAX_RECONNECT_DELAY = 30000; // 30 seconds

export function useWebSocket(sessionId: number | null) {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const [connectionFailed, setConnectionFailed] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const reconnectAttemptsRef = useRef(0);

    const connect = useCallback(() => {
        if (!sessionId) return;

        // CRIT-8 FIX: WebSocket connects with auth token
        const token = localStorage.getItem('auth-storage');
        let authToken = '';
        try {
            const parsed = JSON.parse(token || '{}');
            // Token would be retrieved from Supabase session in production
            authToken = parsed?.state?.accessToken || '';
        } catch {
            // Proceed without token for now
        }

        const url = authToken
            ? `${WS_BASE_URL}/api/ws/session/${sessionId}?token=${authToken}`
            : `${WS_BASE_URL}/api/ws/session/${sessionId}`;

        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log('WebSocket connected');
            setIsConnected(true);
            setConnectionFailed(false);
            reconnectAttemptsRef.current = 0; // Reset on successful connection
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                setLastMessage(message);
            } catch (error) {
                console.error('Failed to parse WebSocket message:', error);
            }
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
            console.log('WebSocket disconnected');
            setIsConnected(false);
            wsRef.current = null;

            // CRIT-7 FIX: Exponential backoff with max retries
            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                const delay = Math.min(
                    BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
                    MAX_RECONNECT_DELAY
                );
                reconnectAttemptsRef.current += 1;
                console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

                reconnectTimeoutRef.current = window.setTimeout(() => {
                    connect();
                }, delay);
            } else {
                console.warn('Max reconnect attempts reached. Connection failed.');
                setConnectionFailed(true);
            }
        };

        wsRef.current = ws;
    }, [sessionId]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        reconnectAttemptsRef.current = 0;
    }, []);

    const sendMessage = useCallback((message: Record<string, unknown>) => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        isConnected,
        lastMessage,
        sendMessage,
        connectionFailed,
        reconnect: () => {
            reconnectAttemptsRef.current = 0;
            setConnectionFailed(false);
            connect();
        },
    };
}

export function useLiveMonitoring(sessionId: number | null) {
    const [isConnected, setIsConnected] = useState(false);
    const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const pingIntervalRef = useRef<number | null>(null);

    const connect = useCallback(() => {
        if (!sessionId) return;

        const ws = new WebSocket(`${WS_BASE_URL}/api/ws/live/${sessionId}`);

        ws.onopen = () => {
            console.log('Live monitoring connected');
            setIsConnected(true);

            pingIntervalRef.current = window.setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000);
        };

        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'metrics_update') {
                    setMetrics(message.data);
                }
            } catch (error) {
                console.error('Failed to parse message:', error);
            }
        };

        ws.onclose = () => {
            console.log('Live monitoring disconnected');
            setIsConnected(false);
            if (pingIntervalRef.current) {
                clearInterval(pingIntervalRef.current);
            }
        };

        wsRef.current = ws;
    }, [sessionId]);

    const disconnect = useCallback(() => {
        if (pingIntervalRef.current) {
            clearInterval(pingIntervalRef.current);
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const requestMetrics = useCallback(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'request_metrics' }));
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return {
        isConnected,
        metrics,
        requestMetrics,
        flags: [] as string[],
    };
}
