"""Permission-screen UI checks using local demo emulators only (:8097)."""
import os
import subprocess
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

BASE = 'http://127.0.0.1:8097'
OUTPUT = Path('.impeccable/review')
OUTPUT.mkdir(parents=True, exist_ok=True)


def fixture(operation):
    subprocess.run(['node', 'tests/history-fixture.mjs', operation], check=True, timeout=60)


fixture('seed')
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

    def open_permission():
        expect(text('1 kelas terdaftar')).to_be_visible()
        text('Penambangan Data').click()
        expect(text('Sesi Praktikum B')).to_be_visible()
        page.get_by_role('button', name='Ajukan Izin', exact=True).click()
        expect(text('Pengajuan izin')).to_be_visible()
        expect(page.get_by_role('radio', name='Penambangan Data', exact=False)).to_be_enabled()

    try:
        page.goto(BASE, wait_until='networkidle', timeout=120000)
        page.get_by_placeholder('nama@email.com').fill('caesar@example.test')
        page.get_by_placeholder('Kata sandi', exact=True).fill('test-pass-123')
        text('Masuk').click()
        open_permission()
        page.screenshot(path=str(OUTPUT / ('permission-before-phone.png' if '--inspect' in sys.argv else 'permission-refined-phone.png')), full_page=True)
        if '--inspect' in sys.argv:
            print('PERMISSION_BASELINE_CAPTURED')
            sys.exit(0)

        back = page.get_by_role('button', name='Kembali ke sesi', exact=True)
        expect(back).to_be_visible()
        assert back.bounding_box()['height'] >= 44
        expect(text('Pengajuan izin')).to_have_css('color', 'rgb(255, 255, 255)')
        back.click()
        expect(text('Sesi Praktikum B')).to_be_visible()
        page.get_by_role('button', name='Ajukan Izin', exact=True).click()
        choice = page.get_by_role('radio', name='Penambangan Data', exact=False)
        choice.click()
        expect(choice).to_be_checked()
        expect(page.get_by_role('radio', name='Basis Data', exact=False)).to_have_count(0)
        reason = page.get_by_label('Alasan ketidakhadiran', exact=True)
        reason.fill('sakit')
        page.get_by_role('button', name='Kirim pengajuan izin', exact=True).click()
        expect(page.get_by_role('alert')).to_be_visible()
        reason.fill('Saya sedang sakit dan perlu beristirahat sesuai anjuran dokter. ' * 16)
        assert len(reason.input_value()) <= 1000
        page.screenshot(path=str(OUTPUT / 'permission-long-reason.png'), full_page=True)
        reason.fill('Saya sedang sakit dan perlu beristirahat sesuai anjuran dokter.')
        page.screenshot(path=str(OUTPUT / 'permission-refined-phone.png'), full_page=True)
        for width, height in [(320, 740), (768, 1024), (1280, 900), (844, 390)]:
            page.set_viewport_size({'width': width, 'height': height})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), width
            page.screenshot(path=str(OUTPUT / f'permission-refined-{width}.png'), full_page=True)
        page.emulate_media(color_scheme='dark')
        expect(text('Pengajuan izin')).to_have_css('color', 'rgb(255, 255, 255)')
        page.set_viewport_size({'width': 390, 'height': 844})
        page.get_by_role('button', name='Kirim pengajuan izin', exact=True).click()
        expect(text('Izin berhasil diajukan')).to_be_visible()
        # Wait for the Modal fade to finish, not just its first visible frame.
        page.wait_for_function("""() => {
            const modal = document.querySelector('[aria-modal="true"]');
            if (!modal) return false;
            for (let node = modal; node; node = node.parentElement) {
                if (Number(getComputedStyle(node).opacity) < 1) return false;
            }
            return true;
        }""")
        page.screenshot(path=str(OUTPUT / 'permission-success-phone.png'), full_page=True)
        page.set_viewport_size({'width': 844, 'height': 390})
        page.get_by_role('button', name='Tutup', exact=True).scroll_into_view_if_needed()
        page.screenshot(path=str(OUTPUT / 'permission-success-landscape.png'), full_page=True)
        page.get_by_role('button', name='Tutup', exact=True).click()
        expect(text('Izin berhasil diajukan')).not_to_be_visible()
        page.set_viewport_size({'width': 390, 'height': 844})
        expect(text('Tidak ada sesi yang dapat diajukan')).to_be_visible()
        expect(page.get_by_role('button', name='Kirim pengajuan izin', exact=True)).to_be_disabled()
        page.screenshot(path=str(OUTPUT / 'permission-empty-phone.png'), full_page=True)
        page.reload(wait_until='domcontentloaded')
        expect(text('Tidak ada sesi yang dapat diajukan')).to_be_visible()
        page.get_by_role('button', name='Kembali ke sesi', exact=True).click()
        expect(text('1 kelas terdaftar')).to_be_visible()
        page.goto(f'{BASE}/izin', wait_until='domcontentloaded')
        expect(page.get_by_role('radio', name='Basis Data', exact=False)).to_be_enabled()
        fixture('deny-sessions')
        page.reload(wait_until='domcontentloaded')
        expect(page.get_by_text('Gagal memuat sesi.', exact=False).and_(page.locator(':visible'))).to_be_visible()
        expect(page.get_by_role('button', name='Kirim pengajuan izin', exact=True)).to_be_disabled()
        page.screenshot(path=str(OUTPUT / 'permission-error-phone.png'), full_page=True)
        fixture('restore-rules')
        page.get_by_role('button', name='Coba lagi', exact=True).click()
        expect(page.get_by_role('radio', name='Basis Data', exact=False)).to_be_enabled()
        assert not errors, errors
        print('PERMISSION_UI_OK: back and fallback, contextual selection, validation, submit, success/empty/error/retry, responsive layout')
    finally:
        page.screenshot(path=str(OUTPUT / 'last-permission-ui.png'), full_page=True)
        fixture('restore-rules')
        browser.close()
