"""Run against local demo emulators + Expo web on :8097; no production writes."""
import os
import subprocess
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

BASE = 'http://127.0.0.1:8097'
OUTPUT = Path('.impeccable/review')
OUTPUT.mkdir(parents=True, exist_ok=True)


def fixture(operation):
    subprocess.run(['node', 'tests/history-fixture.mjs', operation], check=True, timeout=60)


with sync_playwright() as playwright:
    options = {'headless': True}
    chrome = os.environ.get('CHROME_PATH', r'C:\Program Files\Google\Chrome\Application\chrome.exe')
    if Path(chrome).exists():
        options['executable_path'] = chrome
    browser = playwright.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 390, 'height': 844})
    page.set_default_timeout(30000)
    expect.set_options(timeout=30000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))

    def text(label):
        return page.get_by_text(label, exact=True).and_(page.locator(':visible'))

    try:
        page.goto(BASE, wait_until='networkidle', timeout=120000)
        page.get_by_placeholder('nama@email.com').fill('caesar@example.test')
        page.get_by_placeholder('Kata sandi', exact=True).fill('test-pass-123')
        text('Masuk').click()
        expect(text('1 kelas terdaftar')).to_be_visible()
        text('Penambangan Data').click()
        expect(text('Sesi Praktikum B')).to_be_visible()
        page.get_by_role('button', name='Ajukan Izin', exact=True).click()
        expect(text('Pengajuan izin')).to_be_visible()
        # The original form now restricts choices to the class opened in detail.
        expect(page.get_by_role('button', name='Basis Data', exact=False)).to_have_count(0)
        page.get_by_role('button', name='Penambangan Data', exact=False).click()
        page.get_by_label('Alasan ketidakhadiran', exact=True).fill('Saya sedang sakit dan perlu beristirahat sesuai anjuran dokter.')
        page.get_by_role('button', name='Kirim pengajuan izin', exact=True).click()
        expect(text('Izin berhasil diajukan')).to_be_visible()
        page.get_by_role('button', name='Lihat status izin', exact=True).click()
        expect(text('Riwayat Kehadiran')).to_be_visible()
        expect(text('Hadir')).to_be_visible()
        expect(text('Menunggu')).to_be_visible()
        expect(text('Tingkat Kehadiran')).to_be_visible()
        expect(text('Total Hadir')).to_be_visible()
        expect(text('Riwayat Kehadiran')).to_have_css('color', 'rgb(255, 255, 255)')
        fixture('decision')
        expect(text('Diterima')).to_be_visible()
        expect(text('Klasifikasi AI gagal. Izin tetap tersimpan dan dapat diperiksa asisten.')).to_be_visible()
        page.screenshot(path=str(OUTPUT / 'history-refined-phone.png'), full_page=True)
        page.get_by_role('button', name='Filter', exact=True).click()
        page.get_by_role('button', name='Penambangan Data', exact=True).click()
        expect(text('Hadir')).to_be_visible()
        page.set_viewport_size({'width': 320, 'height': 740})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUTPUT / 'history-refined-small-phone.png'), full_page=True)
        page.set_viewport_size({'width': 1280, 'height': 900})
        page.screenshot(path=str(OUTPUT / 'history-refined-desktop.png'), full_page=True)
        page.emulate_media(color_scheme='dark')
        expect(text('Riwayat Kehadiran')).to_have_css('color', 'rgb(255, 255, 255)')
        fixture('deny-sessions')
        page.goto(f'{BASE}/home', wait_until='domcontentloaded')
        expect(text('1 kelas terdaftar')).to_be_visible()
        page.goto(f'{BASE}/explore', wait_until='domcontentloaded')
        expect(text('Hadir')).to_be_visible()
        expect(text('—')).to_be_visible()
        fixture('deny-attendance')
        page.reload(wait_until='domcontentloaded')
        expect(page.get_by_text('Gagal memuat presensi.', exact=False).and_(page.locator(':visible'))).to_be_visible()
        expect(text('Belum ada presensi')).to_have_count(0)
        page.screenshot(path=str(OUTPUT / 'history-permission-error.png'), full_page=True)
        fixture('restore-rules')
        page.get_by_role('button', name='Coba lagi', exact=True).click()
        expect(text('Hadir')).to_be_visible()
        expect(text('Diterima')).to_be_visible()
        assert not errors, errors
        print('HISTORY_UI_OK: unchanged class Home/detail, contextual permission form, real history, realtime decision/AI failure, responsive UI, denied access and retry')
    finally:
        fixture('restore-rules')
        page.screenshot(path=str(OUTPUT / 'last-history-ui.png'), full_page=True)
        browser.close()
