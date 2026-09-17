#!/usr/bin/env python3
"""Проставляет в index.html свежие номера версий для styles.css и app.js.

Без этого браузер берёт разметку новую, а стили и скрипт — старые, из кэша:
правки как будто не применяются. Номер версии — время последней правки
самого файла, так что запускать можно сколько угодно раз: пока файл не
менялся, адрес остаётся прежним и кэш работает как надо.

Запуск: python3 bump.py
"""
import pathlib
import re

here = pathlib.Path(__file__).resolve().parent
page = here / 'index.html'
html = page.read_text(encoding='utf-8')

for name in ('styles.css', 'app.js'):
    stamp = int((here / name).stat().st_mtime)
    html, hits = re.subn(
        re.escape(name) + r'\?v=\d+',
        f'{name}?v={stamp}',
        html,
    )
    if not hits:
        raise SystemExit(f'в index.html нет ссылки на {name}?v=…')
    print(f'{name} -> ?v={stamp}')

page.write_text(html, encoding='utf-8')
