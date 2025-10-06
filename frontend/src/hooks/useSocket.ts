'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

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
  const {
    autoConnect = true,
    serverUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000',
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const isConnectedRef = useRef(false);

  const connect = () => {
    if (!socketRef.current) {
      socketRef.current = io(serverUrl, {
        autoConnect: false,
        transports: ['websocket', 'polling'],
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
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      isConnectedRef.current = false;
    }
  };

  useEffect(() => {
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
  }, [autoConnect, serverUrl]);

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
