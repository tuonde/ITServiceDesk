import * as signalR from '@microsoft/signalr';
import type { TicketResponseDto } from '../types/ticket';

class SignalRService {
    private connection: signalR.HubConnection | null = null;
    private callbacks: { [event: string]: Function[] } = {};

    public startConnection(token: string) {
        if (this.connection) {
            return;
        }

        this.connection = new signalR.HubConnectionBuilder()
            .withUrl('http://localhost:5014/ticketHub', {
                accessTokenFactory: () => token,
                skipNegotiation: true,
                transport: signalR.HttpTransportType.WebSockets
            })
            .withAutomaticReconnect()
            .build();

        this.connection.on('TicketCreated', (ticket: TicketResponseDto) => {
            this.trigger('TicketCreated', ticket);
        });

        this.connection.on('TicketUpdated', (ticket: TicketResponseDto) => {
            this.trigger('TicketUpdated', ticket);
        });

        this.connection.start()
            .then(() => console.log('SignalR Connected'))
            .catch(err => console.error('SignalR Connection Error: ', err));
    }

    public stopConnection() {
        if (this.connection) {
            this.connection.stop();
            this.connection = null;
        }
    }

    public on(eventName: string, callback: Function) {
        if (!this.callbacks[eventName]) {
            this.callbacks[eventName] = [];
        }
        this.callbacks[eventName].push(callback);
    }

    public off(eventName: string, callback: Function) {
        if (this.callbacks[eventName]) {
            this.callbacks[eventName] = this.callbacks[eventName].filter(cb => cb !== callback);
        }
    }

    private trigger(eventName: string, data: any) {
        if (this.callbacks[eventName]) {
            this.callbacks[eventName].forEach(cb => cb(data));
        }
    }
}

export const signalrService = new SignalRService();
