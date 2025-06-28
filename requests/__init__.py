def get(url, timeout=5):
    class Response:
        def raise_for_status(self):
            pass
        def json(self):
            return {"extract": f"Summary for {url}"}
    return Response()
