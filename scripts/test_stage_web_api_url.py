import unittest
from stage_web_api_url import stage_command


class StageWebApiUrlTests(unittest.TestCase):
    def test_only_non_secret_url_is_updated_and_no_rollout_is_started(self):
        command = stage_command({'env': {'AVITUS_API_URL': 'http://avitus-materia-api.internal:4000',
                                         'PUBLIC_INQUIRY_API_KEY': 'must-not-copy'}}, 'avitus-materia-web')
        self.assertEqual(command, ['flyctl', 'secrets', 'set', '--stage', '-a', 'avitus-materia-web',
                                   'AVITUS_API_URL=http://avitus-materia-api.internal:4000'])

    def test_missing_or_unapproved_destination_is_rejected(self):
        for url in [None, 'https://other.invalid', 'http://avitus-materia-api.internal:4000/path']:
            with self.assertRaises(ValueError):
                stage_command({'env': {'AVITUS_API_URL': url}}, 'avitus-materia-web')
        with self.assertRaises(ValueError):
            stage_command({'env': {'AVITUS_API_URL': 'http://avitus-materia-api.internal:4000'}}, 'other-app')
