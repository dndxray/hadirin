"""Run against Expo web + freshly seeded demo emulators (see docs/sprint-2-caesar.md)."""
from pathlib import Path
import os
import subprocess

from playwright.sync_api import sync_playwright, expect

BASE = "http://127.0.0.1:8097"
OUTPUT = Path(".impeccable/review")
OUTPUT.mkdir(parents=True, exist_ok=True)


def fixture(operation):
    subprocess.run(["node", "tests/seed-practitioner.mjs", operation], check=True, timeout=60)


with sync_playwright() as playwright:
    options = {"headless": True}
    chrome = os.environ.get("CHROME_PATH", r"C:\Program Files\Google\Chrome\Application\chrome.exe")
    if Path(chrome).exists():
        options["executable_path"] = chrome
    browser = playwright.chromium.launch(**options)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.set_default_timeout(60000)
    expect.set_options(timeout=30000)
    def text(label):
        return page.get_by_text(label, exact=True).and_(page.locator(":visible"))

    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    try:
        page.goto(BASE, wait_until="networkidle", timeout=120000)
        page.get_by_placeholder("nama@email.com").fill("caesar@example.test")
        page.get_by_placeholder("Kata sandi", exact=True).fill("test-pass-123")
        page.get_by_text("Masuk", exact=True).click()
        expect(page.get_by_role("button", name="Lihat sesi React Native, kelas TI-3A")).to_be_visible()
        expect(page.get_by_text("Izin", exact=True)).to_have_count(0)
        expect(page.get_by_text("Kelas tanpa sesi", exact=True)).to_have_count(0)
        page.screenshot(path=str(OUTPUT / "session-home-phone.png"), full_page=True)

        # Attendance uses the selected session ID and the real Firestore transaction.
        page.get_by_role("button", name="Lihat sesi React Native, kelas TI-3A").click()
        expect(page).to_have_url(f"{BASE}/detail-sesi?id=checkin")
        expect(page.get_by_role("button", name="Isi presensi", exact=True)).to_be_enabled()
        expect(page.get_by_role("button", name="Ajukan izin", exact=True)).to_be_enabled()
        page.screenshot(path=str(OUTPUT / "session-detail-phone.png"), full_page=True)
        page.get_by_role("button", name="Isi presensi", exact=True).click()
        expect(page.get_by_text("Konfirmasi Presensi", exact=True)).to_be_visible()
        page.get_by_role("button", name="Ya, Presensi Sekarang", exact=True).click()
        expect(page.get_by_text("Presensi Berhasil", exact=True)).to_be_visible()
        page.get_by_role("button", name="Lihat Riwayat", exact=True).click()
        expect(page.get_by_text("Hadir", exact=True)).to_be_visible()
        expect(text("React Native")).to_be_visible()

        # Persisted attendance suppresses both actions, including after a reload.
        page.goto(f"{BASE}/detail-sesi?id=checkin", wait_until="domcontentloaded")
        expect(page.get_by_text("Presensi sudah tercatat", exact=True)).to_be_visible()
        expect(page.get_by_role("button", name="Isi presensi", exact=True)).to_have_count(0)
        expect(page.get_by_role("button", name="Ajukan izin", exact=True)).to_have_count(0)

        # Izin is inside the upcoming session, not a global form/session picker.
        page.get_by_role("button", name="Kembali", exact=True).click()
        page.get_by_role("button", name="Lihat sesi Basis Data, kelas TI-3A").click()
        expect(page.get_by_role("button", name="Isi presensi", exact=True)).to_be_disabled()
        page.get_by_role("button", name="Ajukan izin", exact=True).click()
        reason = page.get_by_label("Alasan ketidakhadiran", exact=True)
        expect(reason).to_be_visible()
        page.get_by_role("button", name="Kirim pengajuan izin", exact=True).click()
        expect(text("Jelaskan alasan izin minimal 10 karakter.")).to_be_visible()
        reason.fill("Saya sedang sakit dan perlu istirahat sesuai anjuran dokter.")
        reason.scroll_into_view_if_needed()
        page.screenshot(path=str(OUTPUT / "session-permission-phone.png"), full_page=True)
        page.get_by_role("button", name="Kirim pengajuan izin", exact=True).click()
        expect(page.get_by_text("Izin berhasil diajukan", exact=True)).to_be_visible()
        expect(page.get_by_role("button", name="Ajukan izin", exact=True)).to_have_count(0)
        page.get_by_role("button", name="Lihat status izin", exact=True).click()
        expect(page.get_by_text("Menunggu", exact=True)).to_be_visible()
        expect(text("Basis Data")).to_be_visible()
        expect(page.get_by_text("Klasifikasi AI menunggu pemrosesan. Izin sudah tersimpan.", exact=True)).to_be_visible()

        # A remote assistant decision and AI failure arrive without reloading.
        fixture("approve-permission")
        expect(text("Diterima")).to_be_visible()
        expect(page.get_by_text("Klasifikasi AI gagal. Izin tetap tersimpan dan dapat diperiksa asisten.", exact=True)).to_be_visible()
        page.reload(wait_until="domcontentloaded")
        expect(text("Diterima")).to_be_visible()
        page.screenshot(path=str(OUTPUT / "session-history-phone.png"), full_page=True)
        page.set_viewport_size({"width": 1280, "height": 900})
        page.screenshot(path=str(OUTPUT / "session-history-desktop.png"), full_page=True)

        # Legacy links preserve their session target; closed/deleted sessions are safe.
        page.goto(f"{BASE}/izin?id=permission", wait_until="domcontentloaded")
        expect(page.get_by_text("Izin diterima", exact=True)).to_be_visible()
        expect(page.get_by_label("Alasan ketidakhadiran", exact=True)).to_have_count(0)
        page.goto(f"{BASE}/detail-sesi?id=closed", wait_until="domcontentloaded")
        expect(page.get_by_role("button", name="Isi presensi", exact=True)).to_be_disabled()
        expect(page.get_by_role("button", name="Ajukan izin", exact=True)).to_be_disabled()
        page.goto(f"{BASE}/detail-sesi?id=missing", wait_until="domcontentloaded")
        expect(page.get_by_text("Sesi tidak ditemukan", exact=True)).to_be_visible()
        page.get_by_role("button", name="Kembali ke Home", exact=True).click()

        # The session closing while composing a reason removes the form in real time.
        page.get_by_role("button", name="Lihat sesi Algoritma, kelas TI-3A").click()
        page.get_by_role("button", name="Ajukan izin", exact=True).click()
        page.get_by_label("Alasan ketidakhadiran", exact=True).fill("Saya tidak dapat hadir karena sakit.")
        fixture("close-changing")
        expect(page.get_by_text("Sesi telah ditutup", exact=True)).to_be_visible()
        expect(page.get_by_label("Alasan ketidakhadiran", exact=True)).to_have_count(0)
        expect(page.get_by_role("button", name="Isi presensi", exact=True)).to_be_disabled()
        expect(page.get_by_role("button", name="Ajukan izin", exact=True)).to_be_disabled()
        page.screenshot(path=str(OUTPUT / "session-closed-desktop.png"), full_page=True)
        page.set_viewport_size({"width": 320, "height": 740})
        page.screenshot(path=str(OUTPUT / "session-closed-small-phone.png"), full_page=True)
        assert not errors, errors
        print("UI_FLOW_OK: session selection, real attendance, duplicate prevention, inline permission, validation, realtime decision/AI failure, reload, closed/missing sessions")
    finally:
        if errors:
            print("PAGE_ERRORS:", errors)
        page.screenshot(path=str(OUTPUT / "last-session-test.png"), full_page=True)
        browser.close()
