from io import StringIO
import contextlib

class CliRunner:
    def invoke(self, app, args):
        cmd = args[0]
        kwargs = {}
        key = None
        for arg in args[1:]:
            if arg.startswith("--"):
                key = arg[2:]
            else:
                if key:
                    kwargs[key.replace('-', '_')] = int(arg) if arg.isdigit() else arg
        func = app.commands[cmd]
        buf = StringIO()
        with contextlib.redirect_stdout(buf):
            func(**kwargs)
        class Res:
            output = buf.getvalue()
        return Res()
