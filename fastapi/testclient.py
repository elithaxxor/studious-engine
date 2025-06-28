class TestClient:
    def __init__(self, app):
        self.app = app

    def get(self, path, params=None):
        func = self.app.routes.get((path, 'GET'))
        if not func:
            raise ValueError('route not found')
        import asyncio
        result = asyncio.run(func(**(params or {})))
        class Resp:
            status_code = 200
            def json(self_inner):
                return result
        return Resp()
