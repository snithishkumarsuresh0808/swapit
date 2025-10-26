import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()


class CallConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f'call_{self.user_id}'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'call-offer':
            # Forward call offer to the recipient
            recipient_id = data.get('recipient_id')
            await self.channel_layer.group_send(
                f'call_{recipient_id}',
                {
                    'type': 'call_offer',
                    'offer': data.get('offer'),
                    'caller_id': self.user_id,
                    'caller_name': data.get('caller_name'),
                }
            )
        elif message_type == 'call-answer':
            # Forward call answer to the caller
            caller_id = data.get('caller_id')
            await self.channel_layer.group_send(
                f'call_{caller_id}',
                {
                    'type': 'call_answer',
                    'answer': data.get('answer'),
                }
            )
        elif message_type == 'ice-candidate':
            # Forward ICE candidate to the peer
            peer_id = data.get('peer_id')
            await self.channel_layer.group_send(
                f'call_{peer_id}',
                {
                    'type': 'ice_candidate',
                    'candidate': data.get('candidate'),
                }
            )
        elif message_type == 'call-end':
            # Notify peer that call ended
            peer_id = data.get('peer_id')
            await self.channel_layer.group_send(
                f'call_{peer_id}',
                {
                    'type': 'call_end',
                }
            )

    # Receive call offer from room group
    async def call_offer(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call-offer',
            'offer': event['offer'],
            'caller_id': event['caller_id'],
            'caller_name': event['caller_name'],
        }))

    # Receive call answer from room group
    async def call_answer(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call-answer',
            'answer': event['answer'],
        }))

    # Receive ICE candidate from room group
    async def ice_candidate(self, event):
        await self.send(text_data=json.dumps({
            'type': 'ice-candidate',
            'candidate': event['candidate'],
        }))

    # Receive call end notification from room group
    async def call_end(self, event):
        await self.send(text_data=json.dumps({
            'type': 'call-end',
        }))
