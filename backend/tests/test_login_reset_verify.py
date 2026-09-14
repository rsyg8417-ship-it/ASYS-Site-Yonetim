"""Iteration 5: Verify admin password reset to Admin123! and no data loss."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://site-yonetim-7.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "rsyg8417@gmail.com"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "access_token" in data
    return data["access_token"]


def test_login_success_returns_user():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "access_token" in data and data["access_token"]
    user = data.get("user") or {}
    assert user.get("email") == ADMIN_EMAIL
    assert user.get("role") == "admin"
    assert user.get("active") is True
    assert user.get("name") == "Yönetici"
    assert user.get("phone") == "0505 369 99 84"
    assert "id" in user


def test_login_wrong_password_returns_401():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": "WrongPass!123"}, timeout=15)
    assert r.status_code == 401
    detail = r.json().get("detail", "")
    assert "E-posta veya parola hatalı" in detail


def test_auth_me(token):
    r = requests.get(f"{BASE_URL}/api/auth/me",
                     headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200
    u = r.json()
    assert u["email"] == ADMIN_EMAIL
    assert u["role"] == "admin"


def test_sites_has_test_site(token):
    r = requests.get(f"{BASE_URL}/api/sites",
                     headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200
    sites = r.json()
    assert isinstance(sites, list)
    names = [s.get("name") for s in sites]
    assert any("TEST_Site" in (n or "") for n in names), f"TEST_Site not found in {names}"


def test_dashboard_kpis(token):
    h = {"Authorization": f"Bearer {token}"}
    sites = requests.get(f"{BASE_URL}/api/sites", headers=h, timeout=15).json()
    site = next((s for s in sites if "TEST_Site" in (s.get("name") or "")), sites[0])
    site_id = site["id"]
    r = requests.get(f"{BASE_URL}/api/dashboard?site_id={site_id}", headers=h, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, dict)
    print("Dashboard keys:", list(data.keys()))


def test_data_persistence_units_persons(token):
    h = {"Authorization": f"Bearer {token}"}
    sites = requests.get(f"{BASE_URL}/api/sites", headers=h, timeout=15).json()
    site = next((s for s in sites if "TEST_Site" in (s.get("name") or "")), None)
    assert site is not None
    site_id = site["id"]
    units = requests.get(f"{BASE_URL}/api/units?site_id={site_id}", headers=h, timeout=15).json()
    persons = requests.get(f"{BASE_URL}/api/persons?site_id={site_id}", headers=h, timeout=15).json()
    print(f"Units: {len(units)}, Persons: {len(persons)}")
    assert len(units) >= 3, f"Expected >=3 units, got {len(units)}"
    assert len(persons) >= 2, f"Expected >=2 persons, got {len(persons)}"
