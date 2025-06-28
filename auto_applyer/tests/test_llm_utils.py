from auto_applyer.core.llm_utils import extract_keywords


def test_extract_keywords(monkeypatch):
    calls = {}

    class Dummy:
        @staticmethod
        def create(model, messages):
            calls['prompt'] = messages[0]['content']
            return type('resp', (), {'choices': [type('c', (), {'message': {'content': 'python, automation'}})]})

    monkeypatch.setattr('openai.ChatCompletion', Dummy)
    result = extract_keywords('Looking for python developers with automation experience')
    assert result == ['python', 'automation']
    assert 'Looking for python developers' in calls['prompt']
