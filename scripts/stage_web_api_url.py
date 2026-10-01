"""Stage only the non-secret API location before the normal rolling web deploy."""
import json
import os
import subprocess
import tomllib
from pathlib import Path


def stage_command(config, app):
    url = config.get('env', {}).get('AVITUS_API_URL')
    if app != 'avitus-materia-web' or url != 'http://avitus-materia-api.internal:4000':
        raise ValueError('Unapproved deployment target')
    return ['flyctl', 'secrets', 'set', '--stage', '-a', app, 'AVITUS_API_URL=' + url]


def main():
    try:
        config = tomllib.loads(Path('fly.web.toml').read_text())
        subprocess.run(stage_command(config, os.environ.get('FLY_WEB_APP')), check=True,
                       capture_output=True, timeout=60)
        print(json.dumps({'event': 'web.api_url_staged', 'origin_kind': 'fly_private'}))
        return 0
    except (ValueError, OSError, subprocess.SubprocessError):
        print(json.dumps({'event': 'web.api_url_stage_failed'}))
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
