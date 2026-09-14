"""Iteration 6 tests: change-password, forgot/reset-password, refresh, dashboard/activity."""
import os
import time
import base64
import json
import pytest
import requests
from datetime import datetime, timezone, timedelta

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://site-yonetim-7.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "rsyg8417@gmail.com"
ADMIN_PW = "Admin123!"

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "asys_database"


@pytest.fixture(scope="module")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def auth(token):
    return {"Authorization": f"Bearer {token}"}


def _decode_exp(tok):
    payload = tok.split(".")[1]
    payload += "=" * (-len(payload) % 4)
    return json.loads(base64.urlsafe_b64decode(payload))["exp"]


# ---------- FEATURE 3: refresh ----------
def test_refresh_no_token(s):
    r = s.post(f"{API}/auth/refresh")
    assert r.status_code == 401


def test_refresh_with_token(s, token):
    old_exp = _decode_exp(token)
    time.sleep(1.2)
    r = s.post(f"{API}/auth/refresh", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and "user" in data and "expires_in" in data
    assert data["user"]["email"] == ADMIN_EMAIL
    new_exp = _decode_exp(data["access_token"])
    assert new_exp >= old_exp


# ---------- FEATURE 1: change password ----------
def test_change_password_wrong_current(s, auth):
    r = s.post(f"{API}/auth/change-password", headers=auth,
               json={"current_password": "WrongPW!", "new_password": "Admin123!"})
    assert r.status_code == 400
    assert "hatalı" in r.json().get("detail", "").lower()


def test_change_password_flow_and_restore(s, auth):
    new_pw = "TempPW_iter6!"
    # change to new
    r = s.post(f"{API}/auth/change-password", headers=auth,
               json={"current_password": ADMIN_PW, "new_password": new_pw})
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    # login with new
    r2 = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": new_pw})
    assert r2.status_code == 200
    tok2 = r2.json()["access_token"]

    # RESTORE
    r3 = requests.post(f"{API}/auth/change-password",
                       headers={"Authorization": f"Bearer {tok2}", "Content-Type": "application/json"},
                       json={"current_password": new_pw, "new_password": ADMIN_PW})
    assert r3.status_code == 200, f"RESTORE FAILED: {r3.text}"

    # verify restored
    r4 = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r4.status_code == 200, "Admin password not restored!"


# ---------- FEATURE 2: forgot/reset password ----------
async def _find_reset_token(email):
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    user = await db.users.find_one({"email": email})
    assert user is not None
    # latest reset for user
    recs = await db.password_resets.find({"user_id": user["id"]}).sort("created_at", -1).to_list(5)
    client.close()
    return user, recs


def test_forgot_password_creates_record_and_returns_ok(s):
    r = s.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    user, recs = asyncio.get_event_loop().run_until_complete(_find_reset_token(ADMIN_EMAIL))
    assert len(recs) >= 1
    latest = recs[0]
    assert latest["user_id"] == user["id"]
    exp = datetime.fromisoformat(latest["expires_at"])
    delta = exp - datetime.now(timezone.utc)
    # expires ~1h from now
    assert 3000 < delta.total_seconds() < 3900, f"expires_at not ~1h future: {delta.total_seconds()}"


def test_forgot_password_unknown_email_still_200(s):
    r = s.post(f"{API}/auth/forgot-password", json={"email": "TEST_nonexistent@example.com"})
    assert r.status_code == 200
    assert r.json().get("ok") is True


def test_reset_password_flow_invalid_and_valid(s):
    # invalid token
    r = s.post(f"{API}/auth/reset-password", json={"token": "invalid_bogus_token", "new_password": "Admin123!"})
    assert r.status_code == 400

    # trigger fresh reset
    r0 = s.post(f"{API}/auth/forgot-password", json={"email": ADMIN_EMAIL})
    assert r0.status_code == 200
    _, recs = asyncio.get_event_loop().run_until_complete(_find_reset_token(ADMIN_EMAIL))
    token_str = recs[0]["token"]

    # reset with valid token to same password (keep admin working)
    r1 = s.post(f"{API}/auth/reset-password", json={"token": token_str, "new_password": ADMIN_PW})
    assert r1.status_code == 200, r1.text
    assert r1.json().get("ok") is True

    # verify admin can still login
    r2 = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r2.status_code == 200

    # token cannot be reused
    r3 = s.post(f"{API}/auth/reset-password", json={"token": token_str, "new_password": ADMIN_PW})
    assert r3.status_code == 400


# ---------- FEATURE 4: dashboard/activity ----------
@pytest.fixture(scope="module")
def site_id(s, auth):
    r = s.get(f"{API}/sites", headers=auth)
    assert r.status_code == 200
    sites = r.json()
    assert len(sites) >= 1
    # pick TEST_Site if exists
    for st in sites:
        if "TEST" in (st.get("name") or ""):
            return st["id"]
    return sites[0]["id"]


def test_dashboard_activity_shape(s, auth, site_id):
    r = s.get(f"{API}/dashboard/activity", params={"site_id": site_id, "days": 7}, headers=auth)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 7
    for row in data:
        assert set(row.keys()) >= {"date", "collections_kurus", "expenses_kurus"}
        assert isinstance(row["collections_kurus"], int)
        assert isinstance(row["expenses_kurus"], int)
    # dates ascending, last is today
    today = datetime.now(timezone.utc).date().isoformat()
    assert data[-1]["date"] == today


def test_dashboard_activity_requires_auth(site_id):
    r = requests.get(f"{API}/dashboard/activity", params={"site_id": site_id, "days": 7})
    assert r.status_code == 401


# ---------- Regression ----------
def test_regression_login_and_me(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PW})
    assert r.status_code == 200
    tok = r.json()["access_token"]
    r2 = s.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {tok}"})
    assert r2.status_code == 200
    assert r2.json()["email"] == ADMIN_EMAIL


def test_regression_data_intact(s, auth, site_id):
    r = s.get(f"{API}/units", params={"site_id": site_id}, headers=auth)
    assert r.status_code == 200
    assert len(r.json()) >= 3
    r2 = s.get(f"{API}/persons", params={"site_id": site_id}, headers=auth)
    assert r2.status_code == 200
    assert len(r2.json()) >= 2
