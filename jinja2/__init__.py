class Template:
    def __init__(self, text):
        self.text = text
    def render(self, **kwargs):
        return self.text
