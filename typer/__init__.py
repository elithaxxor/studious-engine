class Typer:
    def __init__(self):
        self.commands = {}

    def command(self, name=None):
        def decorator(func):
            cmd_name = name or func.__name__.replace('_', '-')
            self.commands[cmd_name] = func
            return func
        return decorator

    def __call__(self):
        pass


def echo(text: str):
    print(text)
