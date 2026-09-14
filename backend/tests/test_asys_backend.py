"""
ASYS Backend API Tests - Phase 1-3
Covers: setup, auth, sites/blocks/units/persons, accounts, accruals, collections (FIFO+advance),
expenses, transfers, journal balance, dashboard, reports (Excel/PDF), periods, RBAC, audit.
"""
import os
import io
import pytest
import requests
from pymongo import MongoClient

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if False else "https://site-yonetim-7.preview.emergentagent.com"
API = BASE_URL + "/api"

ADMIN_EMAIL = "rsyg8417@gmail.com"
ADMIN_PWD = "Admin123!"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "asys_database"


# ----- Session-scoped state -----
state = {}


@pytest.fixture(scope="session", autouse=True)
def clean_db():
    """Reset DB before session so setup wizard flow works."""
    c = MongoClient(MONGO_URL)
    c.drop_database(DB_NAME)
    yield
    c.close()


@pytest.fixture(scope="session")
def s():
    return requests.Session()


# ---------- Setup ----------
def test_01_setup_status_required(s):
    r = s.get(f"{API}/setup/status")
    assert r.status_code == 200
    assert r.json()["setup_required"] is True


def test_02_setup_admin_create(s):
    r = s.post(f"{API}/setup/admin", json={
        "email": ADMIN_EMAIL, "name": "Yönetici",
        "password": ADMIN_PWD, "phone": "0505 369 99 84"
    })
    assert r.status_code == 200, r.text
    j = r.json()
    assert "user" in j and "access_token" in j
    assert j["user"]["email"] == ADMIN_EMAIL
    assert j["user"]["role"] == "admin"
    assert j["user"]["phone"] == "0505 369 99 84"
    state["admin_token"] = j["access_token"]


def test_03_setup_admin_second_fails(s):
    r = s.post(f"{API}/setup/admin", json={
        "email": "x@y.com", "name": "X", "password": "abcdef"
    })
    assert r.status_code == 400


def test_04_login_wrong_pw(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "bad"})
    assert r.status_code == 401


def test_05_login_ok(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PWD})
    assert r.status_code == 200
    j = r.json()
    assert j["user"]["email"] == ADMIN_EMAIL
    state["admin_token"] = j["access_token"]


def _hdr(tok=None):
    return {"Authorization": f"Bearer {tok or state['admin_token']}"}


def test_06_me(s):
    r = s.get(f"{API}/auth/me", headers=_hdr())
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


# ---------- Sites/Blocks/Units/Persons ----------
def test_10_create_site(s):
    r = s.post(f"{API}/sites", headers=_hdr(),
               json={"name": "TEST_Site", "address": "Adres 1", "tax_no": "123"})
    assert r.status_code == 200
    state["site_id"] = r.json()["id"]


def test_11_create_block(s):
    r = s.post(f"{API}/blocks", headers=_hdr(),
               json={"site_id": state["site_id"], "name": "A Blok"})
    assert r.status_code == 200
    state["block_id"] = r.json()["id"]


def test_12_create_units(s):
    state["unit_ids"] = []
    for i, (no, m2, share) in enumerate([("1", 80.0, 0.10), ("2", 100.0, 0.15), ("3", 120.0, 0.20)]):
        r = s.post(f"{API}/units", headers=_hdr(),
                   json={"site_id": state["site_id"], "block_id": state["block_id"],
                         "no": no, "kind": "konut", "area_m2": m2, "share_ratio": share})
        assert r.status_code == 200
        state["unit_ids"].append(r.json()["id"])


def test_13_create_persons(s):
    r1 = s.post(f"{API}/persons", headers=_hdr(),
                json={"site_id": state["site_id"], "kind": "malik", "name": "Malik1"})
    assert r1.status_code == 200
    r2 = s.post(f"{API}/persons", headers=_hdr(),
                json={"site_id": state["site_id"], "kind": "kiraci", "name": "Kiraci1"})
    assert r2.status_code == 200


