"""UI integration: disposable demo-hadirin emulators, never the team Firebase."""
import os
import subprocess
import sys
from pathlib import Path
from playwright.sync_api import expect, sync_playwright

BASE = 'http://127.0.0.1:8092'
OUTPUT = Path('.impeccable/review')
OUTPUT.mkdir(parents=True, exist_ok=True)
expect.set_options(timeout=30000)
sys.stdout.reconfigure(errors='backslashreplace')

def fixture(mode):
    subprocess.run(['node', 'tests/sprint-three-fixture.mjs', mode], check=True, timeout=60)

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, executable_path=os.environ.get('CHROME_PATH', r'C:\Program Files\Google\Chrome\Application\chrome.exe'))
    context = browser.new_context(viewport={'width': 390, 'height': 844}, permissions=['geolocation'],
        geolocation={'latitude': -7.05, 'longitude': 110.44, 'accuracy': 5})
    page = context.new_page()
    page.set_default_timeout(30000)
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    try:
        page.goto(f'{BASE}/login', wait_until='networkidle', timeout=180000)
        page.get_by_placeholder('nama@email.com').fill('s3-caesar@example.test')
        page.get_by_placeholder('Kata sandi', exact=True).fill('test-pass-123')
        page.get_by_text('Masuk', exact=True).and_(page.locator(':visible')).click()
        page.wait_for_url('**/home')
        # The existing detail must navigate, not write attendance itself.
        page.goto(f'{BASE}/detail-sesi?id=s3-live', wait_until='domcontentloaded')
        page.get_by_role('button', name='Buka halaman Presensi', exact=True).click()
        page.wait_for_url('**/presensi?sessionId=s3-live')
        expect(page.get_by_role('heading', name='Presensi Lokasi Sprint 3', exact=True)).to_be_visible()
        expect(page.get_by_role('radio')).to_have_count(0)
        primary = page.get_by_role('button', name='Presensi sekarang', exact=True)
        expect(primary).to_be_disabled()
        page.get_by_role('button', name='Periksa lokasi', exact=True).click()
        expect(page.get_by_text('Di dalam radius lab', exact=True)).to_be_visible()
        expect(primary).to_be_enabled()
        primary.scroll_into_view_if_needed()
        page.screenshot(path=str(OUTPUT / 'sprint3-presensi-phone.png'))
        for width in [320, 768, 1280]:
            page.set_viewport_size({'width': width, 'height': 900})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Horizontal overflow at {width}'
        page.screenshot(path=str(OUTPUT / 'sprint3-presensi-desktop.png'))
        page.set_viewport_size({'width': 390, 'height': 844})
        # Camera permissions are separate from GPS; a close action must work.
        page.get_by_role('button', name='Pindai QR dari asisten', exact=True).click()
        expect(page.get_by_text('Izin kamera diperlukan', exact=True)).to_be_visible()
        page.get_by_role('button', name='Tutup pemindai', exact=True).click()
        primary.click()
        page.get_by_role('button', name='Ya, Presensi Sekarang', exact=True).click()
        expect(page.get_by_text('Presensi Berhasil!', exact=True)).to_be_visible()
        page.get_by_role('dialog').get_by_role('button', name='Lihat Riwayat', exact=True).click()
        expect(page.get_by_text('Riwayat Kehadiran', exact=True)).to_be_visible()
        expect(page.get_by_text('Presensi Lokasi Sprint 3', exact=True).and_(page.locator(':not([aria-hidden="true"] *)')).last).to_be_visible()
        fixture('verify')
        page.goto(f'{BASE}/presensi?sessionId=s3-live', wait_until='domcontentloaded')
        expect(page.get_by_text('Presensi sudah tercatat', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Presensi sekarang', exact=True)).to_have_count(0)
        # A fresh page still reads persisted Firestore attendance.
        page.reload(wait_until='domcontentloaded')
        expect(page.get_by_text('Presensi sudah tercatat', exact=True)).to_be_visible()
        page.goto(f'{BASE}/presensi?sessionId=s3-outside', wait_until='domcontentloaded')
        page.get_by_role('button', name='Periksa lokasi', exact=True).click()
        expect(page.get_by_text('Di luar radius lab', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Presensi sekarang', exact=True)).to_be_disabled()
        page.get_by_role('button', name='Presensi sekarang', exact=True).scroll_into_view_if_needed()
        page.screenshot(path=str(OUTPUT / 'sprint3-outside-radius.png'))
        page.goto(f'{BASE}/presensi?sessionId=s3-closed', wait_until='domcontentloaded')
        expect(page.get_by_text('Status sesi: Ditutup', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Presensi sekarang', exact=True)).to_be_disabled()
        page.goto(f'{BASE}/presensi?sessionId=s3-no-lab', wait_until='domcontentloaded')
        expect(page.get_by_text('Laboratorium sesi belum diatur. Hubungi asisten.', exact=True)).to_be_visible()
        expect(page.get_by_role('button', name='Presensi sekarang', exact=True)).to_be_disabled()
        page.goto(f'{BASE}/presensi?sessionId=not-enrolled', wait_until='domcontentloaded')
        expect(page.get_by_text('Sesi tidak tersedia untuk akunmu', exact=True)).to_be_visible()
        # Actual push APIs are native-only, and the web page says so explicitly.
        page.goto(f'{BASE}/profil', wait_until='domcontentloaded')
        expect(page.get_by_text('Push Expo tidak didukung di browser.', exact=False)).to_be_visible()
        expect(page.get_by_role('button', name='Aktifkan notifikasi', exact=True)).to_be_disabled()
        page.get_by_role('button', name='Aktifkan notifikasi', exact=True).scroll_into_view_if_needed()
        page.screenshot(path=str(OUTPUT / 'sprint3-notification-web-state.png'))
        fixture('verify')
        assert not errors, errors
        print('SPRINT3_UI_OK: detail routing, auto-selected session, GPS radius, camera permission, attendance and history persistence, duplicate guard, closed/missing lab/outsider, notifications web state, responsive widths')
    except Exception:
        page.screenshot(path=str(OUTPUT / 'sprint3-test-failure.png'))
        print('UI_FAILURE_DOM:', page.locator('body').inner_text()[-5000:].encode('ascii', errors='backslashreplace').decode('ascii'))
        print('UI_FAILURE_ERRORS:', errors)
        raise
    finally:
        context.close()
        browser.close()
