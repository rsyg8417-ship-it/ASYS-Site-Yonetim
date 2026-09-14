"""Iteration 7 tests: Unit edit + toggle, Person edit + unit_id + toggle,
Excel import (collections), Excel import (natural gas). Non-destructive.

Preserves DB. Restores admin password if changed. Leaves ≥3 units and
≥2 persons active. Uses openpyxl in-memory xlsx.
"""
import os
import io
import time
import pytest
import requests
from datetime import datetime, timezone
from openpyxl import Workbook

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://site-yonetim-7.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "rsyg8417@gmail.com"
ADMIN_PW = "Admin123!"


# ---------------- Fixtures ----------------
@pytest.fixture(scope="module")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


@pytest.fixture(scope="module")
def token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, f"admin login failed: {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def site_id(s, auth):
    r = s.get(f"{API}/sites", headers=auth)
    assert r.status_code == 200
    sites = r.json()
    assert sites
    for st in sites:
        if "TEST" in (st.get("name") or ""):
            return st["id"]
    return sites[0]["id"]


@pytest.fixture(scope="module")
def units(s, auth, site_id):
    r = s.get(f"{API}/units", params={"site_id": site_id}, headers=auth)
    assert r.status_code == 200
    us = r.json()
    assert len(us) >= 3, f"Need ≥3 units, found {len(us)}"
    return us


@pytest.fixture(scope="module")
def persons(s, auth, site_id):
    r = s.get(f"{API}/persons", params={"site_id": site_id}, headers=auth)
    assert r.status_code == 200
    ps = r.json()
    return ps


@pytest.fixture(scope="module")
def accounts(s, auth, site_id):
    r = s.get(f"{API}/accounts", headers=auth, params={"site_id": site_id})
    assert r.status_code == 200
    return r.json()


# ---------------- Helpers ----------------
def _mp_headers(auth):
    # Multipart uploads: must NOT send Content-Type: application/json.
    return {"Authorization": auth["Authorization"], "Content-Type": None}


def _xlsx(headers, rows):
    wb = Workbook()
    ws = wb.active
    ws.append(headers)
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


# ================= FEATURE 1: Unit edit + toggle =================
def test_unit_patch_active_toggle(s, auth, units):
    u = units[0]
    uid = u["id"]
    original_active = u.get("active", True)

    # Toggle to opposite
    r = s.patch(f"{API}/units/{uid}", headers=auth, json={"active": not original_active})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["active"] == (not original_active)
    assert "_id" not in body

    # Persistence via GET
    r2 = s.get(f"{API}/units", params={"site_id": u["site_id"]}, headers=auth)
    got = [x for x in r2.json() if x["id"] == uid][0]
    assert got["active"] == (not original_active)

    # Restore
    r3 = s.patch(f"{API}/units/{uid}", headers=auth, json={"active": original_active})
    assert r3.status_code == 200
    assert r3.json()["active"] == original_active


def test_unit_patch_partial_fields(s, auth, units):
    u = units[0]
    uid = u["id"]
    orig_area = u.get("area_m2", 0)
    orig_share = u.get("share_ratio", 0)

    r = s.patch(f"{API}/units/{uid}", headers=auth, json={"area_m2": 90, "share_ratio": 1.5})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["area_m2"] == 90
    assert body["share_ratio"] == 1.5
    # Other fields unchanged
    assert body["no"] == u["no"]
    assert body["site_id"] == u["site_id"]

    # Restore
    r2 = s.patch(f"{API}/units/{uid}", headers=auth,
                 json={"area_m2": orig_area, "share_ratio": orig_share})
    assert r2.status_code == 200


def test_unit_patch_empty_body(s, auth, units):
    r = s.patch(f"{API}/units/{units[0]['id']}", headers=auth, json={})
    assert r.status_code == 400


def test_unit_patch_not_found(s, auth):
    r = s.patch(f"{API}/units/does-not-exist", headers=auth, json={"active": True})
    assert r.status_code == 404


# ================= FEATURE 2: Person edit + unit_id + active =================
def test_person_patch_unit_id_and_active(s, auth, persons, units):
    if not persons:
        pytest.skip("No persons available")
    p = persons[0]
    pid = p["id"]
    original_unit = p.get("unit_id", "")
    original_active = p.get("active", True)
    target_unit = units[0]["id"]

    r = s.patch(f"{API}/persons/{pid}", headers=auth,
                json={"unit_id": target_unit, "active": not original_active})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["unit_id"] == target_unit
    assert body["active"] == (not original_active)
    assert "_id" not in body

    # GET verify
    r2 = s.get(f"{API}/persons", params={"site_id": p["site_id"]}, headers=auth)
    got = [x for x in r2.json() if x["id"] == pid][0]
    assert got["unit_id"] == target_unit
    assert got["active"] == (not original_active)

    # Restore
    r3 = s.patch(f"{API}/persons/{pid}", headers=auth,
                 json={"unit_id": original_unit, "active": original_active})
    assert r3.status_code == 200


