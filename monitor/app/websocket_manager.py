class WebSocketManager:
  def __init__(self):
    self.connections = []
  def connect(self, websocket):
    self.connections.append(websocket)
  def disconnect(self, websocket):
    self.connections.remove(websocket)

  async def broadcast(self, data):
    for websocket in self.connections:
      await websocket.send_json(data)

manager = WebSocketManager()