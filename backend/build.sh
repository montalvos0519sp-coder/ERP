#!/usr/bin/env bash
# Render lo ejecuta en cada deploy. Falla rapido si algo sale mal.
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate --no-input