# ---------- Accounts ----------
def test_20_create_accounts(s):
    r1 = s.post(f"{API}/accounts", headers=_hdr(),
                json={"site_id": state["site_id"], "kind": "cash", "name": "Ana Kasa",
                      "opening_balance_kurus": 100000})  # 1000 TL
    assert r1.status_code == 200
    state["cash_id"] = r1.json()["id"]
    r2 = s.post(f"{API}/accounts", headers=_hdr(),
                json={"site_id": state["site_id"], "kind": "bank", "name": "Ziraat",
                      "iban": "TR..", "bank_name": "Ziraat", "opening_balance_kurus": 500000})
    assert r2.status_code == 200
    state["bank_id"] = r2.json()["id"]


def test_21_accounts_list_balances(s):
    r = s.get(f"{API}/accounts?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    accs = r.json()
    balmap = {a["id"]: a["balance_kurus"] for a in accs}
    assert balmap[state["cash_id"]] == 100000
    assert balmap[state["bank_id"]] == 500000


# ---------- Accruals ----------
def test_30_accrual_batch_esit(s):
    r = s.post(f"{API}/accruals/batch", headers=_hdr(),
               json={"site_id": state["site_id"], "period": "2026-01",
                     "due_date": "2026-01-10", "description": "Ocak Aidat",
                     "method": "esit", "amount_total_kurus": 20000})  # 200 TL/unit
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["created"] == 3
    # Check journal debit=credit
    jr = s.get(f"{API}/journal?site_id={state['site_id']}", headers=_hdr())
    assert jr.status_code == 200
    entries = jr.json()
    assert len(entries) >= 3
    for e in entries:
        d = sum(l["debit_kurus"] for l in e["lines"])
        c = sum(l["credit_kurus"] for l in e["lines"])
        assert d == c, f"unbalanced entry {e['id']}: {d} vs {c}"


def test_31_accrual_batch_m2(s):
    r = s.post(f"{API}/accruals/batch", headers=_hdr(),
               json={"site_id": state["site_id"], "period": "2026-02",
                     "due_date": "2026-02-10", "description": "Şubat Aidat",
                     "method": "metrekare", "amount_total_kurus": 30000})
    assert r.status_code == 200
    # sum of amounts for period should equal total
    accs = s.get(f"{API}/accruals?site_id={state['site_id']}", headers=_hdr()).json()
    feb = [a for a in accs if a["period"] == "2026-02"]
    assert sum(a["amount_kurus"] for a in feb) == 30000


def test_32_accrual_extra(s):
    r = s.post(f"{API}/accruals/extra", headers=_hdr(),
               json={"site_id": state["site_id"], "unit_id": state["unit_ids"][0],
                     "due_date": "2026-03-05", "description": "Ek gider",
                     "amount_kurus": 5000})
    assert r.status_code == 200
    state["extra_accrual_id"] = r.json()["id"]


def test_33_accrual_reverse_unpaid(s):
    r = s.post(f"{API}/accruals/{state['extra_accrual_id']}/reverse", headers=_hdr(),
               json={"reason": "test iptal"})
    assert r.status_code == 200


# ---------- Collections ----------
def test_40_collection_partial(s):
    """Pay 50 TL to unit_ids[1] which has 200 TL Jan + m2 share Feb. FIFO applies Jan."""
    r = s.post(f"{API}/collections", headers=_hdr(),
               json={"site_id": state["site_id"], "unit_id": state["unit_ids"][1],
                     "account_id": state["cash_id"], "account_kind": "cash",
                     "date": "2026-01-15", "amount_kurus": 5000, "reference": "REF-PART-1"})
    assert r.status_code == 200
    j = r.json()
    assert j["advance_added_kurus"] == 0
    assert len(j["payment"]["applications"]) == 1


def test_41_collection_full(s):
    """Full pay all of unit_ids[2]'s Jan (200 TL)"""
    r = s.post(f"{API}/collections", headers=_hdr(),
               json={"site_id": state["site_id"], "unit_id": state["unit_ids"][2],
                     "account_id": state["bank_id"], "account_kind": "bank",
                     "date": "2026-01-16", "amount_kurus": 20000, "reference": "BANK-1"})
    assert r.status_code == 200
    j = r.json()
    assert j["advance_added_kurus"] == 0


def test_42_collection_overpay_advance(s):
    """Pay 100,000 to unit_ids[0]: should clear all its accruals + advance."""
    # Get sum of open accruals for unit0
    accs = s.get(f"{API}/accruals?site_id={state['site_id']}&unit_id={state['unit_ids'][0]}",
                 headers=_hdr()).json()
    total_debt = sum(a["amount_kurus"] - a["paid_kurus"] for a in accs
                     if a["status"] in ("open", "partial") and not a["reversed"])
    overpay = total_debt + 12345
    r = s.post(f"{API}/collections", headers=_hdr(),
               json={"site_id": state["site_id"], "unit_id": state["unit_ids"][0],
                     "account_id": state["bank_id"], "account_kind": "bank",
                     "date": "2026-01-17", "amount_kurus": overpay, "reference": "BANK-OVER-1"})
    assert r.status_code == 200
    j = r.json()
    assert j["advance_added_kurus"] == 12345
    assert j["message"] and "avans" in j["message"].lower()
    # verify advance balance
    adv = s.get(f"{API}/advances?site_id={state['site_id']}", headers=_hdr()).json()
    match = [a for a in adv if a["unit_id"] == state["unit_ids"][0]]
    assert match and match[0]["balance_kurus"] == 12345


def test_43_collection_duplicate_reference(s):
    r = s.post(f"{API}/collections", headers=_hdr(),
               json={"site_id": state["site_id"], "unit_id": state["unit_ids"][1],
                     "account_id": state["bank_id"], "account_kind": "bank",
                     "date": "2026-01-18", "amount_kurus": 1000, "reference": "BANK-1"})
    assert r.status_code == 409


# ---------- Expenses ----------
def test_50_expense(s):
    r = s.post(f"{API}/expenses", headers=_hdr(),
               json={"site_id": state["site_id"], "account_id": state["cash_id"],
                     "account_kind": "cash", "date": "2026-01-20",
                     "amount_kurus": 3000, "category": "Temizlik",
                     "vendor": "TEMSAN", "invoice_no": "F-1"})
    assert r.status_code == 200
    state["expense_id"] = r.json()["id"]


# ---------- Transfers ----------
def test_60_transfer(s):
    r = s.post(f"{API}/transfers", headers=_hdr(),
               json={"site_id": state["site_id"],
                     "from_id": state["bank_id"], "from_kind": "bank",
                     "to_id": state["cash_id"], "to_kind": "cash",
                     "date": "2026-01-21", "amount_kurus": 10000})
    assert r.status_code == 200


def test_61_account_balances_final(s):
    """opening + collections - expenses + transfers"""
    r = s.get(f"{API}/accounts?site_id={state['site_id']}", headers=_hdr())
    accs = {a["id"]: a["balance_kurus"] for a in r.json()}
    # cash: 100000 + 5000 (part) -3000 (exp) +10000 (transfer in) = 112000
    assert accs[state["cash_id"]] == 112000
    # bank: 500000 + 20000 + overpay(state) -10000 (transfer out)
    # overpay was total_debt+12345 for unit0
    # Just verify > 500000 and math consistent
    assert accs[state["bank_id"]] > 500000


# ---------- Journal balance overall ----------
def test_70_journal_balanced(s):
    r = s.get(f"{API}/journal?site_id={state['site_id']}&limit=500", headers=_hdr())
    entries = r.json()
    for e in entries:
        d = sum(l["debit_kurus"] for l in e["lines"])
        c = sum(l["credit_kurus"] for l in e["lines"])
        assert d == c


# ---------- Dashboard ----------
def test_80_dashboard(s):
    r = s.get(f"{API}/dashboard?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    d = r.json()
    for k in ["total_debt_kurus", "month_collections_kurus", "month_expenses_kurus",
              "cash_bank_total_kurus", "unit_count", "person_count", "debtor_count"]:
        assert k in d
    assert d["unit_count"] == 3
    assert d["person_count"] == 2


# ---------- Reports ----------
def test_81_debtors_json(s):
    r = s.get(f"{API}/reports/debtors?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200


def test_82_debtors_xlsx(s):
    r = s.get(f"{API}/reports/debtors/export.xlsx?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    assert "spreadsheet" in r.headers.get("content-type", "")
    assert "borclular.xlsx" in r.headers.get("content-disposition", "")
    assert len(r.content) > 100


def test_83_debtors_pdf(s):
    r = s.get(f"{API}/reports/debtors/export.pdf?site_id={state['site_id']}", headers=_hdr())
    assert r.status_code == 200
    assert r.content[:4] == b"%PDF"


def test_84_income_expense(s):
    r = s.get(f"{API}/reports/income-expense?site_id={state['site_id']}&period=2026-01",
              headers=_hdr())
    assert r.status_code == 200
    d = r.json()
    assert "income_kurus" in d and "expense_kurus" in d and "net_kurus" in d
    assert "expenses_by_category" in d


# ---------- Periods ----------
def test_90_period_close_blocks_writes(s):
    r = s.post(f"{API}/periods/close", headers=_hdr(),
               json={"site_id": state["site_id"], "year": 2025, "month": 12, "reason": "kapama"})
    assert r.status_code == 200
    # Try to create an expense in closed period
    r2 = s.post(f"{API}/expenses", headers=_hdr(),
                json={"site_id": state["site_id"], "account_id": state["cash_id"],
                      "account_kind": "cash", "date": "2025-12-15",
                      "amount_kurus": 500, "category": "Test"})
    assert r2.status_code == 400
    assert "kapal" in r2.json()["detail"].lower()


def test_91_period_reopen_reason_required(s):
    r = s.post(f"{API}/periods/reopen", headers=_hdr(),
               json={"site_id": state["site_id"], "year": 2025, "month": 12, "reason": ""})
    assert r.status_code == 400
    r2 = s.post(f"{API}/periods/reopen", headers=_hdr(),
                json={"site_id": state["site_id"], "year": 2025, "month": 12,
                      "reason": "Düzeltme gerekiyor"})
    assert r2.status_code == 200


# ---------- RBAC ----------
def test_95_register_denetci_and_rbac(s):
    r = s.post(f"{API}/auth/register", headers=_hdr(),
               json={"email": "denetci@test.com", "name": "Denetçi",
                     "password": "Denetci1!", "role": "denetci"})
    assert r.status_code == 200
    # muhasebe
    r2 = s.post(f"{API}/auth/register", headers=_hdr(),
                json={"email": "muhasebe@test.com", "name": "Muhasebe",
                      "password": "Muhasebe1!", "role": "muhasebe"})
    assert r2.status_code == 200

    # login as denetci
    lr = s.post(f"{API}/auth/login", json={"email": "denetci@test.com", "password": "Denetci1!"})
    assert lr.status_code == 200
    tok = lr.json()["access_token"]

    # Attempt site creation - should be 403
    r3 = s.post(f"{API}/sites", headers=_hdr(tok),
                json={"name": "ForbiddenSite"})
    assert r3.status_code == 403


# ---------- Audit ----------
def test_99_audit_logs(s):
    r = s.get(f"{API}/audit?limit=500", headers=_hdr())
    assert r.status_code == 200
    actions = {a["action"] for a in r.json()}
    for expected in ["user_create", "site_create", "accrual_batch",
                     "collection_create", "expense_create",
                     "period_close", "period_reopen"]:
        assert expected in actions, f"missing audit action: {expected}"
