"""Two account sessions: legacy NIM onboarding -> assistant enrollment -> real attendance."""
import os
from uuid import uuid4
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

BASE = 'http://127.0.0.1:8097'
OUTPUT = Path('.impeccable/review')
OUTPUT.mkdir(parents=True, exist_ok=True)

with sync_playwright() as playwright:
    options = {'headless': True}
    chrome = os.environ.get('CHROME_PATH', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    if Path(chrome).exists():
        options['executable_path'] = chrome
    browser = playwright.chromium.launch(**options)
    practitioner = browser.new_page(viewport={'width': 390, 'height': 844})
    assistant = browser.new_page(viewport={'width': 1280, 'height': 900})
    expect.set_options(timeout=30000)
    errors = []
    for page in [practitioner, assistant]:
        page.set_default_timeout(30000)
        page.on('pageerror', lambda error: errors.append(str(error)))

    def text(page, value):
        return page.get_by_text(value, exact=True).and_(page.locator(':visible'))

    def login(page, email):
        page.goto(BASE, wait_until='networkidle', timeout=120000)
        page.get_by_placeholder('nama@email.com').fill(email)
        page.get_by_placeholder('Kata sandi', exact=True).fill('test-pass-123')
        page.get_by_role('button', name='Masuk', exact=True).click()

    try:
        login(practitioner, 'caesar@example.test')
        practitioner.goto(f'{BASE}/profil', wait_until='domcontentloaded')
        expect(text(practitioner, 'Lengkapi NIM')).to_be_visible()
        practitioner.get_by_label('NIM', exact=True).fill('123456789')
        practitioner.get_by_role('button', name='Simpan NIM', exact=True).click()
        expect(text(practitioner, '123456789')).to_be_visible()
        expect(practitioner.get_by_role('button', name='Simpan NIM', exact=True)).to_have_count(0)
        practitioner.screenshot(path=str(OUTPUT / 'nim-profile-phone.png'), full_page=True)
        practitioner.goto(f'{BASE}/detail-sesi?id=penambangan-data', wait_until='domcontentloaded')
        expect(text(practitioner, 'Belum terdaftar pada sesi kelas ini. Minta asisten menambahkan NIM akunmu ke sesi.')).to_be_visible()

        login(assistant, 'fadhil@example.test')
        assistant.goto(f'{BASE}/sessions/legacy-session', wait_until='domcontentloaded')
        expect(text(assistant, 'Peserta sesi')).to_be_visible()
        assistant.get_by_label('NIM peserta', exact=True).fill('123456789')
        assistant.get_by_role('button', name='Cari praktikan', exact=True).click()
        expect(text(assistant, 'NIM: 123456789')).to_be_visible()
        expect(text(assistant, 'caesar@example.test')).to_be_visible()
        assistant.get_by_role('button', name='Tambahkan ke sesi', exact=True).click()
        expect(assistant.get_by_role('button', name='Sudah terdaftar', exact=True)).to_be_disabled()
        assistant.screenshot(path=str(OUTPUT / 'nim-enrollment-desktop.png'), full_page=True)

        # The practitioner receives session membership without reloading.
        expect(practitioner.get_by_role('button', name='Isi Presensi', exact=True)).to_be_enabled()
        expect(text(practitioner, 'Sesi sedang dibuka')).to_be_visible()
        practitioner.get_by_role('button', name='Isi Presensi', exact=True).click()
        practitioner.get_by_role('button', name='Ya, Presensi Sekarang', exact=True).click()
        expect(text(practitioner, 'Presensi Berhasil!')).to_be_visible()
        text(practitioner, 'Lihat Riwayat').click()
        expect(text(practitioner, 'Hadir')).to_be_visible()
        expect(text(assistant, '1 praktikan sudah hadir')).to_be_visible()
        expect(text(assistant, '123456789')).to_be_visible()
        practitioner.reload(wait_until='domcontentloaded')
        expect(text(practitioner, 'Hadir')).to_be_visible()
        practitioner.goto(f'{BASE}/detail-sesi?id=penambangan-data', wait_until='domcontentloaded')
        expect(practitioner.get_by_role('button', name='Presensi Tercatat', exact=True)).to_be_disabled()
        practitioner.screenshot(path=str(OUTPUT / 'nim-real-attendance-phone.png'), full_page=True)
        new_account = browser.new_page(viewport={'width': 390, 'height': 844})
        new_account.on('pageerror', lambda error: errors.append(str(error)))
        new_account.goto(BASE, wait_until='networkidle')
        new_account.get_by_text('Daftar', exact=True).click()
        new_account.get_by_label('Nama Lengkap', exact=True).fill('Praktikan Baru')
        new_account.get_by_label('Email', exact=True).fill(f'nim-{uuid4().hex[:10]}@example.test')
        new_account.get_by_label('Kata sandi', exact=True).fill('test-pass-123')
        new_account.get_by_role('button', name='Daftar', exact=True).click()
        expect(new_account.get_by_text('NIM wajib diisi', exact=False)).to_be_visible()
        new_account.get_by_label('NIM', exact=True).fill('987654321')
        new_account.get_by_role('button', name='Daftar', exact=True).click()
        expect(text(new_account, '1 kelas terdaftar')).to_be_visible()
        new_account.goto(f'{BASE}/profil', wait_until='domcontentloaded')
        expect(text(new_account, '987654321')).to_be_visible()
        new_account.reload(wait_until='domcontentloaded')
        expect(text(new_account, '987654321')).to_be_visible()
        assert not errors, errors
        print('NIM_UI_OK: legacy profile NIM, assistant lookup/confirmation, missing participantIds repaired, realtime membership/recap, real attendance and duplicate prevention')
    finally:
        if 'new_account' in locals():
            new_account.screenshot(path=str(OUTPUT / 'last-nim-registration.png'), full_page=True)
        practitioner.screenshot(path=str(OUTPUT / 'last-nim-practitioner.png'), full_page=True)
        assistant.screenshot(path=str(OUTPUT / 'last-nim-assistant.png'), full_page=True)
        browser.close()
