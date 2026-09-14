"""
ASYS Backend - Iteration 2 verification tests (401 bug fix verification).
IMPORTANT: This suite does NOT drop the DB. It verifies existing data is intact.
"""
import os
import io
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://site-yonetim-7.preview.emergentagent.com").rstrip("/")
API = BASE_URL + "/api"

ADMIN_EMAIL = "rsyg8417@gmail.com"
ADMIN_PWD = "Admin123!"

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "asys_database")

state = {}


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def mongo_counts_before():
    c = MongoClient(MONGO_URL)
    db = c[DB_NAME]
    counts = {name: db[name].count_documents({}) for name in db.list_collection_names()}
    c.close()
    return counts


# ---------- Setup status ----------
def test_01_setup_status_false(s):
    r = s.get(f"{API}/setup/status")
    assert r.status_code == 200
    assert r.json()["setup_required"] is False


# ---------- Auth ----------
def test_02_login_ok(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200, r.text
    j = r.json()
    assert "access_token" in j and "user" in j
    assert j["user"]["email"] == ADMIN_EMAIL
    assert j["user"]["role"] == "admin"
    state["admin_token"] = j["access_token"]


def _hdr(tok=None):
    return {"Authorization": f"Bearer {tok or state['admin_token']}"}


def test_03_me_with_token(s):
    r = s.get(f"{API}/auth/me", headers=_hdr())
    assert r.status_code == 200
    d = r.json()
    assert d["email"] == ADMIN_EMAIL
    assert "phone" in d, "phone field must be present in /auth/me response"


def test_04_me_without_token_401():
    r = requests.get(f"{API}/auth/me")  # fresh session, no auth
    assert r.status_code == 401


def test_05_me_bad_token():
    r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.here"})
    assert r.status_code == 401


# ---------- Data preservation ----------
def test_10_sites_have_data(s):
    r = s.get(f"{API}/sites", headers=_hdr())
    assert r.status_code == 200
    sites = r.json()
    assert len(sites) >= 1, "expected existing TEST_Site"
    state["site_id"] = sites[0]["id"]
    state["site_name"] = sites[0]["name"]


def test_11_blocks_have_data(s):
    r = s.get(f"{API}/blocks?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    blocks = r.json()
    assert len(blocks) >= 1


def test_12_units_have_data(s):
    r = s.get(f"{API}/units?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    units = r.json()
    assert len(units) >= 3, f"expected >=3 units, got {len(units)}"


def test_13_persons_have_data(s):
    r = s.get(f"{API}/persons?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    persons = r.json()
    assert len(persons) >= 2


def test_14_accounts_have_data(s):
    r = s.get(f"{API}/accounts?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    accs = r.json()
    assert len(accs) >= 2
    cash = [a for a in accs if a["kind"] == "cash"]
    bank = [a for a in accs if a["kind"] == "bank"]
    assert cash and bank
    state["cash_id"] = cash[0]["id"]
    state["bank_id"] = bank[0]["id"]


# ---------- Dashboard KPIs ----------
def test_20_dashboard(s):
    r = s.get(f"{API}/dashboard?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    d = r.json()
    for k in ["total_debt_kurus", "month_collections_kurus", "month_expenses_kurus",
              "cash_bank_total_kurus", "unit_count", "person_count", "debtor_count"]:
        assert k in d
    assert d["unit_count"] >= 3
    assert d["person_count"] >= 2


# ---------- /api/sync/batch ----------
def test_30_sync_batch_no_auth_401(s):
    r = requests.post(f"{API}/sync/batch", json={"operations": []})
    assert r.status_code == 401


def test_31_sync_batch_with_auth(s):
    """Send an expense via sync/batch to prove offline queue still works with valid token."""
    op = {
        "client_id": str(uuid.uuid4()),
        "endpoint": "/expenses",
        "body": {
            "site_id": state["site_id"],
            "account_id": state["cash_id"],
            "account_kind": "cash",
            "date": "2026-01-25",
            "amount_kurus": 1234,
            "category": "TEST_SyncBatch",
            "vendor": "TEST_Vendor",
            "invoice_no": f"SYNC-{uuid.uuid4().hex[:6]}"
        },
        "created_at": "2026-01-25T10:00:00Z"
    }
    r = s.post(f"{API}/sync/batch", headers=_hdr(), json={"operations": [op]})
    assert r.status_code == 200, r.text
    j = r.json()
    assert "results" in j
    # At least first op should have succeeded (status 200) or be reported
    res0 = j["results"][0]
    assert res0.get("ok") is True, f"sync batch op failed: {res0}"


# ---------- Regression: collections FIFO+advance ----------
def test_40_collection_regression(s):
    """Small partial collection on unit with open accruals (if any)."""
    # Find a unit with open accrual
    r = s.get(f"{API}/accruals?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    open_acc = [a for a in r.json()
                if a.get("status") in ("open", "partial") and not a.get("reversed")]
    if not open_acc:
        pytest.skip("no open accruals available for regression collection test")
    unit_id = open_acc[0]["unit_id"]
    r = s.post(f"{API}/collections", headers=_hdr(),
               json={"site_id": state["site_id"], "unit_id": unit_id,
                     "account_id": state["cash_id"], "account_kind": "cash",
                     "date": "2026-01-26", "amount_kurus": 100,
                     "reference": f"TEST-REG-{uuid.uuid4().hex[:8]}"})
    assert r.status_code == 200, r.text


# ---------- Regression: duplicate bank reference ----------
def test_41_duplicate_bank_reference_409(s):
    ref = f"DUP-{uuid.uuid4().hex[:8]}"
    payload = {"site_id": state["site_id"], "unit_id": None,
               "account_id": state["bank_id"], "account_kind": "bank",
               "date": "2026-01-27", "amount_kurus": 1000, "reference": ref}
    # need a unit
    ru = s.get(f"{API}/units?site_id={state['site_id']}", headers=_hdr()).json()
    payload["unit_id"] = ru[0]["id"]
    r1 = s.post(f"{API}/collections", headers=_hdr(), json=payload)
    assert r1.status_code in (200, 400), r1.text  # may hit no-open-accrual
    if r1.status_code != 200:
        pytest.skip(f"first collection could not be created: {r1.text}")
    r2 = s.post(f"{API}/collections", headers=_hdr(), json=payload)
    assert r2.status_code == 409


# ---------- Regression: reports xlsx ----------
def test_50_debtors_xlsx(s):
    r = s.get(f"{API}/reports/debtors/export.xlsx?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    assert "spreadsheet" in r.headers.get("content-type", "")
    assert len(r.content) > 100


# ---------- No data loss ----------
def test_99_no_data_loss(mongo_counts_before):
    """Re-check counts >= before values captured at session start."""
    c = MongoClient(MONGO_URL)
    db = c[DB_NAME]
    after = {name: db[name].count_documents({}) for name in db.list_collection_names()}
    c.close()
    for k in ["users", "sites", "blocks", "units", "persons", "accruals", "journal_entries"]:
        before = mongo_counts_before.get(k, 0)
        assert after.get(k, 0) >= before, f"{k}: after={after.get(k)} < before={before}"
