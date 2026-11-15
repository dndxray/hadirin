"""Use local Expo :8097 and seed-restored-navigation.mjs; never production data."""
import os
from urllib.parse import urlsplit
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
        expect(text('Penambangan Data')).to_be_visible()
        expect(text('Daftar Mata Kuliah')).to_be_visible()
        expect(text('1 kelas terdaftar')).to_be_visible()
        expect(text('Izin')).to_have_count(0)
        expect(text('Terjadi kesalahan')).to_have_count(0)
        page.screenshot(path=str(OUTPUT / 'restored-home-phone.png'), full_page=True)
        text('Penambangan Data').click()
        expect(page).to_have_url(f'{BASE}/detail-sesi?id=penambangan-data')
        for label in ['Sesi Praktikum B', 'Mulai', 'Selesai', '10.20', '12.10', 'Fadhil', 'Cesar', 'Sesi Belum Tersedia']:
            expect(text(label)).to_be_visible()
        page.screenshot(path=str(OUTPUT / 'restored-detail-phone.png'), full_page=True)
        page.get_by_role('button', name='Ajukan Izin', exact=True).click()
        expect(text('Pengajuan izin')).to_be_visible()
        assert urlsplit(page.url).path == '/izin'
        expect(page.get_by_label('Alasan ketidakhadiran', exact=True)).to_be_visible()
        page.get_by_role('button', name='Kembali ke sesi', exact=True).click()
        expect(text('Sesi Praktikum B')).to_be_visible()
        page.goto(f'{BASE}/explore', wait_until='domcontentloaded')
        expect(text('0')).to_be_visible()
        for label in ['Riwayat Kehadiran', '—', 'Tingkat Kehadiran', '0', 'Total Hadir', 'Belum ada presensi', 'Lihat Sesi']:
            expect(text(label)).to_be_visible()
        expect(text('Izin')).to_have_count(0)
        expect(text('Terjadi kesalahan')).to_have_count(0)
        expect(page.get_by_text('Akses ditolak.', exact=False).and_(page.locator(':visible'))).to_have_count(0)
        page.screenshot(path=str(OUTPUT / 'restored-history-phone.png'), full_page=True)
        page.set_viewport_size({'width': 1280, 'height': 900})
        page.screenshot(path=str(OUTPUT / 'restored-history-desktop.png'), full_page=True)
        assert not errors, errors
        print('RESTORED_UI_OK: original class Home/detail, original percentage history, no Izin tab, original permission form accessible from detail, sessions-denied regression')
    finally:
        page.screenshot(path=str(OUTPUT / 'last-restored-test.png'), full_page=True)
        browser.close()
