import ws from 'ws'

const wsProvider = new WebsocketProvider(
  'ws://localhost:1234', 'my-roomname',
  doc,
  { WebSocketPolyfill: ws }
)