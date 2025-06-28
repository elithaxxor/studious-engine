class FastAPI:
    def __init__(self):
        self.routes = {}
    def get(self, path):
        def decorator(func):
            self.routes[(path, 'GET')] = func
            return func
        return decorator

class HTTPException(Exception):
    def __init__(self, status_code, detail):
        self.status_code = status_code
        self.detail = detail
