import { MessageBody, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class ChatGateway {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('chat:send')
  handleMessage(@MessageBody() payload: { conversationId: string; body: string; senderName: string }) {
    this.server.to(payload.conversationId).emit('chat:new-message', payload);
    return payload;
  }
}
