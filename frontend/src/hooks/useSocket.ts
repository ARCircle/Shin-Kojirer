'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { useRuntimeConfig } from '@/providers/RuntimeConfigProvider';

interface UseSocketOptions {
  autoConnect?: boolean;
  serverUrl?: string;
}

interface UseSocketReturn {
  socket: Socket | null;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}

export function useSocket(options: UseSocketOptions = {}): UseSocketReturn {
  const { config, loading: configLoading } = useRuntimeConfig();
  const { autoConnect = true, serverUrl = config.backendUrl } = options;

  const connectionSettings = useMemo(() => {
    try {
      const url = new URL(serverUrl);
      const origin = `${url.protocol}//${url.host}`;
      const basePath = url.pathname.replace(/\/+$/, '');
      const socketPath = `${basePath || ''}/socket.io`;
      return {
        origin,
        path: socketPath.startsWith('/') ? socketPath : `/${socketPath}`,
      };
    } catch {
      return {
        origin: serverUrl,
        path: '/socket.io',
      };
    }
  }, [serverUrl]);

  const { origin: socketOrigin, path: socketPath } = connectionSettings;

  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    if (configLoading) {
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(socketOrigin, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
        path: socketPath,
      });

      socketRef.current.on('connect', () => {
        isConnectedRef.current = true;
        console.log('WebSocket connected');
      });

      socketRef.current.on('disconnect', () => {
        isConnectedRef.current = false;
        console.log('WebSocket disconnected');
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
      });
    }

    if (!socketRef.current.connected) {
      socketRef.current.connect();
    }
  }, [socketOrigin, socketPath, configLoading]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      isConnectedRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (configLoading) {
      return;
    }

    if (autoConnect) {
      connect();
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.removeAllListeners();
        socketRef.current.disconnect();
        socketRef.current = null;
        isConnectedRef.current = false;
      }
    };
  }, [autoConnect, socketOrigin, socketPath, configLoading, connect]);

  return {
    socket: socketRef.current,
    connect,
    disconnect,
    isConnected: isConnectedRef.current,
  };
}

// 注文状況ページ用のカスタムフック
export function useOrderSocket(orderId: string) {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected && orderId) {
      // 注文の更新を購読
      socket.emit('subscribe-order', orderId);

      return () => {
        // 購読を解除
        socket.emit('unsubscribe-order', orderId);
      };
    }
  }, [socket, isConnected, orderId]);

  return { socket, isConnected };
}

// キッチンディスプレイ用のカスタムフック
export function useKitchenSocket() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected) {
      // キッチンの更新を購読
      socket.emit('subscribe-kitchen');

      return () => {
        // 購読を解除
        socket.emit('unsubscribe-kitchen');
      };
    }
  }, [socket, isConnected]);

  return { socket, isConnected };
}

// 支払い画面用のカスタムフック
export function usePaymentSocket() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket && isConnected) {
      // 支払い画面の更新を購読
      socket.emit('subscribe-payment');

      return () => {
        // 購読を解除
        socket.emit('unsubscribe-payment');
      };
    }
  }, [socket, isConnected]);

  return { socket, isConnected };
}