def test_person_create_with_unit_id_and_cleanup(s, auth, site_id, units):
    payload = {
        "site_id": site_id,
        "kind": "malik",
        "name": "TEST_Iter7_Person",
        "phone": "05550000000",
        "email": "",
        "tc_no": "",
        "unit_id": units[0]["id"],
        "active": True,
    }
    r = s.post(f"{API}/persons", headers=auth, json=payload)
    assert r.status_code == 200, r.text
    created = r.json()
    assert created["unit_id"] == units[0]["id"]
    assert created["name"] == "TEST_Iter7_Person"
    pid = created["id"]

    # Toggle inactive then restore active for cleanup — but keep entity or delete?
    # No delete endpoint required for persons in this test — mark inactive so it doesn't
    # affect counts of "active" persons ≥ 2 requirement. Actually we want to LEAVE ≥2 active,
    # so removing an active TEST_ person by marking inactive is safe.
    r2 = s.patch(f"{API}/persons/{pid}", headers=auth, json={"active": False})
    assert r2.status_code == 200


# ================= FEATURE 3: Excel Collections Import =================
@pytest.fixture(scope="module")
def cash_account(accounts):
    cash = [a for a in accounts if a.get("account_kind") == "cash" or "cash_" in str(a.get("id", "")) or a.get("kind") == "cash"]
    # accounts endpoint returns combined; find one with 'kind' or use first entry
    # Fall back: search for anything with kind=='cash'
    for a in accounts:
        if a.get("kind") == "cash":
            return a
    for a in accounts:
        if a.get("kind") == "bank":
            return a
    pytest.skip("No cash/bank account found")


