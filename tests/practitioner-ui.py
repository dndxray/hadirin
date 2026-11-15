"""Run against Expo web + freshly seeded Firebase emulators (see docs/sprint-2-caesar.md)."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe", headless=True
    )
    page = browser.new_page(viewport={"width": 390, "height": 844})
    page.set_default_timeout(60000)
    expect.set_options(timeout=30000)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto("http://127.0.0.1:8097", wait_until="domcontentloaded", timeout=120000)
    page.get_by_placeholder("nama@email.com").fill("caesar@example.test")
    page.get_by_placeholder("Kata sandi", exact=True).fill("test-pass-123")
    page.get_by_text("Masuk", exact=True).click()
    button = page.get_by_role("button", name="Isi presensi sekarang", exact=True)
    expect(button).to_be_enabled()
    button.click()
    page.get_by_text("Catat kehadiran", exact=True).click()
    page.get_by_text("Presensi berhasil dicatat", exact=True).wait_for()
    page.get_by_text("Lihat riwayat", exact=True).click()
    expect(page.get_by_text("Hadir", exact=True)).to_be_visible()
    page.get_by_text("Izin", exact=True).click()
    page.get_by_role("button", name="Kirim pengajuan izin", exact=True).click()
    expect(page.get_by_text("Pilih sesi terlebih dahulu.", exact=True)).to_be_visible()
    page.get_by_role("button", name="Basis Data", exact=False).click()
    page.get_by_label("Alasan ketidakhadiran").fill("Saya sedang sakit dan perlu istirahat sesuai anjuran dokter.")
    page.get_by_role("button", name="Kirim pengajuan izin", exact=True).click()
    page.get_by_text("Izin berhasil diajukan", exact=True).wait_for()
    page.get_by_text("Lihat status izin", exact=True).click()
    expect(page.get_by_text("Menunggu", exact=True)).to_be_visible()
    expect(page.get_by_text("Klasifikasi AI menunggu pemrosesan. Izin sudah tersimpan.", exact=True)).to_be_visible()
    output = Path(".impeccable/review")
    output.mkdir(parents=True, exist_ok=True)
    page.screenshot(path=str(output / "phone.png"), full_page=True)
    page.set_viewport_size({"width": 1280, "height": 900})
    page.screenshot(path=str(output / "desktop.png"), full_page=True)
    page.reload(wait_until="domcontentloaded")
    expect(page.get_by_text("Menunggu", exact=True)).to_be_visible()
    assert not errors, errors
    print("UI_FLOW_OK: login, attendance, permission validation/submission, history, persistence")
    browser.close()
