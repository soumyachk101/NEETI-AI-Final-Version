import React, { createContext, useContext, useEffect, useCallback, useRef, useState } from 'react';
/* eslint-disable react-refresh/only-export-components */
import { supabase } from './supabase';
import { useSessionStore } from '../store/useSessionStore';

const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000';

const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

// ── Types ──
export interface WebSocketMessage {
    type: string;
    timestamp: string;
    data: Record<string, unknown>;
}

interface WebSocketContextType {
    isConnected: boolean;
    connectionFailed: boolean;
    sendMessage: (message: Record<string, unknown>) => void;
    onMessage: (listener: (msg: WebSocketMessage) => void) => () => void;
    reconnect: () => void;
}

// ── Shared connection logic ──
function useWebSocketConnection(sessionId: number | null, wsPath: string, fallbackToken?: string | null) {
    const [isConnected, setIsConnected] = useState(false);
    const [connectionFailed, setConnectionFailed] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const listenersRef = useRef<Set<(msg: WebSocketMessage) => void>>(new Set());
    const connectRef = useRef<(() => Promise<void>) | null>(null);
    const intentionalCloseRef = useRef(false);

    const connect = useCallback(async () => {
        if (!sessionId) return;

        // Don't reconnect if we already have an open connection
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        // Get auth token — guard against missing session
        const { data: { session } } = await supabase.auth.getSession();
        let authToken = session?.access_token;

        // Fallback to room token (for anonymous candidates)
        if (!authToken && fallbackToken) {
            authToken = fallbackToken;
        }

        if (!authToken) {
            console.warn('[WebSocket] No auth token available (and no fallback), skipping connection');
            setConnectionFailed(true);
            return;
        }

        const url = `${WS_BASE_URL}${wsPath}/${sessionId}?token=${authToken}`;

        try {
            const ws = new WebSocket(url);

            ws.onopen = () => {
                console.log(`[WebSocket] Connected to ${wsPath}/${sessionId}`);
                setIsConnected(true);
                setConnectionFailed(false);
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    listenersRef.current.forEach(listener => listener(message));
                } catch (error) {
                    console.error('[WebSocket] Failed to parse message:', error);
                }
            };

            ws.onerror = (event) => {
                console.error('[WebSocket] Connection error:', event);
            };

            ws.onclose = (event) => {
                console.log(`[WebSocket] Disconnected (code: ${event.code}, reason: ${event.reason || 'none'})`);
                setIsConnected(false);
                wsRef.current = null;

                // Don't reconnect if we closed intentionally
                if (intentionalCloseRef.current) {
                    intentionalCloseRef.current = false;
                    return;
                }

                // Don't reconnect on auth failures (1008 = Policy Violation)
                if (event.code === 1008) {
                    console.warn('[WebSocket] Auth failed, not reconnecting');
                    setConnectionFailed(true);
                    return;
                }

                if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(
                        BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
                        MAX_RECONNECT_DELAY
                    );
                    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${MAX_RECONNECT_ATTEMPTS})`);
                    reconnectAttemptsRef.current += 1;
                    reconnectTimeoutRef.current = window.setTimeout(() => {
                        const fn = connectRef.current;
                        if (fn) fn();
                    }, delay);
                } else {
                    console.warn('[WebSocket] Max reconnect attempts reached');
                    setConnectionFailed(true);
                }
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('[WebSocket] Failed to create connection:', error);
            setConnectionFailed(true);
        }
    }, [sessionId, wsPath, fallbackToken]);

    useEffect(() => {
        connectRef.current = connect;
    }, [connect]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        if (wsRef.current) {
            intentionalCloseRef.current = true;
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const sendMessage = useCallback((message: Record<string, unknown>) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('[WebSocket] Cannot send — not connected');
        }
    }, []);

    // Heartbeat logic to ensure connection is actually alive
    useEffect(() => {
        if (!isConnected) return;

        let pongReceived = true;
        const pingInterval = window.setInterval(() => {
            if (!pongReceived) {
                console.warn('[WebSocket] Heartbeat timeout. Closing stale connection.');
                if (wsRef.current) wsRef.current.close(4000, 'Heartbeat timeout');
                return;
            }
            pongReceived = false;
            sendMessage({ type: 'ping' });
        }, 15000);

        const handlePong = (msg: WebSocketMessage) => {
            if (msg.type === 'pong') {
                pongReceived = true;
            }
        };
        
        listenersRef.current.add(handlePong);
        return () => {
            clearInterval(pingInterval);
            listenersRef.current.delete(handlePong);
        };
    }, [isConnected, sendMessage]);

    const onMessage = useCallback((listener: (msg: WebSocketMessage) => void) => {
        listenersRef.current.add(listener);
        return () => { listenersRef.current.delete(listener); };
    }, []);

    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        setConnectionFailed(false);
        connect();
    }, [connect]);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    return { isConnected, connectionFailed, sendMessage, onMessage, reconnect };
}

// ── Context Provider ──
const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const WebSocketProvider: React.FC<{ sessionId: number | null; children: React.ReactNode }> = ({ sessionId, children }) => {
    const roomToken = useSessionStore(s => s.roomToken);
    const value = useWebSocketConnection(sessionId, '/api/ws/session', roomToken);

    return (
        <WebSocketContext.Provider value={value}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocketContext = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocketContext must be used within a WebSocketProvider');
    }
    return context;
};

// ── Standalone Hook (for pages that don't use the Provider) ──
export function useWebSocket(sessionId: number | null) {
    return useWebSocketConnection(sessionId, '/api/ws/session');
}

// ── Live Monitoring Hook (for recruiter session monitoring) ──
export function useLiveMonitoring(sessionId: number | null) {
    const roomToken = useSessionStore(s => s.roomToken);
    const { isConnected, sendMessage, onMessage, connectionFailed, reconnect } = useWebSocketConnection(sessionId, '/api/ws/session', roomToken);

    const [metrics, setMetrics] = useState<Record<string, unknown> | null>(null);

    useEffect(() => {
        const unsubscribe = onMessage((message) => {
            if (message.type === 'metrics_update') {
                setMetrics(message.data);
            }
        });
        return unsubscribe;
    }, [onMessage]);

    // Request metrics periodically with a ping
    useEffect(() => {
        if (!isConnected) return;

        const interval = window.setInterval(() => {
            sendMessage({ type: 'request_metrics' });
        }, 30000);

        // Request once immediately
        sendMessage({ type: 'request_metrics' });

        return () => clearInterval(interval);
    }, [isConnected, sendMessage]);

    return { isConnected, metrics, requestMetrics: () => sendMessage({ type: 'request_metrics' }), flags: [] as string[], connectionFailed, reconnect, onMessage };
}