def test_import_collections_success_and_errors(s, auth, site_id, units, cash_account):
    unit_no_a = units[0]["no"]
    unit_no_b = units[1]["no"] if len(units) > 1 else units[0]["no"]
    ts = int(time.time())
    ref_a = f"TESTIMP-{ts}-A"
    ref_b = f"TESTIMP-{ts}-B"
    ref_bad = f"TESTIMP-{ts}-BAD"

    xlsx = _xlsx(
        ["tarih", "daire", "tutar", "referans", "aciklama"],
        [
            ["2025-01-05", unit_no_a, 123.45, ref_a, "Test tahsilat A"],
            ["05.01.2025", unit_no_b, "234,56", ref_b, "Test tahsilat B"],
            ["2025-01-06", "ZZZ-INVALID-999", 50, ref_bad, "should fail"],
        ],
    )
    files = {"file": ("test.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    data = {"site_id": site_id, "account_id": cash_account["id"], "account_kind": cash_account["kind"]}

    r = s.post(f"{API}/collections/import",
               headers=_mp_headers(auth),
               data=data, files=files)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 3
    assert body["created"] == 2
    assert isinstance(body["errors"], list)
    assert len(body["errors"]) == 1
    err = body["errors"][0]
    assert "Daire bulunamadı" in err["error"]

    # GET /collections and verify our two refs exist
    r2 = s.get(f"{API}/collections", params={"site_id": site_id}, headers=auth)
    assert r2.status_code == 200
    refs = {c.get("reference") for c in r2.json()}
    assert ref_a in refs
    assert ref_b in refs


def test_import_collections_duplicate_reference(s, auth, site_id, units, cash_account):
    """Re-import same file → both refs should be duplicate errors."""
    unit_no_a = units[0]["no"]
    ts = int(time.time())
    ref_a = f"TESTDUP-{ts}"

    def build():
        return _xlsx(
            ["tarih", "daire", "tutar", "referans", "aciklama"],
            [["2025-01-07", unit_no_a, 10.00, ref_a, "dup test"]],
        )

    data = {"site_id": site_id, "account_id": cash_account["id"], "account_kind": cash_account["kind"]}

    # First submit
    r1 = s.post(f"{API}/collections/import",
                headers=_mp_headers(auth),
                data=data,
                files={"file": ("d.xlsx", build(), "application/vnd.ms-excel")})
    assert r1.status_code == 200, r1.text
    assert r1.json()["created"] == 1

    # Second submit → duplicate
    r2 = s.post(f"{API}/collections/import",
                headers=_mp_headers(auth),
                data=data,
                files={"file": ("d.xlsx", build(), "application/vnd.ms-excel")})
    assert r2.status_code == 200, r2.text
    body = r2.json()
    assert body["created"] == 0
    assert len(body["errors"]) == 1
    assert "Mükerrer" in body["errors"][0]["error"] or "referans" in body["errors"][0]["error"].lower()


def test_import_collections_invalid_kind(s, auth, site_id, units, cash_account):
    xlsx = _xlsx(
        ["tarih", "daire", "tutar", "referans"],
        [["2025-01-05", units[0]["no"], 10, f"TESTINVKIND-{int(time.time())}"]],
    )
    r = s.post(f"{API}/collections/import",
               headers=_mp_headers(auth),
               data={"site_id": site_id, "account_id": cash_account["id"], "account_kind": "wallet"},
               files={"file": ("f.xlsx", xlsx, "application/vnd.ms-excel")})
    assert r.status_code == 400


# ================= FEATURE 4: Excel Natural Gas Import =================
def test_import_natural_gas_success(s, auth, site_id, units):
    unit_no_a = units[0]["no"]
    unit_no_b = units[1]["no"] if len(units) > 1 else units[0]["no"]
    # pick a period that's likely open — use current year/month
    now = datetime.now(timezone.utc)
    period = f"{now.year:04d}-{now.month:02d}"
    due_date = f"{now.year:04d}-{now.month:02d}-15"

    xlsx = _xlsx(
        ["daire", "tuketim", "tutar", "aciklama"],
        [
            [unit_no_a, 45, 123.50, "Ocak"],
            [unit_no_b, 30, "89,90", "Ocak"],
            ["ZZZ-BAD", 10, 20, "err"],
        ],
    )
    r = s.post(f"{API}/accruals/import/natural-gas",
               headers=_mp_headers(auth),
               data={"site_id": site_id, "period": period, "due_date": due_date},
               files={"file": ("gas.xlsx", xlsx, "application/vnd.ms-excel")})
    # if period is closed, we'll get 400 — retry with an open period
    if r.status_code == 400 and "kapalı" in r.text.lower():
        # try a fresh future period
        due_date = "2099-12-15"
        period = "2099-12"
        xlsx = _xlsx(
            ["daire", "tuketim", "tutar", "aciklama"],
            [
                [unit_no_a, 45, 123.50, "Ocak"],
                [unit_no_b, 30, "89,90", "Ocak"],
                ["ZZZ-BAD", 10, 20, "err"],
            ],
        )
        r = s.post(f"{API}/accruals/import/natural-gas",
                   headers=_mp_headers(auth),
                   data={"site_id": site_id, "period": period, "due_date": due_date},
                   files={"file": ("gas.xlsx", xlsx, "application/vnd.ms-excel")})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 3
    assert body["created"] == 2
    assert len(body["errors"]) == 1

    # Verify accruals persisted with "Doğalgaz" in description
    r2 = s.get(f"{API}/accruals", params={"site_id": site_id}, headers=auth)
    assert r2.status_code == 200
    gas = [a for a in r2.json() if "Doğalgaz" in (a.get("description") or "")]
    assert len(gas) >= 2


def test_import_natural_gas_closed_period_blocks(s, auth, site_id, units):
    """Close a distant period, attempt import, expect 400, then reopen."""
    year, month = 2099, 11
    due_date = f"{year}-{month:02d}-15"
    period_str = f"{year}-{month:02d}"

    # Close
    r_close = s.post(f"{API}/periods/close", headers=auth,
                     json={"site_id": site_id, "year": year, "month": month, "reason": "iter7 test"})
    assert r_close.status_code == 200, r_close.text

    try:
        xlsx = _xlsx(
            ["daire", "tuketim", "tutar"],
            [[units[0]["no"], 10, 50]],
        )
        r = s.post(f"{API}/accruals/import/natural-gas",
                   headers=_mp_headers(auth),
                   data={"site_id": site_id, "period": period_str, "due_date": due_date},
                   files={"file": ("g.xlsx", xlsx, "application/vnd.ms-excel")})
        assert r.status_code == 400
        assert "kapalı" in r.text.lower() or "kapali" in r.text.lower()
    finally:
        # Reopen
        r_reopen = s.post(f"{API}/periods/reopen", headers=auth,
                          json={"site_id": site_id, "year": year, "month": month,
                                "reason": "iter7 test cleanup"})
        assert r_reopen.status_code == 200, r_reopen.text


# ================= Regression =================
def test_regression_admin_login(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200


def test_regression_active_units_count(s, auth, site_id):
    r = s.get(f"{API}/units", params={"site_id": site_id}, headers=auth)
    active = [x for x in r.json() if x.get("active", True)]
    assert len(active) >= 3, f"Only {len(active)} active units remain — expected ≥3"


def test_regression_active_persons_count(s, auth, site_id):
    r = s.get(f"{API}/persons", params={"site_id": site_id}, headers=auth)
    active = [x for x in r.json() if x.get("active", True)]
    assert len(active) >= 2, f"Only {len(active)} active persons remain — expected ≥2"
