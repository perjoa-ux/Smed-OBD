#!/usr/bin/env python3
"""Bounded static REA analysis. Does not execute or install target code."""
import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 20 * 1024 * 1024


def validate(request, root=ROOT):
    if request.get('authorized') is not True or request.get('public_ok') is not True:
        raise ValueError('Bekreft authorized og public_ok: denne GitHub-grenen er offentlig.')
    relative = Path(request.get('target', ''))
    if relative.is_absolute() or '..' in relative.parts or not relative.parts or relative.parts[0] != 'targets':
        raise ValueError('Målet må være en mappe under targets/.')
    current = root
    for part in relative.parts:
        current = current / part
        if current.is_symlink():
            raise ValueError('Symbolske lenker er ikke tillatt.')
    target = current.resolve()
    if not target.is_relative_to((root / 'targets').resolve()) or not target.is_dir():
        raise ValueError('Målmappen finnes ikke under targets/.')
    files = []
    size = 0
    for path in sorted(target.rglob('*')):
        if path.is_symlink():
            raise ValueError('Symbolske lenker er ikke tillatt.')
        if path.is_file():
            if any(p in {'.git', 'node_modules'} for p in path.relative_to(target).parts):
                raise ValueError('Fjern .git og node_modules fra målet.')
            size += path.stat().st_size
            files.append(path)
            if len(files) > 1000 or size > LIMIT:
                raise ValueError('Maksimalt 1000 filer og 20 MiB per analyse.')
    if not any(p.suffix in {'.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx'} for p in files):
        raise ValueError('Denne versjonen analyserer JavaScript/TypeScript-applikasjoner.')
    question = request.get('question', '')
    if not isinstance(question, str) or not 1 <= len(question) <= 2000:
        raise ValueError('Spørsmålet må være 1–2000 tegn.')
    return target, files


def render(out, meta):
    status = 'FULLFØRT' if meta['exit_code'] == 0 else 'FEILET'
    body = '\n'.join([
        '# Smed Analyseverksted', '', f'**Status: {status}**', '',
        f"Tidspunkt: {meta['created_at']}", f"Kildecommit: {meta['commit']}",
        f"Mål: {meta.get('target', 'ikke validert')}", '',
        '## Spørsmål', meta.get('question', ''), '',
        '## Hva rapporten viser',
        'REA utfører statisk analyse av filene. Målprogrammet blir ikke startet.',
        'analysis.json inneholder verktøyets råresultat; manifest.json identifiserer filene med SHA-256.',
        'En vellykket kjøring beviser ikke at alle funksjoner er forstått eller virker i praksis.',
        'Spørsmålet lagres som kontekst for Smed; denne jobben bruker ingen betalt AI-API.', '',
        '## Neste steg',
        'Be Smed lese rapporten og svare med funn, kildehenvisninger til filer og ubesvarte spørsmål.', '',
        '## Filer', '- analysis.json', '- analysis.stderr', '- manifest.json', '- result.json', '',
        '## Feil', meta.get('error', '') or 'Ingen registrert kjøringsfeil.',
    ])
    (out / 'REPORT.md').write_text(body, encoding='utf-8')
    page = '<!doctype html><html lang="nb"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Smed Analyseverksted</title><style>body{font:17px system-ui;max-width:850px;margin:24px auto;padding:16px;background:#101923;color:#ecf1f7}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#7dd3fc}</style><h1>Smed Analyseverksted</h1><pre>' + html.escape(body) + '</pre><p><a href="analysis.json">Råanalyse</a> · <a href="manifest.json">Filoversikt</a></p></html>'
    (out / 'report.html').write_text(page, encoding='utf-8')
    (out / 'result.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
    summary = os.environ.get('GITHUB_STEP_SUMMARY')
    if summary:
        with open(summary, 'a', encoding='utf-8') as stream:
            stream.write(body + '\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', required=True)
    parser.add_argument('--rea', default='rea')
    args = parser.parse_args()
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    meta = {'created_at': datetime.now(timezone.utc).isoformat(), 'commit': os.environ.get('GITHUB_SHA', 'local'), 'tool': 'rea-agents@6.7.0', 'exit_code': 1}
    try:
        request = json.loads((ROOT / 'request.json').read_text(encoding='utf-8'))
        target, files = validate(request)
        meta.update(target=request['target'], question=request['question'], run_id=request.get('run_id', 'manual'))
        manifest = [{'path': str(p.relative_to(target)), 'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files]
        (out / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
        executable = shutil.which(args.rea)
        if not executable:
            raise RuntimeError('REA er ikke installert eller finnes ikke i PATH.')
        with tempfile.TemporaryDirectory(prefix='smed-static-') as temporary:
            isolated = Path(temporary) / 'target'
            shutil.copytree(target, isolated)
            with open(out / 'analysis.json', 'w') as stdout, open(out / 'analysis.stderr', 'w') as stderr:
                process = subprocess.Popen([executable, 'analyze-javascript-application', str(isolated), '--json', '--full-output'], cwd=temporary, stdout=stdout, stderr=stderr, start_new_session=True)
                try:
                    meta['exit_code'] = process.wait(timeout=240)
                except subprocess.TimeoutExpired:
                    import signal
                    os.killpg(process.pid, signal.SIGKILL)
                    process.wait()
                    raise RuntimeError('Analyse avbrutt etter 240 sekunder.')
        if meta['exit_code'] == 0:
            data = json.loads((out / 'analysis.json').read_text())
            if not data or (isinstance(data, dict) and (data.get('ok') is False or data.get('isError') is True or data.get('success') is False)):
                raise RuntimeError('REA returnerte et tomt resultat eller en feil.')
        else:
            meta['error'] = 'REA feilet. Se analysis.stderr og analysis.json.'
    except Exception as error:
        meta['exit_code'] = 1
        meta['error'] = str(error)
    render(out, meta)
    print(json.dumps(meta, ensure_ascii=False))
    return 0 if meta['exit_code'] == 0 else 1


if __name__ == '__main__':
    sys.exit(main())
