"use client";

import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

export const useSocket = () => {
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Connect to backend. En producción define NEXT_PUBLIC_SOCKET_URL (o NEXT_PUBLIC_API_URL si usas la misma URL para todo).
        const socketUrl =
            process.env.NEXT_PUBLIC_SOCKET_URL ||
            process.env.NEXT_PUBLIC_API_URL ||
            "http://localhost:5000";

        if (!socket) {
            socket = io(socketUrl);
        }

        function onConnect() {
            setIsConnected(true);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        socket.on("connect", onConnect);
        socket.on("disconnect", onDisconnect);

        if (socket.connected) {
            setIsConnected(true);
        }

        return () => {
            socket.off("connect", onConnect);
            socket.off("disconnect", onDisconnect);
        };
    }, []);

    return { socket, isConnected };
};
