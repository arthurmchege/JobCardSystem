class WebSocketManager:
  def __init__(self):
    self.connections = []
  def connect(self, websocket):
    self.connections.append(websocket)
  def disconnect(self, websocket):
    self.connections.remove(websocket)

  async def broadcast(self, data):
    for websocket in self.connections:
      try:
          await websocket.send_json(data)
      except Exception:
          dead_connections.append(websocket)

    for websocket in dead_connections:
      self.connections.remove(websocket)

manager = WebSocketManager()