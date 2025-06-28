class AsyncClient:
    def __init__(self, *args, **kwargs):
        pass
    async def __aenter__(self):
        return self
    async def __aexit__(self, exc_type, exc, tb):
        pass
    async def get(self, url):
        class Response:
            def raise_for_status(self):
                pass
            def json(self):
                return {"extract": f"Summary for {url}"}
        return Response()
