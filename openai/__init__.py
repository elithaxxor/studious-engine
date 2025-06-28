class ChatCompletion:
    @staticmethod
    def create(model, messages):
        return type('resp', (), {'choices': [type('c', (), {'message': {'content': 'stub'}})]})
